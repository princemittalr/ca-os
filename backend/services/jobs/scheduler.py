import threading
import time
from services.jobs.queue import job_queue
from services.jobs.tasks import (
    compliance_reminders_task,
    overdue_escalation_task,
    action_center_refresh_task
)

class BackgroundScheduler:
    """
    Periodic Background Cron Thread Simulator for CA-OS.
    Orchestrates daily scans, updates copilot alert logs, and refreshes database KPIs.
    """
    def __init__(self, interval_seconds: int = 60):
        import uuid
        self.interval = interval_seconds
        self.stop_event = threading.Event()
        self.thread = None
        self.worker_id = f"worker-{str(uuid.uuid4())}"

    def start(self):
        if self.thread is not None:
            return
        
        self.stop_event.clear()
        self.thread = threading.Thread(target=self._run_loop, daemon=True)
        self.thread.start()
        print("[SCHEDULER] Periodic Background Cron Thread Scheduler started.")

    def stop(self):
        if self.thread is None:
            return
        self.stop_event.set()
        self.thread.join(timeout=2)
        self.thread = None
        print("[SCHEDULER] Periodic Background Cron Thread Scheduler stopped.")

    def _acquire_scheduler_lock(self) -> bool:
        """Use Supabase as distributed lock to prevent multi-worker scheduling."""
        try:
            from config.supabase import supabase_client
            from datetime import datetime, timedelta, timezone
            if not supabase_client:
                return False
                
            lock_key = "scheduler_lock"
            now_dt = datetime.now(timezone.utc)
            now = now_dt.isoformat()
            expires_at = (now_dt + timedelta(seconds=90)).isoformat()
            
            # 1. Try insert first (succeeds if lock row doesn't exist)
            try:
                res = supabase_client.table("scheduler_locks").insert({
                    "lock_key": lock_key,
                    "worker_id": self.worker_id,
                    "locked_at": now,
                    "expires_at": expires_at
                }).execute()
                if res.data:
                    return True
            except Exception:
                pass
                
            # 2. Try refreshing if we already own the lock
            try:
                res = supabase_client.table("scheduler_locks")\
                    .update({
                        "locked_at": now,
                        "expires_at": expires_at
                    })\
                    .eq("lock_key", lock_key)\
                    .eq("worker_id", self.worker_id)\
                    .execute()
                if res.data:
                    return True
            except Exception:
                pass
                
            # 3. Try taking over lock if it has expired
            try:
                res = supabase_client.table("scheduler_locks")\
                    .update({
                        "worker_id": self.worker_id,
                        "locked_at": now,
                        "expires_at": expires_at
                    })\
                    .eq("lock_key", lock_key)\
                    .lt("expires_at", now)\
                    .execute()
                return bool(res.data)
            except Exception:
                pass
                
            return False
        except Exception as e:
            print(f"[SCHEDULER] Lock acquisition error: {e}")
            return False

    def _run_loop(self):
        # Allow backend server to boot completely
        time.sleep(5)
        
        while not self.stop_event.is_set():
            try:
                if self._acquire_scheduler_lock():
                    print("[SCHEDULER] Acquired lock. Triggering scheduled compliance & automation periodic sweeps...")
                    # Enqueue periodic background jobs to concurrent queue
                    job_queue.enqueue("action_center_refresh", action_center_refresh_task)
                    job_queue.enqueue("compliance_reminders", compliance_reminders_task)
                    job_queue.enqueue("overdue_escalation", overdue_escalation_task)
                else:
                    print("[SCHEDULER] Lock active or held by another worker. Skipping scheduling for this interval.")
                
            except Exception as e:
                print(f"[SCHEDULER] Error in scheduler cron loop: {e}")
                
            # Sleep in small chunks to react instantly to server shutdown events
            for _ in range(self.interval):
                if self.stop_event.is_set():
                    break
                time.sleep(1)

# Reusable Global Singleton instance
cron_scheduler = BackgroundScheduler(interval_seconds=60)
