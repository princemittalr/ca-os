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
        self.interval = interval_seconds
        self.stop_event = threading.Event()
        self.thread = None

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

    def _run_loop(self):
        # Allow backend server to boot completely
        time.sleep(5)
        
        while not self.stop_event.is_set():
            try:
                print("[SCHEDULER] Triggering scheduled compliance & automation periodic sweeps...")
                # Enqueue periodic background jobs to concurrent queue
                job_queue.enqueue("action_center_refresh", action_center_refresh_task)
                job_queue.enqueue("compliance_reminders", compliance_reminders_task)
                job_queue.enqueue("overdue_escalation", overdue_escalation_task)
                
            except Exception as e:
                print(f"[SCHEDULER] Error in scheduler cron loop: {e}")
                
            # Sleep in small chunks to react instantly to server shutdown events
            for _ in range(self.interval):
                if self.stop_event.is_set():
                    break
                time.sleep(1)

# Reusable Global Singleton instance
cron_scheduler = BackgroundScheduler(interval_seconds=60)
