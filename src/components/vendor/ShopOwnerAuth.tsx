import { ArrowLeft, ImageIcon, Locate, MapPin, Phone, Store, X } from "lucide-react";

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
import { ChangeEvent, useEffect, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { Capacitor } from '@capacitor/core';
import { auth } from "../../lib/firebase";
import { signInWithPopup, GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { api } from "../../../convex/_generated/api";
import { Geolocation } from '@capacitor/geolocation';
import { compressImage, formatHourLabel, hashPassword } from "./utils";
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
import { formatError } from "../../lib/errorUtils";

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
  username?: string;
  password?: string;
  blockedDates?: { date: string; reason?: string }[];
  imageStorageId?: string; // ID from Convex Storage
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

  const generateUploadUrl = useMutation(api.shops.generateUploadUrl);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [firebaseUid, setFirebaseUid] = useState<string | null>(null);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  const upsertShop = useAction(api.auth_actions.upsertShop);
  const loginMutation = useAction(api.auth_actions.loginShopOwner);
  const syncShopUidMutation = useMutation(api.shops.syncShopOwnerUid);

  // Check returning shop in Convex after sign-in
  const existingShop = useQuery(
    api.shops.getShopByFirebaseUid,
    firebaseUid ? { firebaseUid: firebaseUid } : "skip"
  );

  useEffect(() => {
    if (!firebaseUid) return;
    if (existingShop === undefined) return; // still loading

    if (existingShop) {
      if (existingShop.status === "pending") {
        setErrorMessage("Your account is currently under review. We will notify you once approved.");
        setStep("access");
        setFirebaseUid(null); // Reset to allow retrying/other actions
        setIsLoggingIn(false);
        return;
      }

      if (existingShop.status === "rejected") {
        setErrorMessage("Your account has been rejected. Please contact support.");
        setStep("access");
        setFirebaseUid(null);
        setIsLoggingIn(false);
        return;
      }

      const record: ShopOwnerRecord = {
        userId: existingShop.ownerId,
        role: "shop_owner",
        name: existingShop.shopName,
        phone: existingShop.phone || "",
        shopName: existingShop.shopName,
        location: existingShop.locationLabel || existingShop.address,
        address: existingShop.address,
        services: [],
        serviceCatalog: existingShop.servicesJson ? JSON.parse(existingShop.servicesJson) : [],
        startingPrice: existingShop.startingPrice || 0,
        workingHours: { start: existingShop.openTime ?? "09:00", end: existingShop.closeTime ?? "21:00" },
        slotDuration: existingShop.slotDuration || 30,
        maxBookingsPerSlot: existingShop.maxBookingsPerSlot || 1,
        availabilitySlots: existingShop.availabilitySlotsJson ? JSON.parse(existingShop.availabilitySlotsJson) : [],
        blockedDates: existingShop.blockedDatesJson ? JSON.parse(existingShop.blockedDatesJson) : [],
        image: existingShop.image || "",
        images: existingShop.images || [],
        gpsLocation: existingShop.gpsLocation,
        createdAt: new Date().toISOString(),
        authProvider: "google",
        firebaseUid: firebaseUid || undefined,
      };
      saveShopOwner(record);
      setShopOwnerSession(record.userId);
      onAuthenticated(record);
    } else {
      // New shop — show setup form
      setStep("setup");
    }
    setIsLoggingIn(false);
  }, [firebaseUid, existingShop]);

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

    if (Capacitor.isNativePlatform()) {
      try {
        const result = await FirebaseAuthentication.signInWithGoogle();
        
        // BUG 4 & 7 FIX: Sync Native Auth Token to Web JS SDK
        if (result.credential?.idToken) {
          // Standard path: use idToken to link native session to Web SDK
          const cred = GoogleAuthProvider.credential(result.credential.idToken);
          await signInWithCredential(auth, cred);
        } else {
          // Fallback: if native login succeeded but no idToken, force-refresh the
          // existing auth session so the Web SDK has a valid token for Convex.
          if (auth.currentUser) {
            await auth.currentUser.getIdToken(true);
          } else {
            // Neither path worked — show an error
            setErrorMessage("Google Sign-In did not return credentials. Please try again.");
            setIsLoggingIn(false);
            return;
          }
        }

        if (result.user) {
          const user = result.user;
          setFirebaseUid(user.uid);
          setSetupDraft(createDraft({ 
            authProvider: "google",
            ownerName: user.displayName || "",
            email: user.email || ""
          }));
          // useEffect will handle navigation if existingShop is found
        }
      } catch (error: any) {
        console.error("Firebase Native Google Login failed:", error);
        setErrorMessage(formatError(error));
        setIsLoggingIn(false);
      }
      return;
    }

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        const user = result.user;
        setFirebaseUid(user.uid);
        setSetupDraft(createDraft({ 
          authProvider: "google",
          ownerName: user.displayName || "",
          email: user.email || ""
        }));
        // useEffect will handle navigation if existingShop is found
      }
    } catch (error: any) {
      console.error("Firebase Web Google Login failed:", error);
      setErrorMessage(formatError(error));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleCredentialsLogin = async () => {
    if (!loginUsername.trim() || !loginPassword.trim()) {
      setErrorMessage("Please enter both username and password.");
      return;
    }
    setErrorMessage("");
    setIsLoggingIn(true);

    try {
      // Bug 1 & 11: Do NOT pre-hash the password on the client.
      // The server uses bcrypt which needs the raw plaintext to compare correctly.
      // Pre-hashing (SHA-256) breaks bcrypt comparison and breaks the lazy-migration
      // plaintext upgrade path.
      const result = await loginMutation({ username: loginUsername.trim(), password: loginPassword.trim() });

      if (!result.success) {
        if (result.error === "pending") {
          setErrorMessage("Your account is currently under review. We will notify you once approved.");
        } else {
          setErrorMessage(result.error ?? "Invalid username or password.");
        }
        return;
      }

      // result.shop is already sanitized (no password/username) by server
      const safeShop = result.shop!;
      
      // CRITICAL BUG FIX (Manual Login UID Sychronization): 
      // Manual login doesn't inherently notify the identity token.
      // We must explicitly register this account's ownerId to the current token.
      try {
        await syncShopUidMutation({ shopId: safeShop._id, ownerId: safeShop.ownerId });
      } catch (e) {
        console.warn("UID Sync failed, but proceeding login:", e);
      }

      const record: ShopOwnerRecord = {
        userId: safeShop.ownerId,
        role: "shop_owner",
        name: safeShop.shopName,
        phone: safeShop.phone || "",
        shopName: safeShop.shopName,
        location: safeShop.locationLabel || safeShop.address,
        address: safeShop.address,
        services: [],
        serviceCatalog: safeShop.servicesJson ? JSON.parse(safeShop.servicesJson) : [],
        startingPrice: safeShop.startingPrice || 0,
        workingHours: { start: safeShop.openTime ?? "09:00", end: safeShop.closeTime ?? "21:00" },
        slotDuration: safeShop.slotDuration || 30,
        maxBookingsPerSlot: safeShop.maxBookingsPerSlot || 1,
        availabilitySlots: safeShop.availabilitySlotsJson ? JSON.parse(safeShop.availabilitySlotsJson) : [],
        blockedDates: safeShop.blockedDatesJson ? JSON.parse(safeShop.blockedDatesJson) : [],
        image: safeShop.image || "",
        images: safeShop.images || [],
        gpsLocation: safeShop.gpsLocation,
        createdAt: new Date().toISOString(),
        authProvider: "google",
        firebaseUid: firebaseUid || undefined,
      };
      saveShopOwner(record);
      setShopOwnerSession(record.userId); // stamps 8h expiry
      onAuthenticated(record);
    } catch (error: any) {
      // Handles rate-limit errors thrown by the Convex mutation
      setErrorMessage(formatError(error));
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

  const handleUseGps = async () => {
    setIsLocating(true);
    setErrorMessage("");

    try {
      const position = await Geolocation.getCurrentPosition();
      const gpsLocation = `Lat ${position.coords.latitude.toFixed(4)}, Lng ${position.coords.longitude.toFixed(4)}`;
      setSetupDraft((current) => ({ ...current, gpsLocation }));
    } catch (e: any) {
      setErrorMessage("Location permission was denied. You can still type the shop location manually.");
    } finally {
      setIsLocating(false);
    }
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const compressedBase64 = await compressImage(file);
      
      // Upload to Convex File Storage
      const base64Response = await fetch(compressedBase64);
      const blob = await base64Response.blob();
      
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "image/jpeg" },
        body: blob,
      });
      
      const { storageId } = await result.json();

      setSetupDraft((current) => ({
        ...current,
        imageStorageId: storageId,
        image: undefined, // Clear old base64 if reusing Draft
      }));
    } catch (e) {
      console.error("Image upload failed:", e);
      setErrorMessage("Failed to upload the image. Please try a different one.");
    }
  };

  const completeSetup = async () => {
    if (isSubmitting) return; // prevent double-click duplicate submissions
    setIsSubmitting(true);

    try {
      if (!setupDraft.shopName.trim()) {
        setErrorMessage("Shop name is required to complete setup.");
        return;
      }

      const normalizedPhone = normalizePhone(setupDraft.phone);
      if (!normalizedPhone) {
        setErrorMessage("A valid 10-digit phone number is required.");
        return;
      }

      if (!setupDraft.username?.trim() || !setupDraft.password?.trim()) {
        setErrorMessage("You must create a username and password to complete setup.");
        return;
      }


      const workingHours = { start: setupDraft.startHour, end: setupDraft.endHour };
      const serviceCatalog = createDefaultServiceCatalog(
        setupDraft.services,
        Number(setupDraft.startingPrice) || 0
      );
      const availabilitySlots = createDefaultAvailabilitySlots(workingHours);

      // Reuse existing userId if this phone already has a record, preventing duplicate shops
      const existingOwner = findShopOwnerByPhone(normalizedPhone);
      const stableUserId = existingOwner?.userId ?? `owner-${Date.now()}`;

      const userRecord: ShopOwnerRecord = {
        userId: stableUserId,
        role: "shop_owner",
        name: setupDraft.ownerName.trim() || setupDraft.shopName.trim(),
        phone: normalizedPhone,
        shopName: setupDraft.shopName.trim(),
        location: setupDraft.location.trim() || "Location pending",
        address: setupDraft.address.trim(),
        services: setupDraft.services,
        serviceCatalog,
        startingPrice: Number(setupDraft.startingPrice) || 0,
        workingHours,
        slotDuration: 30,
        maxBookingsPerSlot: 1,
        availabilitySlots,
        blockedDates: [],
        image: setupDraft.image,
        images: setupDraft.image ? [setupDraft.image] : [],
        gpsLocation: setupDraft.gpsLocation,
        createdAt: new Date().toISOString(),
        authProvider: "google",
        firebaseUid: firebaseUid || undefined,
      };

      // User stays in pending state; no local session started
      // saveShopOwner and setShopOwnerSession removed to prevent auto-login

      // Parse GPS for Convex location fields
      const gpsMatch = setupDraft.gpsLocation?.match(
        /Lat\s*(-?\d+(?:\.\d+)?),\s*Lng\s*(-?\d+(?:\.\d+)?)/i
      );
      const lat = gpsMatch ? Number(gpsMatch[1]) : 0;
      const lng = gpsMatch ? Number(gpsMatch[2]) : 0;
      const nextSlot = availabilitySlots.find((s) => s.enabled)?.time ?? "Not available";

      // Write to Convex global database so all customers can see this shop
      await upsertShop({
        ownerId: userRecord.userId,
        shopName: userRecord.shopName,
        address: userRecord.address,
        lat,
        lng,
        phone: userRecord.phone,
        image: userRecord.image,
        imageStorageId: setupDraft.imageStorageId,
        images: userRecord.images,
        services: serviceCatalog.map(s => ({
          name: s.name,
          price: s.price,
          duration: s.durationMinutes,
        })),
        startingPrice: userRecord.startingPrice,
        openTime: workingHours.start,
        closeTime: workingHours.end,
        nextSlot,
        gpsLocation: userRecord.gpsLocation,
        locationLabel: userRecord.location,
        blockedDates: [],
        username: setupDraft.username.trim(),
        password: setupDraft.password, // Send raw password so backend can bcrypt it correctly
        status: "pending",
        firebaseUid: firebaseUid || undefined,
      });

      // Show waiting message
      setErrorMessage("Your account has been submitted and is currently waiting for approval.");
      setStep("access");
    } catch (error: any) {
      setErrorMessage(formatError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-muted">
      <div className="customer-header px-4 pb-10 pt-4 safe-top">
        <button
          onClick={handleStepBack}
          className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>
        <p className="text-sm font-medium text-light-text">CUTZO Partner</p>
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
          <div className="max-h-[70dvh] overflow-y-auto rounded-[22px] bg-card p-5 card-shadow">
            <h2 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wider">Existing Users</h2>
            
            <div className="flex flex-col gap-3 mb-5">
              <input
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="Username"
                autoCapitalize="none"
                className="h-14 rounded-[16px] border border-border bg-background px-4 text-sm font-medium outline-none"
              />
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Password"
                className="h-14 rounded-[16px] border border-border bg-background px-4 text-sm font-medium outline-none"
              />
              <button
                onClick={handleCredentialsLogin}
                disabled={isLoggingIn}
                className="customer-gradient h-[52px] w-full rounded-[14px] text-base font-semibold text-white shadow-lg disabled:opacity-70"
              >
                {isLoggingIn ? "Logging in..." : "Login"}
              </button>
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Or New Setup
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ background: "hsl(var(--primary) / 0.08)" }}
              >
                <GoogleIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Sign up with Google</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Quick setup for new partners.
                </p>
              </div>
            </div>

            <button
              onClick={continueWithGoogle}
              disabled={isLoggingIn}
              className="mt-6 flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] border border-border bg-background text-base font-semibold text-foreground shadow-sm disabled:opacity-70"
            >
              {!isLoggingIn && <GoogleIcon className="h-5 w-5" />}
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
          <div className="max-h-[70dvh] overflow-y-auto rounded-[22px] bg-card p-5 card-shadow">
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
                  placeholder="Your shop's display name"
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
                  placeholder="Your full name"
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
                  placeholder="City or area"
                />
              </label>

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

                <div className="flex w-full items-center gap-3">
                  {(setupDraft.imageStorageId || setupDraft.image) && (
                    <div className="relative shrink-0 mt-3">
                      <div className="h-[60px] w-[60px] overflow-hidden rounded-[16px] border border-slate-100 shadow-sm">
                        <img
                          src={setupDraft.image || "https://img.freepik.com/free-vector/shop-with-sign-we-are-open_23-2148547718.jpg"}
                          alt="Shop"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <button
                        onClick={() => setSetupDraft((c) => ({ ...c, image: "", imageStorageId: undefined }))}
                        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-border mt-4">
                <h3 className="text-sm font-bold text-foreground mb-4 tracking-tight">Create Login Credentials</h3>
                <label className="flex flex-col gap-2 mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Username
                  </span>
                  <input
                    value={setupDraft.username || ""}
                    onChange={(event) =>
                      setSetupDraft((current) => ({ ...current, username: event.target.value.toLowerCase().trim() }))
                    }
                    autoCapitalize="none"
                    className="h-14 rounded-[16px] border border-border bg-background px-4 text-sm font-medium outline-none"
                    placeholder="Choose a unique username"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Password
                  </span>
                  <input
                    type="password"
                    value={setupDraft.password || ""}
                    onChange={(event) =>
                      setSetupDraft((current) => ({ ...current, password: event.target.value }))
                    }
                    className="h-14 rounded-[16px] border border-border bg-background px-4 text-sm font-medium outline-none"
                    placeholder="Enter a secure password"
                  />
                </label>
              </div>

              <button
                onClick={completeSetup}
                disabled={isSubmitting}
                className="customer-gradient h-[52px] w-full rounded-[14px] text-base font-semibold text-white mt-4 disabled:opacity-60"
              >
                {isSubmitting ? "Submitting..." : "Complete Setup"}
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
                All shops go through a quick manual verification before going live on the Cutzo marketplace.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
