import { cn } from '@/lib/utils';
import {
  ATTENDANCE_STATUS,
  CHANGE_REQUEST_STATUS,
  RECORD_STATUS,
} from '@/lib/constants';

const variants = {
  active: {
    true: 'bg-primary/10 text-primary',
    false: 'bg-muted text-muted-foreground',
  },
  status: {
    [RECORD_STATUS.CLOCKED_IN]: 'bg-primary/10 text-primary',
    [RECORD_STATUS.CLOCKED_OUT]: 'bg-muted text-muted-foreground',
    COMPLETED: 'bg-muted text-muted-foreground',
  },
  approval: {
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
    approved: 'bg-primary/10 text-primary',
    rejected: 'bg-destructive/10 text-destructive',
  },
  attendance: {
    [ATTENDANCE_STATUS.PRESENT]: 'bg-green-500/10 text-green-600 dark:text-green-400',
    [ATTENDANCE_STATUS.PARTIAL]: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    [ATTENDANCE_STATUS.ABSENT]: 'bg-destructive/10 text-destructive',
    [CHANGE_REQUEST_STATUS.PENDING]: 'bg-muted text-muted-foreground',
  },
};

const labels = {
  active: {
    true: 'Active',
    false: 'Inactive',
  },
  status: {
    [RECORD_STATUS.CLOCKED_IN]: 'Active',
    [RECORD_STATUS.CLOCKED_OUT]: 'Done',
    COMPLETED: 'Done',
  },
  approval: {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
  },
  attendance: {
    [ATTENDANCE_STATUS.PRESENT]: 'Present',
    [ATTENDANCE_STATUS.PARTIAL]: 'Partial',
    [ATTENDANCE_STATUS.ABSENT]: 'Absent',
    [CHANGE_REQUEST_STATUS.PENDING]: 'Pending',
  },
};

export const StatusBadge = ({ 
  variant = 'active', 
  value, 
  label,
  className 
}) => {
  const variantStyles = variants[variant];
  const variantLabels = labels[variant];
  
  // Handle boolean values for active variant
  const key = typeof value === 'boolean' ? value.toString() : value;
  const styleClass = variantStyles?.[key] || variantStyles?.false || 'bg-muted text-muted-foreground';
  const displayLabel = label || variantLabels?.[key] || key;

  return (
    <span
      className={cn(
        'inline-flex rounded-md px-2 py-0.5 text-xs font-medium',
        styleClass,
        className
      )}
    >
      {displayLabel}
    </span>
  );
};

export default StatusBadge;
