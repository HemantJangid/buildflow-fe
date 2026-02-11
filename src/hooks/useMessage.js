import { useCallback } from 'react';
import { toast } from 'sonner';

export const useMessage = () => {
  const showSuccess = useCallback((text) => {
    toast.success(text);
  }, []);

  const showError = useCallback((text) => {
    toast.error(text);
  }, []);

  const showInfo = useCallback((text) => {
    toast.info(text);
  }, []);

  const showWarning = useCallback((text) => {
    toast.warning(text);
  }, []);

  const clearMessage = useCallback(() => {
    toast.dismiss();
  }, []);

  // Helper to extract error message from API response (including validation errors array)
  const showApiError = useCallback((error, fallbackMessage = 'Operation failed') => {
    const data = error?.response?.data;
    let text = data?.message || error?.message || fallbackMessage;
    if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
      const details = data.errors.map((e) => (e.field ? `${e.field}: ${e.message}` : e.message)).join('. ');
      text = `${text}. ${details}`;
    }
    toast.error(text);
  }, []);

  return {
    showSuccess,
    showError,
    showInfo,
    showWarning,
    showApiError,
    clearMessage,
  };
};

export default useMessage;
