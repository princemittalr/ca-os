import os
from typing import Optional, Dict, Any
from services.db.manager import create_notification_log

def send_notification(
    channel: str,
    recipient: str,
    body: str,
    subject: Optional[str] = None
) -> Dict[str, Any]:
    """
    Provider-agnostic notification dispatch engine for CA-OS.
    Delivers automated warnings, intake logs, and due alerts to clients/vendors.
    Currently logs to stdout consoles (simulating Twilio/SendGrid integrations) 
    and persists history in the database.
    """
    # Enforce standard formatting
    channel = channel.upper()
    
    # Trace simulator triggers
    print(f"\n[NOTIFICATION SENDER] Sending via [{channel}] to: {recipient}")
    if subject:
        print(f"Subject: {subject}")
    print(f"Body: {body}\n")
    
    status = "SENT"
    
    # Persist log to Supabase or in-memory array
    log_record = create_notification_log(
        channel=channel,
        recipient=recipient,
        body=body,
        status=status,
        subject=subject
    )
    
    return log_record
