"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

/**
 * Reusable async-search multi-select combobox.
 * - Only fetches when query.length >= minSearchLength (debounced).
 * - Renders options with checkmarks for selected; selected items shown as chips.
 * - Optional "Showing first N. Type more to narrow" when total > limit.
 *
 * @param {Object} props
 * @param {function(string): Promise<{ options: any[], total?: number }>} props.fetchOptions
 * @param {any[]} props.value - Selected option objects (used for chips and comparison via getOptionValue)
 * @param {function(any[]): void} props.onChange
 * @param {function(any): string} props.getOptionValue
 * @param {function(any): string} props.getOptionLabel
 * @param {string} [props.placeholder="Search..."]
 * @param {number} [props.minSearchLength=3]
 * @param {number} [props.debounceMs=300]
 * @param {number} [props.limit=50] - Used for "Showing first N" hint when total > limit
 * @param {string} [props.submitLabel] - e.g. "Add N members"; if not set, no submit button
 * @param {function(): void} [props.onSubmit] - Called when submit button is clicked (e.g. add members)
 * @param {string} [props.emptyMessage="No results."]
 * @param {string} [props.minLengthMessage] - Shown when query length < minSearchLength
 */
export function AsyncSearchCombobox({
  fetchOptions,
  value = [],
  onChange,
  getOptionValue,
  getOptionLabel,
  placeholder = "Search...",
  minSearchLength = 3,
  debounceMs = 300,
  limit = 50,
  submitLabel,
  onSubmit,
  emptyMessage = "No results.",
  minLengthMessage = "Type at least 3 characters to search.",
  className,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState([]);
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const abortRef = useRef(null);

  const selectedValues = new Set(value.map((o) => getOptionValue(o)));

  const loadOptions = useCallback(
    async (q) => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      setLoading(true);
      try {
        const result = await fetchOptions(q);
        const opts = Array.isArray(result?.options) ? result.options : result?.data ?? [];
        setOptions(opts);
        setTotal(result?.total ?? result?.pagination?.total ?? null);
      } catch (err) {
        setOptions([]);
        setTotal(null);
      } finally {
        setLoading(false);
        abortRef.current = null;
      }
    },
    [fetchOptions]
  );

  useEffect(() => {
    if (query.length < minSearchLength) {
      setOptions([]);
      setTotal(null);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadOptions(query);
    }, debounceMs);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, minSearchLength, debounceMs, loadOptions]);

  const toggleOption = (option) => {
    const val = getOptionValue(option);
    const next = selectedValues.has(val)
      ? value.filter((o) => getOptionValue(o) !== val)
      : [...value, option];
    onChange(next);
  };

  const removeChip = (e, option) => {
    e.stopPropagation();
    const val = getOptionValue(option);
    onChange(value.filter((o) => getOptionValue(o) !== val));
  };

  const showNarrowHint = total != null && total > limit;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="min-h-10 w-full justify-between font-normal"
          >
            <span className="flex flex-1 flex-wrap items-center gap-1.5 truncate text-left">
              {value.length === 0 ? (
                placeholder
              ) : (
                value.map((opt) => (
                  <span
                    key={getOptionValue(opt)}
                    className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-sm"
                  >
                    {getOptionLabel(opt)}
                    <button
                      type="button"
                      onClick={(e) => removeChip(e, opt)}
                      className="rounded p-0.5 hover:bg-muted-foreground/20"
                      aria-label={`Remove ${getOptionLabel(opt)}`}
                    >
                      <X className="size-3.5" />
                    </button>
                  </span>
                ))
              )}
            </span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={placeholder}
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              {query.length < minSearchLength && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {minLengthMessage}
                </div>
              )}
              {query.length >= minSearchLength && (
                <>
                  {loading ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      Loading...
                    </div>
                  ) : (
                    <>
                      <CommandEmpty>{emptyMessage}</CommandEmpty>
                      <CommandGroup>
                        {options.map((opt) => {
                          const val = getOptionValue(opt);
                          const isSelected = selectedValues.has(val);
                          return (
                            <CommandItem
                              key={val}
                              value={val}
                              onSelect={() => toggleOption(opt)}
                              className="cursor-pointer"
                            >
                              <span
                                className={cn(
                                  "mr-2 flex size-4 items-center justify-center rounded border",
                                  isSelected ? "bg-primary border-primary text-primary-foreground" : "border-input"
                                )}
                              >
                                {isSelected ? <Check className="size-3" /> : null}
                              </span>
                              {getOptionLabel(opt)}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                      {showNarrowHint && (
                        <div className="border-t px-2 py-1.5 text-center text-xs text-muted-foreground">
                          Showing first {limit}. Type more to narrow results.
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {submitLabel && onSubmit && value.length > 0 && (
        <Button type="button" onClick={onSubmit}>
          {submitLabel.replace("N", String(value.length))}
        </Button>
      )}
    </div>
  );
}
