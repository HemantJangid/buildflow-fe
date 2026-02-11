import { cn } from '@/lib/utils';

const sizeClasses = {
  sm: 'h-6 w-6 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-2',
};

export const LoadingSpinner = ({ size = 'lg', className }) => {
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-primary border-t-transparent',
        sizeClasses[size],
        className
      )}
    />
  );
};

export const PageLoadingSpinner = ({ size = 'lg' }) => {
  return (
    <div className="flex items-center justify-center h-64">
      <LoadingSpinner size={size} />
    </div>
  );
};

export default LoadingSpinner;
