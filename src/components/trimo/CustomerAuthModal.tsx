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
import { useAction, useMutation } from "convex/react";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { api } from "../../../convex/_generated/api";
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
  email: string;
  location: string;
  gpsLocation: string;
  phone: string;
  authProvider: "phone" | "google";
}

const createDraft = (overrides?: Partial<SetupDraft>): SetupDraft => ({
  name: "",
  email: "",
  location: "",
  gpsLocation: "",
  phone: "",
  authProvider: "phone",
  ...overrides,
});

export default function CustomerAuthModal({ open, onClose, onAuthenticated }: Props) {
  const [step, setStep] = useState<AuthStep>("access");
  const [setupDraft, setSetupDraft] = useState<SetupDraft>(createDraft());
  const [errorMessage, setErrorMessage] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const resetFlow = () => {
    setStep("access");
    setSetupDraft(createDraft());
    setErrorMessage("");
    setIsLocating(false);
    setIsLoggingIn(false);
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

    setStep("access");
    setErrorMessage("");
  };

  const continueWithGoogle = async () => {
    setIsLoggingIn(true);
    setErrorMessage("");

    try {
      // Prompt native Google overlay
      const nativeResult = await FirebaseAuthentication.signInWithGoogle();
      
      // Sync auth to Web Firebase so the Javascript SDK works too
      const credential = GoogleAuthProvider.credential(nativeResult.credential?.idToken);
      const result = await signInWithCredential(auth, credential);
      
      // Pre-fill setup with Google data if it's a new user
      setSetupDraft((current) => ({
        ...current,
        name: result.user.displayName || current.name,
        email: result.user.email || current.email,
        authProvider: "google"
      }));
      // We transition to setup if we need more info. If not, we could log them in. 
      // For now, let's transition to setup step so they can provide phone/location.
      setStep("setup");
    } catch (error: any) {
      console.error("Firebase Google Sign-In error:", error);
      setErrorMessage(error?.message || "Google Sign-In failed.");
    } finally {
      setIsLoggingIn(false);
    }
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

  const completeSetup = async () => {
    if (!setupDraft.name.trim()) {
      setErrorMessage("Name is required to continue.");
      return;
    }

    const normalizedPhone = normalizePhone(setupDraft.phone);
    if (!normalizedPhone) {
      setErrorMessage("A valid 10-digit phone number is required.");
      return;
    }

    try {
      // In a real app, you'd use a server mutation to save the user to Convex
      // For now, we sync with the local session logic
      const nextUser: CustomerRecord = {
        userId: `customer-${Date.now()}`,
        role: "customer",
        name: setupDraft.name.trim(),
        phone: normalizedPhone,
        location: setupDraft.location.trim() || "Location pending",
        gpsLocation: setupDraft.gpsLocation || undefined,
        createdAt: new Date().toISOString(),
        authProvider: "google",
      };

      saveCustomer(nextUser);
      setCustomerSession(nextUser.userId);
      onAuthenticated(nextUser);
    } catch (error: any) {
      console.error("Setup failed:", error);
      setErrorMessage(error.message || "An error occurred during setup.");
    }
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
              : "Continue with Google to access your profile."}
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
                    <Chrome className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Sign in with Google</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Use your Google account to log in or sign up securely.
                    </p>
                  </div>
                </div>

                <button
                  onClick={continueWithGoogle}
                  disabled={isLoggingIn}
                  className="gradient-btn mt-6 h-[52px] w-full rounded-[14px] text-base font-semibold text-white shadow-lg disabled:opacity-70"
                >
                  {isLoggingIn ? "Signing in..." : "Continue with Google"}
                </button>
              </div>

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
                  Mobile Number (Required)
                </span>
                <div className="flex h-14 items-center rounded-[16px] border border-border bg-background px-4">
                  <span className="text-sm font-semibold text-foreground">+91</span>
                  <input
                    value={setupDraft.phone}
                    onChange={(event) =>
                      setSetupDraft((current) => ({
                        ...current,
                        phone: formatPhoneForInput(event.target.value),
                      }))
                    }
                    className="ml-3 flex-1 bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
                    placeholder="Enter the number"
                  />
                </div>
              </label>

              <button
                onClick={completeSetup}
                className="gradient-btn h-[52px] w-full rounded-[14px] text-base font-semibold text-white mt-4"
              >
                Complete Setup
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
