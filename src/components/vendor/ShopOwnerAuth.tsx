import { ArrowLeft, Chrome, ImageIcon, Locate, MapPin, Phone, Store, X } from "lucide-react";
import { ChangeEvent, useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { api } from "../../../convex/_generated/api";
import { formatHourLabel } from "./utils";
import {
  createDefaultAvailabilitySlots,
  createDefaultServiceCatalog,
  findShopOwnerByPhone,
  formatPhoneForInput,
  normalizePhone,
  saveShopOwner,
  setShopOwnerSession,
  ShopOwnerRecord,
} from "./storage";

interface Props {
  onBack: () => void;
  onAuthenticated: (user: ShopOwnerRecord) => void;
}

type AuthStep = "access" | "setup";

interface SetupDraft {
  shopName: string;
  ownerName: string;
  email: string;
  phone: string;
  location: string;
  gpsLocation: string;
  address: string;
  services: string[];
  startingPrice: string;
  startHour: string;
  endHour: string;
  image: string;
  authProvider: "phone" | "google";
}

const hourOptions = [
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
];

const serviceOptions = [
  "Haircut",
  "Beard Styling",
  "Hair Spa",
  "Haircut + Beard",
  "Kids Haircut",
  "Facial Cleanup",
];

const createDraft = (overrides?: Partial<SetupDraft>): SetupDraft => ({
  shopName: "",
  ownerName: "",
  email: "",
  phone: "",
  location: "",
  gpsLocation: "",
  address: "",
  services: [],
  startingPrice: "",
  startHour: "09:00",
  endHour: "21:00",
  image: "",
  authProvider: "phone",
  ...overrides,
});

export default function ShopOwnerAuth({ onBack, onAuthenticated }: Props) {
  const [step, setStep] = useState<AuthStep>("access");
  const [setupDraft, setSetupDraft] = useState<SetupDraft>(createDraft());
  const [errorMessage, setErrorMessage] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleStepBack = () => {
    if (step === "access") {
      onBack();
      return;
    }

    setStep("access");
    setErrorMessage("");
  };

  const continueWithGoogle = async () => {
    setIsLoggingIn(true);
    setErrorMessage("");

    try {
      // Use native plugin to solve webview popup block
      const nativeResult = await FirebaseAuthentication.signInWithGoogle();
      
      // Apply credential to Web App so Javascript SDK authenticates
      const credential = GoogleAuthProvider.credential(nativeResult.credential?.idToken);
      const result = await signInWithCredential(auth, credential);
      
      // In a real app we'd query the backend to see if this shop owner exists.
      // Since we don't have the backend lookup implemented here, we will push them to setup.
      // Assuming new user flow for Firebase Google sign-in:
      setSetupDraft(
        createDraft({
          email: result.user.email || "",
          ownerName: result.user.displayName || "",
          authProvider: "google",
        })
      );
      setStep("setup");
    } catch (error: any) {
      console.error("Firebase Google Login failed:", error);
      setErrorMessage(error.message || "Failed to sign in with Google.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const toggleService = (service: string) => {
    setSetupDraft((current) => ({
      ...current,
      services: current.services.includes(service)
        ? current.services.filter((item) => item !== service)
        : [...current.services, service],
    }));
  };

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setErrorMessage("GPS is not available in this browser. Enter your location manually.");
      return;
    }

    setIsLocating(true);
    setErrorMessage("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const gpsLocation = `Lat ${position.coords.latitude.toFixed(4)}, Lng ${position.coords.longitude.toFixed(4)}`;
        setSetupDraft((current) => ({ ...current, gpsLocation }));
        setIsLocating(false);
      },
      () => {
        setErrorMessage("Location permission was denied. You can still type the shop location manually.");
        setIsLocating(false);
      }
    );
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSetupDraft((current) => ({
        ...current,
        image: typeof reader.result === "string" ? reader.result : "",
      }));
    };
    reader.readAsDataURL(file);
  };

  const completeSetup = async () => {
    if (!setupDraft.shopName.trim()) {
      setErrorMessage("Shop name is required to complete setup.");
      return;
    }

    const normalizedPhone = normalizePhone(setupDraft.phone);
    if (!normalizedPhone) {
      setErrorMessage("A valid 10-digit phone number is required.");
      return;
    }

    try {
      const userRecord: ShopOwnerRecord = {
        userId: `owner-${Date.now()}`,
        role: "shop_owner",
        name: setupDraft.ownerName.trim() || setupDraft.shopName.trim(),
        phone: normalizedPhone,
        shopName: setupDraft.shopName.trim(),
        location: setupDraft.location.trim() || "Location pending",
        address: setupDraft.address.trim(),
        services: setupDraft.services,
        serviceCatalog: createDefaultServiceCatalog(
          setupDraft.services,
          Number(setupDraft.startingPrice) || 0
        ),
        startingPrice: Number(setupDraft.startingPrice) || 0,
        workingHours: {
          start: setupDraft.startHour,
          end: setupDraft.endHour,
        },
        availabilitySlots: createDefaultAvailabilitySlots({
          start: setupDraft.startHour,
          end: setupDraft.endHour,
        }),
        blockedDates: [],
        image: setupDraft.image,
        images: setupDraft.image ? [setupDraft.image] : [],
        gpsLocation: setupDraft.gpsLocation,
        createdAt: new Date().toISOString(),
        authProvider: "google",
      };

      saveShopOwner(userRecord);
      setShopOwnerSession(userRecord.userId);
      onAuthenticated(userRecord);
    } catch (error: any) {
      setErrorMessage(error.message || "An error occurred during setup.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-muted">
      <div className="brand-gradient px-4 pb-10 pt-12">
        <button
          onClick={handleStepBack}
          className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>
        <p className="text-sm font-medium text-light-text">TRIMO Partner</p>
        <h1 className="mt-1 text-2xl font-bold text-white">
          {step === "setup" ? "Set up your shop" : "Owner login"}
        </h1>
        <p className="mt-1 text-sm text-light-text">
          {step === "setup"
            ? "Complete a quick setup so customers can discover and book your barber shop."
            : "Use your Google account to access the barber shop dashboard."}
        </p>
      </div>

      <div className="-mt-5 flex flex-1 flex-col gap-4 px-4 pb-8">
        {step === "access" && (
          <div className="rounded-[22px] bg-card p-5 card-shadow">
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ background: "hsl(var(--primary) / 0.08)" }}
              >
                <Chrome className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Sign in with Google</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Secure access to your Trimo Partner dashboard.
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

            <div className="mt-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Partner Secure Login
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
          </div>
        )}

        {step === "setup" && (
          <div className="rounded-[22px] bg-card p-5 card-shadow">
            <div className="space-y-4">
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Shop Name
                </span>
                <input
                  value={setupDraft.shopName}
                  onChange={(event) =>
                    setSetupDraft((current) => ({ ...current, shopName: event.target.value }))
                  }
                  className="h-14 rounded-[16px] border border-border bg-background px-4 text-sm font-medium outline-none"
                  placeholder="Urban Edge Salon"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Owner Name
                </span>
                <input
                  value={setupDraft.ownerName}
                  onChange={(event) =>
                    setSetupDraft((current) => ({ ...current, ownerName: event.target.value }))
                  }
                  className="h-14 rounded-[16px] border border-border bg-background px-4 text-sm font-medium outline-none"
                  placeholder="Rahul Mehta"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Phone Number (Required)
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
                    className="ml-3 flex-1 bg-transparent text-sm font-medium outline-none"
                    placeholder="Enter the number"
                  />
                </div>
              </label>

              <div className="grid grid-cols-[1fr_auto] gap-3">
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Shop Location
                  </span>
                  <input
                    value={setupDraft.location}
                    onChange={(event) =>
                      setSetupDraft((current) => ({ ...current, location: event.target.value }))
                    }
                    className="h-14 rounded-[16px] border border-border bg-background px-4 text-sm font-medium outline-none"
                    placeholder="Bengaluru"
                  />
                </label>
                <button
                  onClick={handleUseGps}
                  className="mt-7 flex h-14 items-center justify-center gap-2 rounded-[16px] border border-border bg-background px-4 text-sm font-semibold text-primary"
                >
                  <Locate className="h-4 w-4" />
                  {isLocating ? "Locating..." : "Use GPS"}
                </button>
              </div>

              {setupDraft.gpsLocation && (
                <div className="rounded-[16px] bg-muted px-4 py-3 text-xs font-medium text-foreground">
                  GPS: {setupDraft.gpsLocation}
                </div>
              )}

              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Address
                </span>
                <textarea
                  value={setupDraft.address}
                  onChange={(event) =>
                    setSetupDraft((current) => ({ ...current, address: event.target.value }))
                  }
                  className="min-h-[110px] rounded-[16px] border border-border bg-background px-4 py-3 text-sm font-medium outline-none"
                  placeholder="Shop address"
                />
              </label>

              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Services
                </span>
                <div className="mt-3 flex flex-wrap gap-2">
                  {serviceOptions.map((service) => {
                    const isSelected = setupDraft.services.includes(service);

                    return (
                      <button
                        key={service}
                        onClick={() => toggleService(service)}
                        className="rounded-full px-4 py-2 text-xs font-semibold transition-all"
                        style={{
                          background: isSelected ? "hsl(var(--primary))" : "hsl(var(--muted))",
                          color: isSelected ? "#ffffff" : "hsl(var(--foreground))",
                        }}
                      >
                        {service}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Starting Price
                </span>
                <input
                  type="number"
                  min="1"
                  step="10"
                  value={setupDraft.startingPrice}
                  onChange={(event) =>
                    setSetupDraft((current) => ({ ...current, startingPrice: event.target.value }))
                  }
                  className="h-14 rounded-[16px] border border-border bg-background px-4 text-sm font-medium outline-none"
                  placeholder="250"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Open
                  </span>
                  <select
                    value={setupDraft.startHour}
                    onChange={(event) =>
                      setSetupDraft((current) => ({ ...current, startHour: event.target.value }))
                    }
                    className="h-14 rounded-[16px] border border-border bg-background px-4 text-sm font-semibold outline-none"
                  >
                    {hourOptions.map((option) => (
                      <option key={option} value={option}>
                        {formatHourLabel(option)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Close
                  </span>
                  <select
                    value={setupDraft.endHour}
                    onChange={(event) =>
                      setSetupDraft((current) => ({ ...current, endHour: event.target.value }))
                    }
                    className="h-14 rounded-[16px] border border-border bg-background px-4 text-sm font-semibold outline-none"
                  >
                    {hourOptions.map((option) => (
                      <option key={option} value={option}>
                        {formatHourLabel(option)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Shop Image
                </span>
                <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-[16px] border border-dashed border-border bg-background px-4 py-5 text-center">
                  <ImageIcon className="h-5 w-5 text-primary" />
                  <p className="mt-3 text-sm font-semibold text-foreground">Upload Shop Image</p>
                  <p className="mt-1 text-xs text-muted-foreground">Optional</p>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>

                {setupDraft.image && (
                  <div className="mt-3 overflow-hidden rounded-[18px] bg-muted">
                    <img src={setupDraft.image} alt="Shop preview" className="h-32 w-full object-cover" />
                  </div>
                )}
              </div>

              <button
                onClick={completeSetup}
                className="gradient-btn h-[52px] w-full rounded-[14px] text-base font-semibold text-white mt-4"
              >
                Complete Setup
              </button>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="rounded-[16px] border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
            {errorMessage}
          </div>
        )}

        <div className="rounded-[18px] bg-card p-4 card-shadow">
          <div className="flex items-start gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
              style={{ background: "hsl(var(--accent) / 0.12)" }}
            >
              <Store className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Partner Verification</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                All shops go through a quick manual verification before going live on the Trimo marketplace.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
