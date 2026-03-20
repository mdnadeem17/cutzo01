import { ArrowLeft, Chrome, ImageIcon, Locate, MapPin, Phone, Store } from "lucide-react";
import { ChangeEvent, useState } from "react";
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

type AuthStep = "access" | "otp" | "setup";

interface SetupDraft {
  shopName: string;
  ownerName: string;
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
  const [phoneInput, setPhoneInput] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [setupDraft, setSetupDraft] = useState<SetupDraft>(createDraft());
  const [errorMessage, setErrorMessage] = useState("");
  const [isLocating, setIsLocating] = useState(false);

  const handleStepBack = () => {
    if (step === "access") {
      onBack();
      return;
    }

    if (step === "otp") {
      setStep("access");
      return;
    }

    setStep(setupDraft.authProvider === "google" ? "access" : "otp");
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

    const existingUser = findShopOwnerByPhone(setupDraft.phone);

    if (existingUser) {
      setShopOwnerSession(existingUser.userId);
      onAuthenticated(existingUser);
      return;
    }

    setErrorMessage("");
    setStep("setup");
  };

  const continueWithGoogle = () => {
    const googlePhone = "+919000010001";
    const existingUser = findShopOwnerByPhone(googlePhone);

    if (existingUser) {
      setShopOwnerSession(existingUser.userId);
      onAuthenticated(existingUser);
      return;
    }

    setSetupDraft(
      createDraft({
        ownerName: "",
        phone: googlePhone,
        authProvider: "google",
      })
    );
    setErrorMessage("");
    setStep("setup");
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

  const completeSetup = () => {
    if (!setupDraft.shopName.trim()) {
      setErrorMessage("Shop name is required to complete setup.");
      return;
    }

    const userRecord: ShopOwnerRecord = {
      userId: `owner-${Date.now()}`,
      role: "shop_owner",
      name: setupDraft.ownerName.trim() || setupDraft.shopName.trim(),
      phone: setupDraft.phone,
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
      authProvider: setupDraft.authProvider,
    };

    saveShopOwner(userRecord);
    setShopOwnerSession(userRecord.userId);
    onAuthenticated(userRecord);
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
            : "Use your phone or Google to access the barber shop dashboard."}
        </p>
      </div>

      <div className="-mt-5 flex flex-1 flex-col gap-4 px-4 pb-8">
        {(step === "access" || step === "otp") && (
          <div className="rounded-[22px] bg-card p-5 card-shadow">
            {step === "access" ? (
              <>
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl"
                    style={{ background: "hsl(var(--primary) / 0.08)" }}
                  >
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Continue with Phone Number</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Verify with OTP, then finish shop setup only if you are new.
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-3">
                  <label className="flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Phone number
                    </span>
                    <div className="flex h-14 items-center rounded-[16px] border border-border bg-background px-4">
                      <span className="text-sm font-semibold text-foreground">+91</span>
                      <input
                        value={phoneInput}
                        onChange={(event) => setPhoneInput(formatPhoneForInput(event.target.value))}
                        className="ml-3 flex-1 bg-transparent text-sm font-medium outline-none"
                        placeholder="Enter the number"
                      />
                    </div>
                  </label>

                  <button
                    onClick={sendOtp}
                    className="gradient-btn h-[52px] rounded-[14px] text-base font-semibold text-white"
                  >
                    Continue with Phone Number
                  </button>
                </div>

                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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

                <div className="mt-4 rounded-[16px] bg-muted px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                  Owner account details stay on this device until a live backend is connected.
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl"
                    style={{ background: "hsl(var(--accent) / 0.12)" }}
                  >
                    <Store className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Verify OTP</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      We sent a 6-digit code to {setupDraft.phone}.
                    </p>
                  </div>
                </div>

                <label className="mt-4 flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Enter OTP
                  </span>
                  <input
                    value={otpValue}
                    onChange={(event) => setOtpValue(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="h-14 rounded-[16px] border border-border bg-background px-4 text-center text-xl font-bold tracking-[0.35em] outline-none"
                    placeholder="000000"
                  />
                </label>

                <button
                  onClick={completePhoneLogin}
                  className="gradient-btn mt-5 h-[52px] w-full rounded-[14px] text-base font-semibold text-white"
                >
                  Verify OTP
                </button>
              </>
            )}
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
                  Phone Number
                </span>
                <input
                  value={setupDraft.phone}
                  disabled
                  className="h-14 rounded-[16px] border border-border bg-muted px-4 text-sm font-semibold text-foreground outline-none"
                />
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
                className="gradient-btn h-[52px] w-full rounded-[14px] text-base font-semibold text-white"
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
              <MapPin className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Stored locally for now</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Owner accounts are saved in a local TRIMO database shape with `users[userId]` records, then routed into the vendor dashboard after verification.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
