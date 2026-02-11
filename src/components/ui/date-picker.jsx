import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 12 }, (_, i) => currentYear - 5 + i);

/**
 * DatePicker - Single date picker with calendar popover
 */
const DatePicker = ({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled = false,
  className,
}) => {
  const [open, setOpen] = React.useState(false);

  // Convert string date (yyyy-MM-dd) to Date object
  const dateValue = React.useMemo(() => {
    if (!value) return undefined;
    try {
      const parsed = parse(value, "yyyy-MM-dd", new Date());
      return isValid(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }, [value]);

  // Format the display value
  const displayValue = React.useMemo(() => {
    if (!dateValue || !isValid(dateValue)) return null;
    return format(dateValue, "MMM d, yyyy");
  }, [dateValue]);

  const handleSelect = (date) => {
    if (date) {
      onChange(format(date, "yyyy-MM-dd"));
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal h-9",
            !displayValue && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayValue || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={handleSelect}
          disabled={disabled}
        />
      </PopoverContent>
    </Popover>
  );
};

/**
 * MonthPicker - Month and year as two selectors (outputs yyyy-MM)
 */
const MonthPicker = ({
  value,
  onChange,
  placeholder = "Month",
  disabled = false,
  className,
  id,
}) => {
  // value is yyyy-MM; parse to month (1–12) and year
  const [year, month] = React.useMemo(() => {
    if (!value || value.length < 7) {
      const now = new Date();
      return [now.getFullYear(), now.getMonth() + 1];
    }
    const [y, m] = value.split("-").map(Number);
    if (!y || !m || m < 1 || m > 12) {
      const now = new Date();
      return [now.getFullYear(), now.getMonth() + 1];
    }
    return [y, m];
  }, [value]);

  const handleMonthChange = (m) => {
    onChange(`${year}-${String(m).padStart(2, "0")}`);
  };

  const handleYearChange = (y) => {
    onChange(`${y}-${String(month).padStart(2, "0")}`);
  };

  return (
    <div className={cn("flex items-center gap-2 flex-shrink-0", className)}>
      <Select
        value={String(month)}
        onValueChange={(v) => handleMonthChange(Number(v))}
        disabled={disabled}
      >
        <SelectTrigger id={id} className="w-[140px] h-9">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {MONTHS.map((name, index) => (
            <SelectItem key={name} value={String(index + 1)}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={String(year)}
        onValueChange={(v) => handleYearChange(Number(v))}
        disabled={disabled}
      >
        <SelectTrigger className="w-[90px] h-9">
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent>
          {YEAR_OPTIONS.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export { DatePicker, MonthPicker };
