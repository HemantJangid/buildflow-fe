import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { getDatePresetOptions } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * DateRangeSelect - Date range selector with preset dropdown and custom option
 */
const DateRangeSelect = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onPresetChange,
  selectedPreset,
  className,
  showLabels = true,
  disabled = false,
}) => {
  const presets = useMemo(() => getDatePresetOptions(), []);

  // Determine if current dates match any preset
  const currentPreset = useMemo(() => {
    if (selectedPreset) return selectedPreset;

    const match = presets.find(
      (p) => p.startDate === startDate && p.endDate === endDate,
    );
    return match?.id || "custom";
  }, [startDate, endDate, presets, selectedPreset]);

  const handlePresetChange = (presetId) => {
    if (presetId === "custom") {
      onPresetChange?.("custom");
      return;
    }

    const preset = presets.find((p) => p.id === presetId);
    if (preset) {
      onStartDateChange(preset.startDate);
      onEndDateChange(preset.endDate);
      onPresetChange?.(presetId);
    }
  };

  const handleCustomDateChange = (type, value) => {
    onPresetChange?.("custom");
    if (type === "start") {
      onStartDateChange(value);
    } else {
      onEndDateChange(value);
    }
  };

  return (
    <div className={cn("flex flex-wrap items-end gap-3", className)}>
      {/* Preset Dropdown */}
      <div>
        {showLabels && (
          <Label className="text-xs text-muted-foreground block mb-2">Date range</Label>
        )}
        <Select
          value={currentPreset}
          onValueChange={handlePresetChange}
          disabled={disabled}
        >
          <SelectTrigger className="h-9 w-[140px]">
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent>
            {presets.map((preset) => (
              <SelectItem key={preset.id} value={preset.id}>
                {preset.label}
              </SelectItem>
            ))}
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* From Date */}
      <div>
        {showLabels && <Label className="text-xs text-muted-foreground block mb-2">From</Label>}
        <DatePicker
          value={startDate}
          onChange={(v) => handleCustomDateChange("start", v)}
          placeholder="Start date"
          disabled={disabled}
          className="w-[140px]"
        />
      </div>

      {/* To Date */}
      <div>
        {showLabels && <Label className="text-xs text-muted-foreground block mb-2">To</Label>}
        <DatePicker
          value={endDate}
          onChange={(v) => handleCustomDateChange("end", v)}
          placeholder="End date"
          disabled={disabled}
          className="w-[140px]"
        />
      </div>
    </div>
  );
};

export default DateRangeSelect;
