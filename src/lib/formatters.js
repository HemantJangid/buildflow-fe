/**
 * Format a date to a localized date string
 * @param {Date|string} date - The date to format
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Format a date to a localized time string
 * @param {Date|string} date - The date to format
 * @returns {string} Formatted time string
 */
export const formatTime = (date) => {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format a date to a localized date and time string
 * @param {Date|string} date - The date to format
 * @returns {string} Formatted datetime string
 */
export const formatDateTime = (date) => {
  return new Date(date).toLocaleString();
};

/**
 * Calculate duration between two dates
 * @param {Date|string} start - Start time
 * @param {Date|string} end - End time (optional)
 * @returns {string} Formatted duration string
 */
export const formatDuration = (start, end) => {
  if (!end) return 'In Progress';
  const diff = new Date(end) - new Date(start);
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

/**
 * Get default date range (last 30 days)
 * @returns {{ startDate: string, endDate: string }}
 */
export const getDefaultDateRange = () => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
};

/**
 * Build query params from filters object, excluding empty values
 * @param {Object} filters - Filter object
 * @returns {Object} Params object with only non-empty values
 */
export const buildParams = (filters) => {
  return Object.entries(filters).reduce((params, [key, value]) => {
    if (value !== '' && value !== null && value !== undefined) {
      params[key] = value;
    }
    return params;
  }, {});
};
