import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Generate year range (100 years back, 10 years forward)
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 111 }, (_, i) => currentYear - 100 + i);

function Calendar({
  mode = "single",
  selected,
  onSelect,
  className,
  disabled,
  fromYear = currentYear - 100,
  toYear = currentYear + 10,
  ...props
}) {
  const [viewDate, setViewDate] = React.useState(() => {
    return selected || new Date();
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Generate year options based on props
  const yearOptions = React.useMemo(() => {
    return Array.from(
      { length: toYear - fromYear + 1 },
      (_, i) => fromYear + i,
    );
  }, [fromYear, toYear]);

  // Get first day of month and total days
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Generate calendar grid
  const days = [];

  // Previous month days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    days.push({
      day: daysInPrevMonth - i,
      isCurrentMonth: false,
      date: new Date(year, month - 1, daysInPrevMonth - i),
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      day: i,
      isCurrentMonth: true,
      date: new Date(year, month, i),
    });
  }

  // Next month days to fill the grid (6 rows)
  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    days.push({
      day: i,
      isCurrentMonth: false,
      date: new Date(year, month + 1, i),
    });
  }

  const prevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleMonthChange = (newMonth) => {
    setViewDate(new Date(year, parseInt(newMonth), 1));
  };

  const handleYearChange = (newYear) => {
    setViewDate(new Date(parseInt(newYear), month, 1));
  };

  const isSelected = (date) => {
    if (!selected) return false;
    return (
      date.getDate() === selected.getDate() &&
      date.getMonth() === selected.getMonth() &&
      date.getFullYear() === selected.getFullYear()
    );
  };

  const isToday = (date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const handleSelect = (date) => {
    if (disabled) return;
    onSelect?.(date);
  };

  return (
    <div className={cn("p-3 bg-popover rounded-md", className)} {...props}>
      {/* Header with dropdowns */}
      <div className="flex items-center justify-between gap-1 mb-4">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={prevMonth}
          disabled={disabled}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center">
          {/* Month dropdown */}
          <Select
            value={month.toString()}
            onValueChange={handleMonthChange}
            disabled={disabled}
          >
            <SelectTrigger className="h-7 w-auto gap-1 border-0 !bg-transparent shadow-none px-1 text-sm font-medium focus:ring-0 hover:text-muted-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="!bg-popover">
              {MONTHS.map((m, index) => (
                <SelectItem key={m} value={index.toString()}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Year dropdown */}
          <Select
            value={year.toString()}
            onValueChange={handleYearChange}
            disabled={disabled}
          >
            <SelectTrigger className="h-7 w-auto gap-1 border-0 !bg-transparent shadow-none px-1 text-sm font-medium focus:ring-0 hover:text-muted-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[200px] !bg-popover">
              {yearOptions.map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={nextMonth}
          disabled={disabled}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar grid */}
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {DAYS.map((day) => (
              <th
                key={day}
                className="h-9 w-9 text-center text-xs font-normal text-muted-foreground"
              >
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 6 }).map((_, weekIndex) => (
            <tr key={weekIndex}>
              {days
                .slice(weekIndex * 7, weekIndex * 7 + 7)
                .map(({ day, isCurrentMonth, date }, dayIndex) => {
                  const isSelectedDay = isSelected(date);
                  const isTodayDay = isToday(date);

                  return (
                    <td key={dayIndex} className="p-0.5 text-center">
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => handleSelect(date)}
                        className={cn(
                          "h-9 w-9 rounded-md text-sm transition-colors inline-flex items-center justify-center",
                          "hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          !isCurrentMonth && "text-muted-foreground/50",
                          isCurrentMonth && "text-foreground",
                          isTodayDay &&
                            !isSelectedDay &&
                            "bg-accent font-medium",
                          isSelectedDay &&
                            "bg-primary text-primary-foreground hover:bg-primary font-medium",
                          disabled && "pointer-events-none opacity-50",
                        )}
                      >
                        {day}
                      </button>
                    </td>
                  );
                })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
