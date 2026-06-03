import React from 'react';

/**
 * Returns the higher severity level for comparing statuses:
 * 5 (Error/High/Critical) > 4 (Warning/Pending/Medium) > 3 (Info/Open/Drafted) > 2 (Success/Resolved/Active) > 1 (Purple/Action) > 0 (Neutral)
 */
export const getSeverityLevel = (status: string): number => {
  const s = status.trim().toUpperCase();
  if (['ERROR', 'HIGH', 'OVERDUE', 'MISSING', 'UNPROTECTED', 'CRITICAL', 'FAILED', 'DELETE', 'VALUE MISMATCH'].some(k => s.includes(k))) return 5;
  if (['WARNING', 'PENDING', 'IN-REVIEW', 'IN REVIEW', 'IDLE', 'MEDIUM', 'RUNNING...'].some(k => s.includes(k))) return 4;
  if (['INFO', 'OPEN', 'DRAFTED', 'LOW', 'CREATE'].some(k => s.includes(k))) return 3;
  if (['SUCCESS', 'RESOLVED', 'MATCHED', 'SYNCED', 'ACTIVE', 'RUNNING', 'COMPLETED', 'CLEAN', 'FILED', 'VERIFIED'].some(k => s.includes(k))) return 2;
  if (['PURPLE', 'RECONCILE', 'ACTION', 'AI'].some(k => s.includes(k))) return 1;
  return 0; // neutral
};

/**
 * Returns the CSS class for the unified badge system based on status text.
 */
export const getUnifiedBadgeClass = (status: string): string => {
  const s = status.trim().toUpperCase().replace(/ \.+$/, '...');
  
  if (['SUCCESS', 'RESOLVED', 'MATCHED', 'SYNCED', 'ACTIVE', 'RUNNING', 'COMPLETED', 'CLEAN', 'FILED', 'VERIFIED'].includes(s)) {
    return 'status-badge-success';
  }
  if (['WARNING', 'PENDING', 'IN-REVIEW', 'IN REVIEW', 'PENDING INVITE', 'IDLE', 'MEDIUM', 'RUNNING...'].includes(s)) {
    return 'status-badge-warning';
  }
  if (['ERROR', 'HIGH', 'OVERDUE', 'MISSING', 'UNPROTECTED', 'CRITICAL', 'FAILED', 'DELETE', 'VALUE MISMATCH', 'MISSING IN 2B'].includes(s)) {
    return 'status-badge-error';
  }
  if (['INFO', 'OPEN', 'DRAFTED', 'LOW', 'CREATE', 'MISSING BOOKS', 'GSTIN ERR'].includes(s)) {
    return 'status-badge-info';
  }
  if (['NEUTRAL', 'LOGIN', 'EXPORT', 'UPDATE'].includes(s)) {
    return 'status-badge-neutral';
  }
  if (['PURPLE', 'RECONCILE', 'ACTION', 'AI'].includes(s)) {
    return 'status-badge-purple';
  }

  // Fallback soft matches
  if (s.includes('SUCCESS') || s.includes('RESOLVED') || s.includes('MATCHED') || s.includes('ACTIVE') || s.includes('CLEAN') || s.includes('FILED')) {
    return 'status-badge-success';
  }
  if (s.includes('WARNING') || s.includes('PENDING') || s.includes('IDLE') || s.includes('MEDIUM') || s.includes('REVIEW')) {
    return 'status-badge-warning';
  }
  if (s.includes('ERROR') || s.includes('HIGH') || s.includes('OVERDUE') || s.includes('CRITICAL') || s.includes('FAILED') || s.includes('DELETE') || s.includes('MISMATCH') || s.includes('MISSING')) {
    return 'status-badge-error';
  }
  if (s.includes('INFO') || s.includes('OPEN') || s.includes('LOW') || s.includes('CREATE') || s.includes('DRAFT')) {
    return 'status-badge-info';
  }
  if (s.includes('LOGIN') || s.includes('EXPORT') || s.includes('UPDATE')) {
    return 'status-badge-neutral';
  }
  if (s.includes('RECONCILE') || s.includes('ACTION') || s.includes('AI') || s.includes('PURPLE')) {
    return 'status-badge-purple';
  }

  return 'status-badge-neutral';
};

/**
 * Returns the CSS class for compound badges based on the higher severity color.
 */
export const getCompoundBadgeClass = (statusA: string, statusB: string): string => {
  const valA = getSeverityLevel(statusA);
  const valB = getSeverityLevel(statusB);
  return getUnifiedBadgeClass(valA >= valB ? statusA : statusB);
};

/**
 * Renders the circular dot prefix (6px, border-radius 50%, matching text color).
 * Adds pulsing animation to the dot if status is running.
 */
export const renderBadgeDot = (status: string) => {
  const s = status.trim().toUpperCase();
  const isRunning = s.includes('RUNNING') || s.includes('IN PROGRESS') || s.includes('IN-PROGRESS');
  return (
    <span className={`w-1.5 h-1.5 rounded-full bg-current shrink-0 ${isRunning ? 'animate-badge-dot' : ''}`} />
  );
};
