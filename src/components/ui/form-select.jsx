import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const FormSelectCompact = ({
  name,
  label,
  value,
  onChange,
  options,
  placeholder = "All",
  disabled = false,
  className,
  labelClassName,
  labelKey = "name",
  valueKey = "_id",
  includeAll = true,
  contentClassName,
  required = false,
  error,
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
        <Label className={cn("text-xs text-muted-foreground block mb-2", labelClassName)}>
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
      )}
      <Select
        value={value || (includeAll ? "all" : "")}
        onValueChange={handleChange}
        disabled={disabled}
      >
        <SelectTrigger className={cn("h-9 w-full", error && "border-destructive")}>
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
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
};

export default FormSelectCompact;
