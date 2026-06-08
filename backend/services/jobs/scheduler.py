import threading
import time
from config.settings import settings
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

    @property
    def is_running(self) -> bool:
        return self.thread is not None and self.thread.is_alive()

    def start(self):
        if self.thread is not None:
            return

        # Startup DB connectivity check
        try:
            from config.supabase import get_supabase_client, is_supabase_active
            if not is_supabase_active():
                print("[SCHEDULER] Supabase not active — scheduler disabled.")
                return
            client = get_supabase_client()
            # Verify scheduler_locks table exists
            client.table("scheduler_locks").select("lock_key").limit(1).execute()
            print("[SCHEDULER] DB connectivity check passed.")
        except Exception as e:
            print(f"[SCHEDULER] DB check failed — scheduler disabled: {e}")
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
            from config.supabase import get_supabase_client, is_supabase_active
            from datetime import datetime, timedelta, timezone
            if not is_supabase_active():
                return True  # single-worker fallback: run without lock

            client = get_supabase_client()
            lock_key = "scheduler_lock"
            now_dt = datetime.now(timezone.utc)
            now = now_dt.isoformat()
            # Extend expiry to 120s (2× interval) for safety margin
            expires_at = (now_dt + timedelta(seconds=120)).isoformat()

            # 1. Insert new lock
            try:
                res = client.table("scheduler_locks").insert({
                    "lock_key": lock_key,
                    "worker_id": self.worker_id,
                    "locked_at": now,
                    "expires_at": expires_at
                }).execute()
                if res.data:
                    return True
            except Exception as insert_err:
                print(f"[SCHEDULER] Lock insert failed (expected if row exists): {insert_err}")

            # 2. Refresh own lock
            try:
                res = client.table("scheduler_locks")\
                    .update({"locked_at": now, "expires_at": expires_at})\
                    .eq("lock_key", lock_key)\
                    .eq("worker_id", self.worker_id)\
                    .execute()
                if res.data:
                    return True
            except Exception as refresh_err:
                print(f"[SCHEDULER] Lock refresh failed: {refresh_err}")

            # 3. Steal expired lock
            try:
                res = client.table("scheduler_locks")\
                    .update({"worker_id": self.worker_id, "locked_at": now, "expires_at": expires_at})\
                    .eq("lock_key", lock_key)\
                    .lt("expires_at", now)\
                    .execute()
                if res.data:
                    print(f"[SCHEDULER] Claimed expired lock.")
                    return True
            except Exception as steal_err:
                print(f"[SCHEDULER] Lock steal failed: {steal_err}")

            # Log current holder for debugging
            try:
                cur = client.table("scheduler_locks")\
                    .select("worker_id, expires_at")\
                    .eq("lock_key", lock_key)\
                    .execute()
                if cur.data:
                    holder = cur.data[0]
                    if isinstance(holder, dict):
                        worker_id = holder.get("worker_id")
                        expires_at = holder.get("expires_at")
                        print(f"[SCHEDULER] Lock held by {worker_id} until {expires_at}")
            except Exception as holder_err:
                print(f"[SCHEDULER] Failed to get lock holder details: {holder_err}")

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

# Reusable Global Singleton instance — interval driven by settings.SCHEDULER_INTERVAL_SECONDS
cron_scheduler = BackgroundScheduler(interval_seconds=settings.SCHEDULER_INTERVAL_SECONDS)
