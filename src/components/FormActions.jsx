import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * FormActions - Standard form footer with Cancel/Submit buttons
 */
const FormActions = ({
  onCancel,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  loading = false,
  loadingLabel = 'Saving...',
  disabled = false,
  className,
  size = 'default',
  showCancel = true,
}) => {
  return (
    <div className={cn('flex justify-end gap-3', className)}>
      {showCancel && (
        <Button type="button" variant="secondary" size={size} onClick={onCancel}>
          {cancelLabel}
        </Button>
      )}
      <Button type="submit" size={size} disabled={loading || disabled}>
        {loading ? loadingLabel : submitLabel}
      </Button>
    </div>
  );
};

export default FormActions;
