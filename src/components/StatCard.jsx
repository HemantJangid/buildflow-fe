import { cn } from '@/lib/utils';

const variants = {
  default: {
    border: 'border-border',
    bg: 'bg-card',
    text: 'text-foreground',
  },
  success: {
    border: 'border-green-500/30',
    bg: 'bg-green-500/5',
    text: 'text-green-600 dark:text-green-400',
  },
  warning: {
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/5',
    text: 'text-amber-600 dark:text-amber-400',
  },
  danger: {
    border: 'border-destructive/30',
    bg: 'bg-destructive/5',
    text: 'text-destructive',
  },
};

const StatCard = ({ label, value, variant = 'default', className }) => {
  const styles = variants[variant] || variants.default;

  return (
    <div className={cn('rounded-lg border p-3', styles.border, styles.bg, className)}>
      <p className="text-xs text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <p className={cn('text-xl font-bold tabular-nums mt-0.5', styles.text)}>
        {value}
      </p>
    </div>
  );
};

export default StatCard;
