import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import AuthLayout from "@/components/AuthLayout";
import { verifyAgentSetupPhone } from "@/api/authClient";
import { useAuth } from "@/lib/AuthContext";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const { login, loginAgent, completeAgentFirstLogin, completeStaffFirstLogin, portalSettings } = useAuth();
  const [mode, setMode] = useState("staff");
  const [setupStep, setSetupStep] = useState(false);
  const [staffSetupStep, setStaffSetupStep] = useState(false);
  const [setupStage, setSetupStage] = useState("phone");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [token, setToken] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [loading, setLoading] = useState(false);

  const showError = (message) => {
    toast({
      variant: "destructive",
      title: "Action needed",
      description: message,
      duration: 5200,
    });
  };

  const showSuccess = (message) => {
    toast({
      variant: "success",
      title: "Success",
      description: message,
      duration: 4200,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await login(email, password, rememberMe, mfaCode);
      if (result?.requiresPasswordChange) {
        setNewPassword("");
        setConfirmNewPassword("");
        setStaffSetupStep(true);
        return;
      }
      if (result?.mfaRequired) {
        setMfaRequired(true);
        setMfaCode("");
        showSuccess("Enter the six-digit code from your authenticator app.");
        return;
      }
      navigate("/", { replace: true });
    } catch (err) {
      showError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleAgentSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await loginAgent(username, password, rememberMe);
      if (result?.requiresSetup) {
        setNewUsername(username);
        setPhone("");
        setToken("");
        setNewPassword("");
        setSetupStage("phone");
        setSetupStep(true);
      } else {
        navigate("/", { replace: true });
      }
    } catch (err) {
      showError(err.message || "Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  const handleGetToken = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await verifyAgentSetupPhone({
        username,
        temporaryPassword: password,
        phone,
      });
      showSuccess("Contact verified. Enter the verification token to continue.");
      setSetupStage("token");
    } catch (err) {
      showError(err.message || "Phone number does not match the supervisor record.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyToken = (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(String(token).trim())) {
      showError("Enter the six-digit one-time setup code from your supervisor.");
      return;
    }
    setSetupStage("reset");
  };

  const handleAgentSetup = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await completeAgentFirstLogin({
        username,
        temporaryPassword: password,
        newUsername,
        phone,
        token,
        newPassword,
        remember: rememberMe,
      });
      showSuccess("Agent setup completed. Signing you in now.");
      navigate("/", { replace: true });
    } catch (err) {
      showError(err.message || "Could not complete agent setup");
    } finally {
      setLoading(false);
    }
  };

  const handleStaffPasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      showError("The new passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await completeStaffFirstLogin({
        email,
        temporaryPassword: password,
        newPassword,
        remember: rememberMe,
      });
      showSuccess("Password changed. Signing you in now.");
      navigate("/", { replace: true });
    } catch (err) {
      showError(err.message || "Could not replace the temporary password.");
    } finally {
      setLoading(false);
    }
  };

  const closeSetup = () => {
    setSetupStep(false);
    setSetupStage("phone");
  };

  return (
    <>
    <AuthLayout className="flex min-h-0 max-w-[420px] flex-col justify-center px-5 pb-5 pt-16 sm:px-5 sm:pb-6 sm:pt-16">
      <div className="mb-4 space-y-1 text-center">
        <div className="page-kicker text-center">Secure staff access</div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          {portalSettings?.portalName || "SUSU Workspace"}
        </h1>
        <p className="mx-auto max-w-[17rem] text-xs leading-5 text-muted-foreground">
          {portalSettings?.loginSubtitle || "Sign in with your official email account"}
        </p>
      </div>

      {mode === "staff" && (
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <Label
            htmlFor="email"
            className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground"
          >
            Official Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@bawjiasecommunitybank.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-9 glass-input text-sm"
            autoComplete="email"
            autoFocus
            required
          />
        </div>

        <div className="space-y-1">
          <Label
            htmlFor="password"
            className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground"
          >
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-9 glass-input pr-10 text-sm"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-smooth hover:text-foreground"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(value) => setRememberMe(value === true)}
            />
            <Label htmlFor="remember" className="cursor-pointer text-muted-foreground">
              Remember me
            </Label>
          </div>
          {portalSettings?.emailEnabled && (
            <Link
              to="/forgot-password"
              className="shrink-0 text-muted-foreground transition-smooth hover:text-primary"
            >
              Forgot?
            </Link>
          )}
        </div>

        {mfaRequired && (
          <div className="space-y-1">
            <Label htmlFor="mfa-code" className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Authenticator code</Label>
            <Input id="mfa-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={mfaCode} onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, ''))} className="h-9 glass-input text-center font-mono tracking-[0.35em]" required />
          </div>
        )}

        <Button
          type="submit"
          className="h-10 w-full glass-button text-sm font-bold uppercase tracking-[0.16em]"
          disabled={loading || !email || !password || (mfaRequired && mfaCode.length !== 6)}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            portalSettings?.loginButtonText || "Sign In"
          )}
        </Button>
      </form>
      )}

      {mode === "agent" && (
        <form onSubmit={handleAgentSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="agent-username" className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              Agent Username
            </Label>
            <Input
              id="agent-username"
              type="text"
              placeholder="e.g. gabriel01"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-9 glass-input text-sm"
              autoComplete="username"
              autoFocus
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="agent-password" className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              Temporary / Agent Password
            </Label>
            <div className="relative">
              <Input
                id="agent-password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-9 glass-input pr-10 text-sm"
                autoComplete="current-password"
                required
              />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="h-10 w-full glass-button text-sm font-bold uppercase tracking-[0.16em]" disabled={loading || !username || !password}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...</> : "Agent Login"}
          </Button>
        </form>
      )}

      <div className="mt-2 border-t border-border/40 pt-2 text-center">
        <button
          type="button"
          onClick={() => { setMode(mode === "staff" ? "agent" : "staff"); closeSetup(); }}
          className="mb-2 w-full rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/15"
        >
          {mode === "staff" ? "Agent username login" : "Back to staff email login"}
        </button>
        {portalSettings?.selfRegistrationEnabled && (
          <p className="text-sm text-muted-foreground">
            New Staff?{" "}
            <Link to="/register" className="font-medium text-primary transition-smooth hover:text-primary/80">
              Sign Up
            </Link>
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          {portalSettings?.authorizedAccessText || "Authorized access only"}
        </p>
      </div>
    </AuthLayout>
    {setupStep && (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeSetup} />
        <div className="relative w-full max-w-sm rounded-2xl border border-primary/20 bg-background/95 p-5 shadow-2xl backdrop-blur-xl">
          <div className="mb-4 text-center">
            <p className="page-kicker text-center">
              {setupStage === "phone" ? "Verify contact" : setupStage === "token" ? "Enter token" : "Create login"}
            </p>
            <h2 className="mt-1 font-display text-xl font-bold text-foreground">
              Agent First Login
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {setupStage === "phone" && "Enter the phone number your supervisor recorded."}
              {setupStage === "token" && "Enter the six-digit one-time setup code your supervisor shared with you."}
              {setupStage === "reset" && "Choose your permanent username and password."}
            </p>
          </div>

          {setupStage === "phone" && (
            <form onSubmit={handleGetToken} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="agent-phone" className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Contact Number</Label>
                <Input id="agent-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-10 glass-input text-sm" placeholder="024..." required autoFocus />
              </div>
              <Button type="submit" className="h-10 w-full glass-button text-sm font-bold uppercase tracking-[0.14em]" disabled={loading || !phone}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking...</> : "Verify Contact"}
              </Button>
            </form>
          )}

          {setupStage === "token" && (
            <form onSubmit={handleVerifyToken} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="agent-token" className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">One-Time Setup Code</Label>
                <Input id="agent-token" value={token} onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))} className="h-10 glass-input text-sm" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="6-digit code" required autoFocus />
              </div>
              <Button type="submit" className="h-10 w-full glass-button text-sm font-bold uppercase tracking-[0.14em]" disabled={!token}>
                Continue
              </Button>
            </form>
          )}

          {setupStage === "reset" && (
            <form onSubmit={handleAgentSetup} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="agent-new-username" className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Permanent Username</Label>
                <Input id="agent-new-username" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="h-10 glass-input text-sm" minLength={3} required autoFocus />
              </div>
              <div className="space-y-1">
                <Label htmlFor="agent-new-password" className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Permanent Password</Label>
                <Input id="agent-new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-10 glass-input text-sm" minLength={10} autoComplete="new-password" required />
                <p className="text-[11px] leading-4 text-muted-foreground">At least 10 characters with uppercase, lowercase, a number, and a symbol.</p>
              </div>
              <Button type="submit" className="h-10 w-full glass-button text-sm font-bold uppercase tracking-[0.14em]" disabled={loading || !newUsername || !newPassword}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save And Login"}
              </Button>
            </form>
          )}

          <button type="button" onClick={closeSetup} className="mt-3 w-full rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">
            Cancel
          </button>
        </div>
      </div>
    )}
    {staffSetupStep && (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="relative w-full max-w-sm rounded-2xl border border-primary/20 bg-background/95 p-5 shadow-2xl backdrop-blur-xl">
          <div className="mb-4 text-center">
            <p className="page-kicker text-center">Secure your account</p>
            <h2 className="mt-1 font-display text-xl font-bold text-foreground">Replace Temporary Password</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Choose a permanent password before entering the portal.</p>
          </div>
          <form onSubmit={handleStaffPasswordChange} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="staff-new-password">New Password</Label>
              <Input id="staff-new-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={10} autoComplete="new-password" required autoFocus />
            </div>
            <div className="space-y-1">
              <Label htmlFor="staff-confirm-password">Confirm New Password</Label>
              <Input id="staff-confirm-password" type="password" value={confirmNewPassword} onChange={(event) => setConfirmNewPassword(event.target.value)} minLength={10} autoComplete="new-password" required />
            </div>
            <p className="text-[11px] leading-4 text-muted-foreground">At least 10 characters with uppercase, lowercase, a number, and a symbol.</p>
            <Button type="submit" className="h-10 w-full glass-button" disabled={loading || !newPassword || !confirmNewPassword}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Change Password And Login"}
            </Button>
          </form>
        </div>
      </div>
    )}
    </>
  );
}
