import { Toaster as SonnerToaster } from "sonner";
import { useTheme } from "@/context/ThemeContext";

/**
 * Floating toast container. Styled to match app theme (card, primary, destructive, border-radius).
 * Use via useMessage() which calls toast.success() / toast.error() from "sonner".
 */
export function Toaster() {
  const { theme } = useTheme();

  return (
    <SonnerToaster
      position="bottom-right"
      theme={theme}
      richColors
      closeButton
      toastOptions={{
        className: "!rounded-lg !border !shadow-lg",
      }}
    />
  );
}
