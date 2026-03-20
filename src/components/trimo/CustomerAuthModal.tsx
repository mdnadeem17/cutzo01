import {
  ArrowLeft,
  Chrome,
  LocateFixed,
  MapPin,
  Phone,
  Shield,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  findCustomerByPhone,
  formatPhoneForInput,
  normalizePhone,
  saveCustomer,
  setCustomerSession,
} from "./authStorage";
import { CustomerRecord } from "./types";

interface Props {
  open: boolean;
  onClose: () => void;
  onAuthenticated: (user: CustomerRecord) => void;
}

type AuthStep = "access" | "otp" | "setup";

interface SetupDraft {
  name: string;
  location: string;
  gpsLocation: string;
  phone: string;
  authProvider: "phone" | "google";
}

const createDraft = (overrides?: Partial<SetupDraft>): SetupDraft => ({
  name: "",
  location: "",
  gpsLocation: "",
  phone: "",
  authProvider: "phone",
  ...overrides,
});

export default function CustomerAuthModal({ open, onClose, onAuthenticated }: Props) {
  const [step, setStep] = useState<AuthStep>("access");
  const [phoneInput, setPhoneInput] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [setupDraft, setSetupDraft] = useState<SetupDraft>(createDraft());
  const [errorMessage, setErrorMessage] = useState("");
  const [isLocating, setIsLocating] = useState(false);

  const resetFlow = () => {
    setStep("access");
    setPhoneInput("");
    setGeneratedOtp("");
    setOtpValue("");
    setSetupDraft(createDraft());
    setErrorMessage("");
    setIsLocating(false);
  };

  useEffect(() => {
    if (!open) {
      resetFlow();
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const handleStepBack = () => {
    if (step === "access") {
      onClose();
      return;
    }

    if (step === "otp") {
      setStep("access");
      setErrorMessage("");
      return;
    }

    setStep(setupDraft.authProvider === "google" ? "access" : "otp");
    setErrorMessage("");
  };

  const sendOtp = () => {
    const normalizedPhone = normalizePhone(phoneInput);

    if (!normalizedPhone) {
      setErrorMessage("Enter a valid 10-digit phone number to continue.");
      return;
    }

    const nextOtp = String(Math.floor(100000 + Math.random() * 900000));
    console.log("Generated OTP:", nextOtp); // Added for testing purposes
    setGeneratedOtp(nextOtp);
    setOtpValue("");
    setSetupDraft(createDraft({ phone: normalizedPhone, authProvider: "phone" }));
    setErrorMessage("");
    setStep("otp");
  };

  const completePhoneLogin = () => {
    if (otpValue !== generatedOtp) {
      setErrorMessage("The OTP does not match. Please try again.");
      return;
    }

    const existingUser = findCustomerByPhone(setupDraft.phone);

    if (existingUser) {
      setCustomerSession(existingUser.userId);
      onAuthenticated(existingUser);
      return;
    }

    setErrorMessage("");
    setStep("setup");
  };

  const continueWithGoogle = () => {
    const googlePhone = "+919000010000";
    const existingUser = findCustomerByPhone(googlePhone);

    if (existingUser) {
      setCustomerSession(existingUser.userId);
      onAuthenticated(existingUser);
      return;
    }

    setSetupDraft(
      createDraft({
        name: "",
        phone: googlePhone,
        authProvider: "google",
      })
    );
    setErrorMessage("");
    setStep("setup");
  };

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage("Location is not available in this browser. Enter it manually instead.");
      return;
    }

    setIsLocating(true);
    setErrorMessage("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const gpsLocation = `Lat ${position.coords.latitude.toFixed(4)}, Lng ${position.coords.longitude.toFixed(4)}`;
        setSetupDraft((current) => ({
          ...current,
          gpsLocation,
          location: current.location || "Current Location",
        }));
        setIsLocating(false);
      },
      () => {
        setErrorMessage("Location permission was denied. You can still enter your location manually.");
        setIsLocating(false);
      }
    );
  };

  const completeSetup = () => {
    if (!setupDraft.name.trim()) {
      setErrorMessage("Name is required to continue.");
      return;
    }

    const nextUser: CustomerRecord = {
      userId: `customer-${Date.now()}`,
      role: "customer",
      name: setupDraft.name.trim(),
      phone: setupDraft.phone,
      location: setupDraft.location.trim() || "Location pending",
      gpsLocation: setupDraft.gpsLocation || undefined,
      createdAt: new Date().toISOString(),
      authProvider: setupDraft.authProvider,
    };

    saveCustomer(nextUser);
    setCustomerSession(nextUser.userId);
    onAuthenticated(nextUser);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/55 px-4 py-4 backdrop-blur-sm">
      <div className="w-full max-w-[430px] overflow-hidden rounded-[28px] bg-card shadow-[0_24px_70px_rgba(15,23,42,0.35)]">
        <div className="brand-gradient px-5 pb-6 pt-5">
          <div className="flex items-center justify-between">
            <button
              onClick={handleStepBack}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15"
            >
              <ArrowLeft className="h-4 w-4 text-white" />
            </button>
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>

          <p className="mt-5 text-sm font-medium text-white/75">TRIMO Account</p>
          <h2 className="mt-1 text-2xl font-bold text-white">
            {step === "setup" ? "Complete your profile" : "Login or Sign Up"}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-[#E0E7FF]">
            {step === "setup"
              ? "Add a few details once so your profile is ready for faster bookings."
              : "Continue with your phone number or Google to access your profile."}
          </p>
        </div>

        <div className="space-y-4 px-5 py-5">
          {step === "access" && (
            <>
              <div className="rounded-[20px] bg-muted p-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-2xl"
                    style={{ background: "hsl(var(--primary) / 0.08)" }}
                  >
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Continue with Phone Number</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Enter your mobile number and verify it with OTP.
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex h-14 items-center rounded-[16px] border border-border bg-background px-4">
                  <span className="text-sm font-semibold text-foreground">+91</span>
                  <input
                    value={phoneInput}
                    onChange={(event) => setPhoneInput(formatPhoneForInput(event.target.value))}
                    className="ml-3 flex-1 bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
                    placeholder="Enter the number"
                  />
                </div>

                <button
                  onClick={sendOtp}
                  className="gradient-btn mt-4 h-[52px] w-full rounded-[14px] text-base font-semibold text-white"
                >
                  Continue with Phone Number
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  or
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <button
                onClick={continueWithGoogle}
                className="flex h-[52px] w-full items-center justify-center gap-3 rounded-[14px] border border-border bg-background text-sm font-semibold text-foreground"
              >
                <Chrome className="h-5 w-5 text-primary" />
                Continue with Google
              </button>

              <div className="flex items-start gap-3 rounded-[16px] bg-primary/5 px-4 py-3">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Your account details stay on this device until a live backend is connected.
                </p>
              </div>
            </>
          )}

          {step === "otp" && (
            <>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Verify OTP
                </span>
                <input
                  value={otpValue}
                  onChange={(event) => setOtpValue(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="h-14 rounded-[16px] border border-border bg-background px-4 text-center text-xl font-bold tracking-[0.3em] text-foreground outline-none"
                  placeholder="000000"
                />
              </label>

              <div className="rounded-[16px] bg-muted px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                We sent a 6-digit code to {setupDraft.phone}. Existing users will go straight into their TRIMO profile.
              </div>

              <button
                onClick={completePhoneLogin}
                className="gradient-btn h-[52px] w-full rounded-[14px] text-base font-semibold text-white"
              >
                Verify OTP
              </button>
            </>
          )}

          {step === "setup" && (
            <>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Name
                </span>
                <div className="flex h-14 items-center rounded-[16px] border border-border bg-background px-4">
                  <UserRound className="h-4 w-4 text-primary" />
                  <input
                    value={setupDraft.name}
                    onChange={(event) =>
                      setSetupDraft((current) => ({ ...current, name: event.target.value }))
                    }
                    className="ml-3 flex-1 bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
                    placeholder="Your full name"
                  />
                </div>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Location
                </span>
                <div className="flex h-14 items-center rounded-[16px] border border-border bg-background px-4">
                  <MapPin className="h-4 w-4 text-primary" />
                  <input
                    value={setupDraft.location}
                    onChange={(event) =>
                      setSetupDraft((current) => ({ ...current, location: event.target.value }))
                    }
                    className="ml-3 flex-1 bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
                    placeholder="Bengaluru"
                  />
                </div>
              </label>

              <button
                onClick={handleUseLocation}
                className="flex h-[50px] w-full items-center justify-center gap-2 rounded-[14px] border border-border bg-background text-sm font-semibold text-primary"
              >
                <LocateFixed className="h-4 w-4" />
                {isLocating ? "Detecting location..." : "Use Current Location"}
              </button>

              {setupDraft.gpsLocation && (
                <div className="rounded-[16px] bg-muted px-4 py-3 text-xs font-medium text-foreground">
                  {setupDraft.gpsLocation}
                </div>
              )}

              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Phone
                </span>
                <input
                  value={setupDraft.phone}
                  disabled
                  className="h-14 rounded-[16px] border border-border bg-muted px-4 text-sm font-semibold text-foreground outline-none"
                />
              </label>

              <button
                onClick={completeSetup}
                className="gradient-btn h-[52px] w-full rounded-[14px] text-base font-semibold text-white"
              >
                Continue
              </button>
            </>
          )}

          {errorMessage && (
            <div className="rounded-[16px] border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
              {errorMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
