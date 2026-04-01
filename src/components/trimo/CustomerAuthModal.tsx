import {
  ArrowLeft,
  LocateFixed,
  MapPin,
  Phone,
  Shield,
  UserRound,
  X,
} from "lucide-react";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { Capacitor } from '@capacitor/core';
import { auth } from "../../lib/firebase";
import { signInWithPopup, GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { useLoading } from "./LoadingContext";
import { api } from "../../../convex/_generated/api";
import {
  formatPhoneForInput,
  normalizePhone,
  saveCustomer,
  setCustomerSession,
} from "./authStorage";
import { CustomerRecord } from "./types";
import { formatError } from "../../lib/errorUtils";


interface Props {
  open: boolean;
  onClose: () => void;
  onAuthenticated: (user: CustomerRecord) => void;
}

type AuthStep = "access" | "setup";

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
  const [firebaseUid, setFirebaseUid] = useState<string | null>(null);
  const { showLoading, hideLoading } = useLoading();

  const upsertUser = useMutation(api.users.upsertUser);

  // Check returning user in Convex after sign-in
  const existingUser = useQuery(
    api.users.getUserByUid,
    firebaseUid ? { uid: firebaseUid } : "skip"
  );

  // Syncing with Convex logic removed Clerk dependency

  useEffect(() => {
    if (!firebaseUid) return;
    if (existingUser === undefined) return; // still loading

    const email = setupDraft.email || "";
    const name = setupDraft.name || "";

    if (existingUser) {
      const userRecord: CustomerRecord = {
        userId: existingUser.uid,
        role: "customer",
        name: existingUser.name || name,
        phone: existingUser.phone || "",
        location: existingUser.location || "Location pending",
        createdAt: existingUser.createdAt || new Date().toISOString(),
        authProvider: "google",
      };
      saveCustomer(userRecord);
      setCustomerSession(userRecord.userId);
      hideLoading();
      onAuthenticated(userRecord);
    } else {
      // New user — show setup form
      setSetupDraft((current) => ({
        ...current,
        name: name,
        email,
        authProvider: "google",
      }));
      setStep("setup");
      hideLoading();
    }
    setIsLoggingIn(false);
  }, [firebaseUid, existingUser]);

  const resetFlow = () => {
    setStep("access");
    setSetupDraft(createDraft());
    setErrorMessage("");
    setIsLocating(false);
    setIsLoggingIn(false);
    setFirebaseUid(null);
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
    showLoading("Connecting to Google...");

    if (Capacitor.isNativePlatform()) {
      try {
        const result = await FirebaseAuthentication.signInWithGoogle();
        
        // CRITICAL BUG FIX: Native plugin does NOT automatically sync session
        // to the Web JS SDK. We must explicitly sign in to the JS SDK so
        // the Convex provider receives the token and resolves the user query.
        if (result.credential?.idToken) {
          // Standard path: use idToken to link native session to Web SDK
          const cred = GoogleAuthProvider.credential(result.credential.idToken);
          await signInWithCredential(auth, cred);
        } else {
          // Fallback: if native login succeeded but no idToken was returned,
          // force-refresh the existing auth session so Convex has a valid token.
          if (auth.currentUser) {
            await auth.currentUser.getIdToken(true);
          } else {
            throw new Error("Google Sign-In did not return credentials. Please try again.");
          }
        }

        if (result.user) {
          const user = result.user;
          setFirebaseUid(user.uid);
          setSetupDraft((current) => ({
            ...current,
            name: user.displayName || "",
            email: user.email || "",
            authProvider: "google",
          }));
          // The useEffect will handle syncing with Convex once firebaseUid is set
        } else {
          throw new Error("No user returned from native sign-in.");
        }
      } catch (error: any) {
        console.error("Firebase Native Google Sign-In error:", error);
        setErrorMessage(formatError(error));
        setIsLoggingIn(false);
        hideLoading();
      }
      return;
    }

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        const user = result.user;
        setFirebaseUid(user.uid);
        setSetupDraft((current) => ({
          ...current,
          name: user.displayName || "",
          email: user.email || "",
          authProvider: "google",
        }));
      }
    } catch (error: any) {
      console.error("Firebase Web Google Sign-In error:", error);
      setErrorMessage(formatError(error));
      setIsLoggingIn(false);
      hideLoading();
    } finally {
       setIsLoggingIn(false);
       hideLoading();
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

    showLoading("Saving your profile...");

    try {
      const uid = firebaseUid || "";
      const name = setupDraft.name.trim();
      const location = setupDraft.location.trim() || "Location pending";

      // Unified user profile update
      await upsertUser({
        uid,
        name,
        email: setupDraft.email,
        phone: normalizedPhone,
        location,
        gpsLocation: setupDraft.gpsLocation || undefined,
        role: "customer",
      });

      const nextUser: CustomerRecord = {
        userId: uid,
        role: "customer",
        name,
        phone: normalizedPhone,
        location,
        gpsLocation: setupDraft.gpsLocation || undefined,
        createdAt: new Date().toISOString(),
        authProvider: "google",
      };

      saveCustomer(nextUser);
      setCustomerSession(nextUser.userId);
      hideLoading();
      onAuthenticated(nextUser);
    } catch (error: any) {
      console.error("Setup failed:", error);
      setErrorMessage(formatError(error));
      hideLoading();
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/55 px-4 py-4 backdrop-blur-sm">
      <div className="slide-up w-full max-w-[430px] overflow-hidden rounded-[28px] bg-card shadow-[0_24px_70px_rgba(15,23,42,0.35)]">
        <div className="customer-header px-5 pb-6 pt-5">
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

          <p className="mt-5 text-sm font-medium text-white/75 animate-fade-in-delayed">TRIMO Account</p>
          <h2 className="mt-1 text-2xl font-bold text-white animate-fade-slide-up">
            {step === "setup" ? "Complete your profile" : "Login or Sign Up"}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-[#E0E7FF]">
            {step === "setup"
              ? "Add a few details once so your profile is ready for faster bookings."
              : "Continue with Google to access your profile."}
          </p>
        </div>

        <div className="max-h-[70dvh] overflow-y-auto space-y-4 px-5 py-5">
          {step === "access" && (
            <>
              <div className="rounded-[20px] bg-muted p-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-2xl"
                    style={{ background: "hsl(var(--primary) / 0.08)" }}
                  >
                    <GoogleIcon className="h-5 w-5" />
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
                  className="customer-gradient mt-6 h-[56px] w-full rounded-2xl text-base font-semibold text-white shadow-[0_0_15px_rgba(143,0,255,0.3)] disabled:opacity-70"
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
                className="customer-gradient h-[56px] w-full rounded-2xl text-base font-semibold text-white mt-4 shadow-[0_0_15px_rgba(143,0,255,0.3)]"
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
