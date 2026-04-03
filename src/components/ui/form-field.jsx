import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";

/**
 * FormField - Label + Input grouped together
 */
export const FormField = ({
  id,
  name,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  error,
  className,
  inputClassName,
  labelClassName,
  suffixIcon,
  onSuffixClick,
  ...inputProps
}) => {
  const inputId = id || name;

  return (
    <div className={cn("space-y-2", className)}>
      {label != null && label !== "" && (
        <Label htmlFor={inputId} className={cn(labelClassName)}>
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
      )}
      <Input
        id={inputId}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        suffixIcon={suffixIcon}
        onSuffixClick={onSuffixClick}
        className={cn(error && "border-destructive", inputClassName)}
        {...inputProps}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};

/**
 * FormFieldCompact - Label above input with minimal spacing (for filters)
 */
export const FormFieldCompact = ({
  id,
  name,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  disabled = false,
  className,
  ...inputProps
}) => {
  const inputId = id || name;

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor={inputId} className="text-xs text-muted-foreground">
          {label}
        </Label>
      )}
      <Input
        id={inputId}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="h-9"
        {...inputProps}
      />
    </div>
  );
};

/**
 * DateRangeFields - From/To date pickers side by side (using Shadcn DatePicker)
 */
export const DateRangeFields = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  startLabel = "From",
  endLabel = "To",
  className,
  disabled = false,
}) => {
  return (
    <div className={cn("flex gap-3", className)}>
      <div className="space-y-1.5 flex-1 min-w-[140px]">
        <Label className="text-xs text-muted-foreground">{startLabel}</Label>
        <DatePicker
          value={startDate}
          onChange={onStartDateChange}
          placeholder="Start date"
          disabled={disabled}
        />
      </div>
      <div className="space-y-1.5 flex-1 min-w-[140px]">
        <Label className="text-xs text-muted-foreground">{endLabel}</Label>
        <DatePicker
          value={endDate}
          onChange={onEndDateChange}
          placeholder="End date"
          disabled={disabled}
        />
      </div>
    </div>
  );
};

export default FormField;
