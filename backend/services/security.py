"""
security.py — Authentication & Security Utilities

NOTE: log_audit_event has been **removed** from this module.
      The canonical implementation lives in services/audit_logger.py.
      All callers must import from there directly:

          from services.audit_logger import log_audit_event, get_client_ip

      This module is intentionally kept as a namespace placeholder so that
      any legacy `import security` references produce a clear ImportError on
      the missing symbol rather than silently writing with the wrong schema.
"""
