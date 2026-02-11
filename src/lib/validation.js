/**
 * Form validation utilities
 */

// Validation rules
export const rules = {
  required: (value) => {
    if (value === null || value === undefined || value === "") {
      return "This field is required";
    }
    return null;
  },

  email: (value) => {
    if (!value) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return "Please enter a valid email address";
    }
    return null;
  },

  minLength: (min) => (value) => {
    if (!value) return null;
    if (value.length < min) {
      return `Must be at least ${min} characters`;
    }
    return null;
  },

  maxLength: (max) => (value) => {
    if (!value) return null;
    if (value.length > max) {
      return `Must be no more than ${max} characters`;
    }
    return null;
  },

  min: (min) => (value) => {
    if (value === "" || value === null || value === undefined) return null;
    if (Number(value) < min) {
      return `Must be at least ${min}`;
    }
    return null;
  },

  max: (max) => (value) => {
    if (value === "" || value === null || value === undefined) return null;
    if (Number(value) > max) {
      return `Must be no more than ${max}`;
    }
    return null;
  },

  pattern: (regex, message) => (value) => {
    if (!value) return null;
    if (!regex.test(value)) {
      return message || "Invalid format";
    }
    return null;
  },
};

/**
 * Validate a single field against multiple rules
 * @param {any} value - Field value
 * @param {Array} fieldRules - Array of validation functions
 * @returns {string|null} - Error message or null
 */
export const validateField = (value, fieldRules = []) => {
  for (const rule of fieldRules) {
    const error = rule(value);
    if (error) return error;
  }
  return null;
};

/**
 * Validate entire form
 * @param {Object} values - Form values { fieldName: value }
 * @param {Object} schema - Validation schema { fieldName: [rules] }
 * @returns {Object} - { isValid: boolean, errors: { fieldName: errorMessage } }
 */
export const validateForm = (values, schema) => {
  const errors = {};
  let isValid = true;

  for (const [field, fieldRules] of Object.entries(schema)) {
    const error = validateField(values[field], fieldRules);
    if (error) {
      errors[field] = error;
      isValid = false;
    }
  }

  return { isValid, errors };
};

export default { rules, validateField, validateForm };
