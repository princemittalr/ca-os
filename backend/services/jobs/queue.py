from abc import ABC, abstractmethod
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
import traceback
import time
from typing import Callable, Any, Dict, Optional
import uuid

from services.db.manager import create_job, update_job

class AbstractJobQueue(ABC):
    """
    Abstract Provider-Agnostic Interface for Background Asynchronous Processing.
    Enables swapping native FastAPI threads/BackgroundTasks for Celery+Redis seamlessly.
    """
    @abstractmethod
    def enqueue(self, job_type: str, task_func: Callable[..., Any], *args: Any, **kwargs: Any) -> Dict[str, Any]:
        pass

class ThreadPoolJobQueue(AbstractJobQueue):
    """
    Highly robust, multi-threaded in-memory job queue executing concurrent tasks.
    Enforces automatic progress tracing, exponential retries, and statutory DB logs.
    """
    def __init__(self, max_workers: int = 4):
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        
    def enqueue(self, job_type: str, task_func: Callable[..., Any], *args: Any, **kwargs: Any) -> Dict[str, Any]:
        # 1. Create task entry in database
        job_record = create_job(job_type=job_type, status="PENDING")
        job_id = job_record["job_id"]
        
        # 2. Submit execution to concurrent pool
        self.executor.submit(self._run_job_wrapper, job_id, job_type, task_func, *args, **kwargs)
        
        return job_record

    def _run_job_wrapper(self, job_id: str, job_type: str, task_func: Callable[..., Any], *args: Any, **kwargs: Any):
        max_retries = 3
        retry_delay = 1.5  # base backoff delay in seconds
        
        for attempt in range(max_retries + 1):
            try:
                # Update status to RUNNING
                update_job(job_id, {
                    "status": "RUNNING",
                    "progress": 10.0 + (attempt * 15.0),
                    "retry_count": attempt
                })
                
                # Execute task callable
                task_func(job_id, *args, **kwargs)
                
                # Complete job successfully
                update_job(job_id, {
                    "status": "COMPLETED",
                    "progress": 100.0,
                    "completed_at": datetime.now(),
                    "error_logs": None
                })
                print(f"[JOB MANAGER] Job {job_id} ({job_type}) completed successfully.")
                break
                
            except Exception as e:
                err_msg = f"{type(e).__name__}: {str(e)}\nTraceback:\n{traceback.format_exc()}"
                print(f"[JOB MANAGER] Job {job_id} ({job_type}) failed on attempt {attempt}: {e}")
                
                if attempt < max_retries:
                    # Retry with exponential delay backoff
                    sleep_time = retry_delay * (2 ** attempt)
                    update_job(job_id, {
                        "status": "RUNNING",
                        "progress": min(95.0, 10.0 + (attempt * 25.0)),
                        "error_logs": f"Failed attempt {attempt}. Retrying in {sleep_time}s...\nError: {str(e)}"
                    })
                    time.sleep(sleep_time)
                else:
                    # Final attempt failure
                    update_job(job_id, {
                        "status": "FAILED",
                        "progress": 100.0,
                        "completed_at": datetime.now(),
                        "error_logs": err_msg
                    })

# Reusable Global Singleton instance
job_queue = ThreadPoolJobQueue()
