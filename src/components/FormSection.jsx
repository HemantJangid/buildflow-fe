import { cn } from '@/lib/utils';

/**
 * FormSection - A section with optional title and border
 */
const FormSection = ({
  title,
  children,
  className,
  showBorder = false,
}) => {
  return (
    <div className={cn(showBorder && 'border-t border-border pt-4', className)}>
      {title && (
        <h3 className="font-medium text-foreground mb-4">{title}</h3>
      )}
      {children}
    </div>
  );
};

export default FormSection;
