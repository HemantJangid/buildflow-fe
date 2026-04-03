import { useState, useEffect } from "react";
import { organizationAPI } from "@/services/api";
import { useOrganizationSettings } from "@/context/OrganizationSettingsContext";
import { CURRENCIES } from "@/lib/constants";
import PageWrapper from "@/components/PageWrapper";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormSelectCompact } from "@/components/ui/form-select";
import { useMessage } from "@/hooks/useMessage";
import logger from "@/lib/logger";
import { Trash2, Plus } from "lucide-react";

const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({ _id: c, name: c }));

const defaultSettings = {
  general: { currency: "USD", displayName: "" },
  expenses: {
    categories: [
      "Materials",
      "Equipment",
      "Transport",
      "Subsistence",
      "Other",
    ],
  },
};

const settingsEqual = (a, b) =>
  a.general.displayName === b.general.displayName &&
  a.general.currency === b.general.currency &&
  a.expenses.categories.length === b.expenses.categories.length &&
  a.expenses.categories.every((c, i) => c === b.expenses.categories[i]);

const OrganizationSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(defaultSettings);
  const [initialSettings, setInitialSettings] = useState(defaultSettings);
  const [organizationName, setOrganizationName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const { showSuccess, showApiError } = useMessage();
  const { refetchSettings } = useOrganizationSettings();

  const hasChanges = !settingsEqual(settings, initialSettings);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await organizationAPI.getSettings();
        const data = res.data?.data ?? {};
        setOrganizationName(res.data?.organizationName ?? "");
        const next = {
          general: {
            currency: data.general?.currency ?? "USD",
            displayName: data.general?.displayName ?? "",
          },
          expenses: {
            categories: Array.isArray(data.expenses?.categories)
              ? [...data.expenses.categories]
              : ["Materials", "Equipment", "Transport", "Subsistence", "Other"],
          },
        };
        setSettings(next);
        setInitialSettings(next);
      } catch (err) {
        logger.error("Error fetching organization settings", err);
        showApiError(err, "Failed to load settings");
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [showApiError]);

  const handleGeneralChange = (e) => {
    const { name, value } = e.target || {};
    setSettings((prev) => ({
      ...prev,
      general: { ...prev.general, [name]: value },
    }));
  };

  const handleAddCategory = () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    if (settings.expenses.categories.includes(trimmed)) {
      setNewCategory("");
      return;
    }
    setSettings((prev) => ({
      ...prev,
      expenses: {
        ...prev.expenses,
        categories: [...prev.expenses.categories, trimmed],
      },
    }));
    setNewCategory("");
  };

  const handleRemoveCategory = (index) => {
    const next = settings.expenses.categories.filter((_, i) => i !== index);
    if (next.length === 0) return;
    setSettings((prev) => ({
      ...prev,
      expenses: { ...prev.expenses, categories: next },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await organizationAPI.updateSettings({
        general: {
          displayName: settings.general.displayName,
          currency: settings.general.currency,
        },
        expenses: { categories: settings.expenses.categories },
      });
      setInitialSettings(settings);
      await refetchSettings();
      showSuccess("Settings saved successfully");
    } catch (err) {
      showApiError(err, "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageWrapper
        title="Organization Settings"
        subtitle="Manage your organization preferences"
      >
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground text-sm">Loading settings…</div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Organization Settings"
      subtitle="Manage your organization preferences"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-base">General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Organization name
              </label>
              <input
                type="text"
                name="displayName"
                value={settings.general.displayName}
                onChange={handleGeneralChange}
                placeholder={organizationName || "Display name"}
                className="w-full max-w-md h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              />
              {!settings.general.displayName && organizationName && (
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty to use: {organizationName}
                </p>
              )}
            </div>
            <FormSelectCompact
              label="Default currency"
              name="currency"
              value={settings.general.currency}
              onChange={handleGeneralChange}
              options={CURRENCY_OPTIONS}
              placeholder="Select currency"
              includeAll={false}
              className="max-w-[200px]"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-base">Expenses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Expense categories
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                Add or remove categories used when logging expenses.
              </p>
              <div className="flex flex-wrap gap-2 mb-3">
                {settings.expenses.categories.map((cat, index) => (
                  <span
                    key={`${cat}-${index}`}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-2.5 py-1 text-sm"
                  >
                    {cat}
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(index)}
                      className="text-muted-foreground hover:text-destructive rounded p-0.5"
                      aria-label={`Remove ${cat}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2 max-w-sm">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    (e.preventDefault(), handleAddCategory())
                  }
                  placeholder="New category"
                  className="flex-1 h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddCategory}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving || !hasChanges}>
            {saving ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </form>
    </PageWrapper>
  );
};

export default OrganizationSettings;
