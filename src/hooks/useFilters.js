import { useCallback, useState } from "react";

/**
 * useFilters - Hook for managing filter state with change handlers
 * @param {Object} initialFilters - Initial filter values
 * @param {Object} options - Options like onReset callback
 */
export const useFilters = (initialFilters, options = {}) => {
  const [filters, setFilters] = useState(initialFilters);

  const handleFilterChange = useCallback((e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  }, []);

  const updateFilter = useCallback((name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  }, []);

  const updateFilters = useCallback((updates) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
    options.onReset?.();
  }, [initialFilters, options]);

  const clearFilter = useCallback(
    (name) => {
      setFilters((prev) => ({ ...prev, [name]: initialFilters[name] ?? "" }));
    },
    [initialFilters],
  );

  // Build query params from filters (exclude empty values)
  const buildParams = useCallback(() => {
    return Object.entries(filters).reduce((params, [key, value]) => {
      if (value !== "" && value !== null && value !== undefined) {
        params[key] = value;
      }
      return params;
    }, {});
  }, [filters]);

  return {
    filters,
    setFilters,
    handleFilterChange,
    updateFilter,
    updateFilters,
    resetFilters,
    clearFilter,
    buildParams,
  };
};

export default useFilters;
