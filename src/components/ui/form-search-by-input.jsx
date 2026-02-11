import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * FormSearchByInput - Single label with a grouped control: Select (left) + Input (right)
 * Renders as one visual unit (shared border). Uses the same base Input and Select components.
 */
export const FormSearchByInput = ({
  label,
  selectValue,
  onSelectValueChange,
  selectOptions = [],
  selectPlaceholder = "Select...",
  selectLabelKey = "name",
  selectValueKey = "_id",
  inputName = "search",
  inputValue = "",
  onInputChange,
  inputPlaceholder = "",
  inputSuffixIcon,
  onInputSuffixClick,
  required = false,
  disabled = false,
  error,
  className,
  labelClassName,
  selectWidth = "w-[6.5rem]",
}) => {
  return (
    <div className={cn("space-y-2", className)}>
      {label != null && label !== "" && (
        <Label className={cn(labelClassName)}>
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
      )}
      <div
        className={cn(
          "flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow]",
          "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px] focus-within:outline-none",
          error && "border-destructive",
          disabled && "opacity-50"
        )}
      >
        <Select
          value={selectValue || ""}
          onValueChange={onSelectValueChange}
          disabled={disabled}
        >
          <SelectTrigger
            className={cn(
              "h-9 shrink-0 rounded-r-none border-0 border-r border-border bg-transparent shadow-none focus:ring-0 focus:ring-offset-0",
              selectWidth
            )}
          >
            <SelectValue placeholder={selectPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {selectOptions.map((option) => (
              <SelectItem
                key={option[selectValueKey]}
                value={option[selectValueKey]}
              >
                {option[selectLabelKey]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="min-w-0 flex-1">
          <Input
            name={inputName}
            type="text"
            value={inputValue}
            onChange={onInputChange}
            placeholder={inputPlaceholder}
            disabled={disabled}
            suffixIcon={inputSuffixIcon}
            onSuffixClick={onInputSuffixClick}
            className={cn(
              "h-9 min-h-9 rounded-l-none border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            )}
          />
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};

export default FormSearchByInput;
