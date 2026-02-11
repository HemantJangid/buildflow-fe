import FormActions from '@/components/FormActions';
import { cn } from '@/lib/utils';

/**
 * FilterCard - Reusable filter form container
 */
const FilterCard = ({
  children,
  onSubmit,
  onReset,
  loading = false,
  submitLabel = 'Apply',
  resetLabel = 'Reset',
  className,
}) => {
  return (
    <div className={cn('rounded-lg border border-border bg-card p-3', className)}>
      <form onSubmit={onSubmit} className="space-y-3">
        {children}
        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          <FormActions
            onCancel={onReset}
            cancelLabel={resetLabel}
            submitLabel={loading ? `${submitLabel}…` : submitLabel}
            loading={loading}
            size="sm"
          />
        </div>
      </form>
    </div>
  );
};

export default FilterCard;
