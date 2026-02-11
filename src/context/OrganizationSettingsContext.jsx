import { createContext, useContext, useState, useEffect } from "react";
import { organizationAPI } from "@/services/api";
import logger from "@/lib/logger";
import { useAuth } from "@/context/AuthContext";

const OrganizationSettingsContext = createContext(null);

export const useOrganizationSettings = () => {
  const context = useContext(OrganizationSettingsContext);
  if (!context) {
    throw new Error(
      "useOrganizationSettings must be used within an OrganizationSettingsProvider"
    );
  }
  return context;
};

export const OrganizationSettingsProvider = ({ children }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await organizationAPI.getSettings();
      const data = res.data?.data ?? {};
      setSettings({
        currency: data.general?.currency ?? "USD",
        displayName: data.general?.displayName ?? "",
        expenses: data.expenses ?? {},
      });
    } catch (err) {
      logger.error("Error fetching organization settings", err);
      setSettings({ currency: "USD", displayName: "", expenses: {} });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }
    fetchSettings();
  }, [user]);

  const value = {
    settings,
    loading,
    currency: settings?.currency ?? "USD",
    refetchSettings: fetchSettings,
  };

  return (
    <OrganizationSettingsContext.Provider value={value}>
      {children}
    </OrganizationSettingsContext.Provider>
  );
};
