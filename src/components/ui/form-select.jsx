import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * FormSelect - Label + Select grouped together
 */
export const FormSelect = ({
  name,
  label,
  value,
  onValueChange,
  options,
  placeholder = "Select...",
  required = false,
  disabled = false,
  error,
  className,
  labelClassName,
  labelKey = "name",
  valueKey = "_id",
}) => {
  return (
    <div className={cn("space-y-1", className)}>
      {label != null && label !== "" && (
        <Label className={cn(labelClassName)}>
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
      )}
      <Select
        value={value || ""}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectTrigger className={cn("w-full h-9", error && "border-destructive")}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option[valueKey]} value={option[valueKey]}>
              {option[labelKey]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};

/**
 * FormSelectCompact - For filter bars with compact styling
 */
export const FormSelectCompact = ({
  name,
  label,
  value,
  onChange,
  options,
  placeholder = "All",
  disabled = false,
  className,
  labelKey = "name",
  valueKey = "_id",
  includeAll = true,
  contentClassName,
}) => {
  const handleChange = (v) => {
    onChange({
      target: {
        name,
        value: v === "all" ? "" : v,
      },
    });
  };

  return (
    <div className={className}>
      {label && (
        <Label className="text-xs text-muted-foreground mb-1.5 block">
          {label}
        </Label>
      )}
      <Select
        value={value || (includeAll ? "all" : "")}
        onValueChange={handleChange}
        disabled={disabled}
      >
        <SelectTrigger className="h-9 w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className={contentClassName}>
          {includeAll && <SelectItem value="all">{placeholder}</SelectItem>}
          {options.map((option) => (
            <SelectItem key={option[valueKey]} value={option[valueKey]}>
              {option[labelKey]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default FormSelect;
