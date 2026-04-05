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
  termsAccepted?: boolean;
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
  termsAccepted: false,
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
        // Attempt to clear any stuck state before signing in
        try {
          await FirebaseAuthentication.signOut();
        } catch (e) {
          // ignore signout errors
        }

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
        const errMsg = formatError(error);
        if (errMsg.includes("No credentials available")) {
          setErrorMessage("Google Sign-In is temporarily blocked due to multiple cancelled attempts, or no Google account is found on this device. Please wait a moment or add an account in your device settings.");
        } else {
          setErrorMessage(errMsg);
        }
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

      if (!setupDraft.termsAccepted) {
        setErrorMessage("You must agree to the Terms of Service & Privacy Policy to continue.");
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
      <div className="customer-header px-4 pb-8 pt-2 safe-top relative overflow-hidden">
        {/* Decorative background shapes */}
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl animate-float-glow" />
        <div className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-white/10 blur-2xl flex" />
        
        <div className="relative z-10 flex items-center justify-between animate-fade-slide-up">
          <button
            onClick={handleStepBack}
            className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 scale-tap backdrop-blur-md border border-white/10"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>
          
          <div className="flex items-center gap-1.5 mb-3 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/5">
            <Store className="h-3.5 w-3.5 text-white" />
            <p className="text-[11px] font-bold tracking-wider text-white uppercase">CUTZO Partner</p>
          </div>
        </div>

        <div className="relative z-10 animate-fade-in-delayed">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            {step === "setup" ? "Set up your shop" : "Owner login"}
          </h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-white/80 max-w-[280px]">
            {step === "setup"
              ? "Complete a quick setup so customers can discover and book your barber shop."
              : "Use your Google account to access the barber shop dashboard."}
          </p>
        </div>
      </div>

      <div className="-mt-5 flex flex-1 flex-col gap-4 px-4 pb-8 z-20 relative">
        {step === "access" && (
          <div className="max-h-[75dvh] overflow-y-auto rounded-[24px] bg-card p-6 card-shadow border border-border/50 animate-fade-slide-up scrollbar-hide">
            <h2 className="text-xs font-bold text-foreground/80 mb-5 uppercase tracking-widest flex items-center gap-2">
              <span className="h-px flex-1 bg-gradient-to-r from-transparent to-border"></span>
              Existing Users
              <span className="h-px flex-1 bg-gradient-to-l from-transparent to-border"></span>
            </h2>
            
            <div className="flex flex-col gap-3.5 mb-6 group">
              <div className="relative">
                <input
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="Username"
                  autoCapitalize="none"
                  className="h-14 w-full rounded-[16px] border border-border/70 bg-background/50 px-4 text-sm font-medium outline-none transition-all focus:border-primary/50 focus:bg-background focus:ring-2 focus:ring-primary/10"
                />
              </div>
              <div className="relative">
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Password"
                  className="h-14 w-full rounded-[16px] border border-border/70 bg-background/50 px-4 text-sm font-medium outline-none transition-all focus:border-primary/50 focus:bg-background focus:ring-2 focus:ring-primary/10"
                />
              </div>
              <button
                onClick={handleCredentialsLogin}
                disabled={isLoggingIn}
                className="customer-gradient scale-tap mt-2 h-[54px] w-full rounded-[16px] text-[15px] font-bold text-white shadow-[0_8px_20px_rgba(143,0,255,0.25)] transition-all disabled:opacity-70 disabled:scale-100"
              >
                {isLoggingIn ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <span>Logging in...</span>
                  </div>
                ) : "Login"}
              </button>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-border" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Or New Setup
              </span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-border" />
            </div>

            <button
              onClick={continueWithGoogle}
              disabled={isLoggingIn}
              className="group relative flex h-[68px] w-full scale-tap items-center overflow-hidden rounded-[20px] border border-border/80 bg-background/50 p-3 shadow-sm transition-all focus:outline-none disabled:opacity-70 disabled:scale-100"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              
              <div className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm border border-slate-100">
                <GoogleIcon className="h-5 w-5" />
              </div>
              
              <div className="relative z-10 ml-4 flex flex-col items-start justify-center">
                <span className="text-[15px] font-bold text-foreground">Sign up with Google</span>
                <span className="text-[12px] font-medium text-muted-foreground">Quick setup for new partners.</span>
              </div>
            </button>

            <button
              onClick={continueWithGoogle}
              disabled={isLoggingIn}
              className="mt-4 group relative flex h-[54px] w-full scale-tap items-center justify-center gap-3 overflow-hidden rounded-[16px] border border-border/80 bg-background hover:bg-slate-50 transition-all font-semibold text-foreground disabled:opacity-70 disabled:scale-100"
            >
              {!isLoggingIn && <GoogleIcon className="h-[18px] w-[18px]" />}
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
          <div className="max-h-[75dvh] overflow-y-auto rounded-[24px] bg-card p-6 card-shadow border border-border/50 animate-fade-slide-up scrollbar-hide">
            <div className="space-y-5">
              <label className="flex flex-col gap-2 group">
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70 group-focus-within:text-primary transition-colors">
                  Shop Name
                </span>
                <input
                  value={setupDraft.shopName}
                  onChange={(event) =>
                    setSetupDraft((current) => ({ ...current, shopName: event.target.value }))
                  }
                  className="h-14 rounded-[16px] border border-border/70 bg-background/50 px-4 text-sm font-medium outline-none transition-all focus:border-primary/50 focus:bg-background focus:ring-2 focus:ring-primary/10"
                  placeholder="Your shop's display name"
                />
              </label>

              <label className="flex flex-col gap-2 group">
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70 group-focus-within:text-primary transition-colors">
                  Owner Name
                </span>
                <input
                  value={setupDraft.ownerName}
                  onChange={(event) =>
                    setSetupDraft((current) => ({ ...current, ownerName: event.target.value }))
                  }
                  className="h-14 rounded-[16px] border border-border/70 bg-background/50 px-4 text-sm font-medium outline-none transition-all focus:border-primary/50 focus:bg-background focus:ring-2 focus:ring-primary/10"
                  placeholder="Your full name"
                />
              </label>

              <label className="flex flex-col gap-2 group">
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70 group-focus-within:text-primary transition-colors">
                  Phone Number (Required)
                </span>
                <div className="flex h-14 items-center rounded-[16px] border border-border/70 bg-background/50 px-4 transition-all focus-within:border-primary/50 focus-within:bg-background focus-within:ring-2 focus-within:ring-primary/10">
                  <span className="text-sm font-bold text-foreground/80">+91</span>
                  <div className="ml-3 h-6 w-px bg-border/80"></div>
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
                    type="tel"
                  />
                </div>
              </label>

              <label className="flex flex-col gap-2 group">
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70 group-focus-within:text-primary transition-colors">
                  Shop Location
                </span>
                <input
                  value={setupDraft.location}
                  onChange={(event) =>
                    setSetupDraft((current) => ({ ...current, location: event.target.value }))
                  }
                  className="h-14 rounded-[16px] border border-border/70 bg-background/50 px-4 text-sm font-medium outline-none transition-all focus:border-primary/50 focus:bg-background focus:ring-2 focus:ring-primary/10"
                  placeholder="City or area"
                />
              </label>

              <label className="flex flex-col gap-2 group">
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70 group-focus-within:text-primary transition-colors">
                  Address
                </span>
                <textarea
                  value={setupDraft.address}
                  onChange={(event) =>
                    setSetupDraft((current) => ({ ...current, address: event.target.value }))
                  }
                  className="min-h-[110px] rounded-[16px] border border-border/70 bg-background/50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-primary/50 focus:bg-background focus:ring-2 focus:ring-primary/10 resize-none"
                  placeholder="Full shop address"
                />
              </label>



              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-2 group">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70 group-focus-within:text-primary transition-colors">
                    Opening Time
                  </span>
                  <select
                    value={setupDraft.startHour}
                    onChange={(event) =>
                      setSetupDraft((current) => ({ ...current, startHour: event.target.value }))
                    }
                    className="h-14 rounded-[16px] border border-border/70 bg-background/50 px-4 text-sm font-semibold outline-none transition-all focus:border-primary/50 focus:bg-background focus:ring-2 focus:ring-primary/10"
                  >
                    {hourOptions.map((option) => (
                      <option key={option} value={option}>
                        {formatHourLabel(option)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2 group">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70 group-focus-within:text-primary transition-colors">
                    Closing Time
                  </span>
                  <select
                    value={setupDraft.endHour}
                    onChange={(event) =>
                      setSetupDraft((current) => ({ ...current, endHour: event.target.value }))
                    }
                    className="h-14 rounded-[16px] border border-border/70 bg-background/50 px-4 text-sm font-semibold outline-none transition-all focus:border-primary/50 focus:bg-background focus:ring-2 focus:ring-primary/10"
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
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-2 block">
                  Shop Image
                </span>
                <label className="mt-1 flex cursor-pointer scale-tap flex-col items-center justify-center rounded-[20px] border-2 border-dashed border-border/80 bg-background/40 hover:bg-background/80 transition-all px-4 py-6 text-center group">
                  <div className="rounded-full bg-primary/10 p-3 mb-3 group-hover:scale-110 transition-transform">
                    <ImageIcon className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm font-bold text-foreground">Upload Shop Photo</p>
                  <p className="mt-1.5 text-xs font-medium text-muted-foreground/80">JPG, PNG up to 5MB (Optional)</p>
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

              <div className="pt-6 border-t border-border/60 mt-6">
                <div className="flex items-center gap-2 mb-5 divide-x divide-transparent">
                  <div className="h-8 w-1 rounded-full bg-primary" />
                  <h3 className="text-[15px] font-bold text-foreground tracking-tight">Create Login Credentials</h3>
                </div>
                
                <label className="flex flex-col gap-2 mb-4 group">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70 group-focus-within:text-primary transition-colors">
                    Username
                  </span>
                  <input
                     value={setupDraft.username || ""}
                    onChange={(event) =>
                      setSetupDraft((current) => ({ ...current, username: event.target.value.toLowerCase().trim() }))
                    }
                    autoCapitalize="none"
                    className="h-14 rounded-[16px] border border-border/70 bg-background/50 px-4 text-sm font-medium outline-none transition-all focus:border-primary/50 focus:bg-background focus:ring-2 focus:ring-primary/10"
                    placeholder="Choose a unique username"
                  />
                </label>

                <label className="flex flex-col gap-2 group">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70 group-focus-within:text-primary transition-colors">
                    Password
                  </span>
                  <input
                    type="password"
                    value={setupDraft.password || ""}
                    onChange={(event) =>
                      setSetupDraft((current) => ({ ...current, password: event.target.value }))
                    }
                    className="h-14 rounded-[16px] border border-border/70 bg-background/50 px-4 text-sm font-medium outline-none transition-all focus:border-primary/50 focus:bg-background focus:ring-2 focus:ring-primary/10"
                    placeholder="Enter a secure password"
                  />
                </label>
              </div>

              <label className="flex items-start gap-3 mt-4 mb-2">
                <input
                  type="checkbox"
                  checked={setupDraft.termsAccepted}
                  onChange={(e) =>
                    setSetupDraft((current) => ({
                      ...current,
                      termsAccepted: e.target.checked,
                    }))
                  }
                  className="mt-1 h-5 w-5 rounded border-border accent-primary outline-none"
                />
                <span className="text-xs font-medium text-muted-foreground leading-snug">
                  I agree to the <a href="#" className="font-bold text-foreground hover:underline">Terms of Service</a> & <a href="#" className="font-bold text-foreground hover:underline">Privacy Policy</a>
                </span>
              </label>

              <button
                onClick={completeSetup}
                disabled={isSubmitting}
                className="customer-gradient scale-tap h-[56px] w-full items-center justify-center rounded-[16px] text-[16px] font-bold text-white shadow-[0_8px_20px_rgba(143,0,255,0.25)] mt-4 disabled:opacity-60 transition-all disabled:scale-100 flex gap-2"
              >
                {isSubmitting && <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                {isSubmitting ? "Setting up..." : "Complete Setup"}
              </button>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="rounded-[16px] border border-destructive/20 bg-destructive/10 px-4 py-3.5 text-[13px] font-semibold text-destructive animate-fade-slide-up shadow-sm">
            <div className="flex items-start gap-2">
              <div className="mt-0.5 shrink-0 rounded-full bg-destructive/20 p-1">
                <X className="h-3 w-3" />
              </div>
              <p>{errorMessage}</p>
            </div>
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
