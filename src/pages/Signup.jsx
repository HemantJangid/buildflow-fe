import { useState } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { Sun, Moon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useMessage } from "@/hooks/useMessage";

const Signup = () => {
  const [formData, setFormData] = useState({
    organizationName: "",
    organizationSlug: "",
    name: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const { signup, isAuthenticated, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showApiError } = useMessage();
  const navigate = useNavigate();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-primary/10 to-primary/5">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        organizationName: formData.organizationName.trim(),
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
      };
      if (formData.organizationSlug?.trim()) {
        payload.organizationSlug = formData.organizationSlug.trim();
      }
      await signup(payload);
      navigate("/dashboard");
    } catch (err) {
      showApiError(err, "Sign up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-primary/10 to-primary/5 px-4 relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className="absolute top-4 right-4"
        title={
          theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
        }
        aria-label={
          theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
        }
      >
        {theme === "dark" ? (
          <Sun className="w-5 h-5" />
        ) : (
          <Moon className="w-5 h-5" />
        )}
      </Button>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-foreground font-bold text-3xl">
              B
            </span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">BuildFlow</h1>
          <p className="text-muted-foreground mt-1">
            Create your organization
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Sign up</CardTitle>
            <p className="text-sm text-muted-foreground">
              Create your company account. You will be the first admin.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="organizationName">Organization name</Label>
                <Input
                  id="organizationName"
                  type="text"
                  name="organizationName"
                  value={formData.organizationName}
                  onChange={handleChange}
                  placeholder="e.g. ABC Construction"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="organizationSlug">
                  Organization slug (optional)
                </Label>
                <Input
                  id="organizationSlug"
                  type="text"
                  name="organizationSlug"
                  value={formData.organizationSlug}
                  onChange={handleChange}
                  placeholder="e.g. abc-construction"
                />
                <p className="text-xs text-muted-foreground">
                  Lowercase letters, numbers, and hyphens only. Leave blank to
                  auto-generate from name.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Your name</Label>
                <Input
                  id="name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Admin name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@company.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full mt-6"
                size="lg"
              >
                {loading ? "Creating account..." : "Create account"}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-4">
              Already have an account?{" "}
              <Link to="/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
