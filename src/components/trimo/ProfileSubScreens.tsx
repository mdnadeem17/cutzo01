import { useMutation, useQuery } from "convex/react";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  Bell,
  Bookmark,
  ChevronRight,
  ExternalLink,
  HelpCircle,
  Info,
  MapPin,
  MessageCircle,
  Phone,
  Scissors,
  Shield,
  Tag,
  ThumbsUp,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";

// ─── Shared UI Helpers ─────────────────────────────────────────────────────

function ScreenHeader({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack: () => void }) {
  return (
    <div className="shrink-0 customer-header px-4 pb-6 pt-4 safe-top">
      <button
        onClick={onBack}
        className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 scale-tap"
      >
        <ArrowLeft className="h-5 w-5 text-white" />
      </button>
      <h1 className="text-2xl font-bold text-white animate-fade-slide-up">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-white/70 animate-fade-in-delayed">{subtitle}</p>}
    </div>
  );
}

// ─── Saved Shops Screen ────────────────────────────────────────────────────

export function SavedShopsScreen({ userId, onBack }: { userId: string; onBack: () => void }) {
  const shops = useQuery(api.profile.getSavedShops, { userId });
  const toggleSaved = useMutation(api.profile.toggleSavedShop);

  const [localShops, setLocalShops] = useState(shops);
  useEffect(() => {
    if (shops !== undefined) setLocalShops(shops);
  }, [shops]);

  const removeShop = async (shopId: any) => {
    // Optimistic UI updates
    setLocalShops((cur) => cur?.filter((s) => s._id !== shopId));
    await toggleSaved({ userId, shopId });
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-muted">
      <ScreenHeader title="Saved Shops" subtitle="Your favorite barber shops" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-20">
        {localShops === undefined ? (
          <div className="py-20 text-center text-muted-foreground animate-pulse">Loading...</div>
        ) : localShops.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            <Bookmark className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p className="font-semibold">No saved shops</p>
            <p className="mt-1 text-xs">Shops you bookmark will appear here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {localShops.map((shop) => (
              <div key={shop._id} className="flex gap-3 overflow-hidden rounded-[18px] bg-card p-3 card-shadow relative">
                <img
                  src={shop.image || "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=200&q=80"}
                  alt={shop.shopName}
                  className="h-20 w-20 shrink-0 rounded-[12px] object-cover"
                />
                <div className="flex-1 min-w-0 py-1">
                  <h3 className="truncate font-bold text-foreground">{shop.shopName}</h3>
                  <div className="mt-1 flex items-center gap-1 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <p className="truncate text-xs font-medium">{shop.address}</p>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="flex items-center gap-1 rounded-[6px] bg-orange-100 px-1.5 py-0.5 text-[11px] font-bold text-orange-700">
                      ★ {shop.rating}
                    </span>
                    <span className="text-[11px] font-semibold text-muted-foreground border-l border-border pl-2">
                      ₹{shop.startingPrice} onwards
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => removeShop(shop._id)}
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground scale-tap"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Offers Screen ─────────────────────────────────────────────────────────

export function OffersScreen({ city, onBack }: { city: string; onBack: () => void }) {
  const offers = useQuery(api.profile.getActiveOffers, { city });
  
  // Dev only: to show something if none exist
  const seed = useMutation(api.profile.seedOffers);
  useEffect(() => { seed(); }, []);

  return (
    <div className="flex h-[100dvh] flex-col bg-muted">
      <ScreenHeader title="Offers & Coupons" subtitle={`Deals in ${city}`} onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-20">
        {offers === undefined ? (
          <div className="py-20 text-center text-muted-foreground animate-pulse">Loading...</div>
        ) : offers.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            <Tag className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p className="font-semibold">No active offers</p>
            <p className="mt-1 text-xs">Check back later for exciting deals.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {offers.map((offer) => {
              const expires = new Date(offer.expiryDate);
              const isClosing = expires.getTime() - Date.now() < 24 * 60 * 60 * 1000;
              return (
                <div key={offer._id} className="relative overflow-hidden rounded-[18px] bg-card p-5 card-shadow">
                  {/* Decorative background circle */}
                  <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/5" />
                  
                  <div className="relative z-10">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="inline-block rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                          {offer.city} Offer
                        </span>
                        <h3 className="mt-2 text-xl font-extrabold text-foreground">{offer.discount}</h3>
                        <p className="mt-0.5 text-sm font-semibold text-muted-foreground">{offer.title}</p>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                        <Tag className="h-5 w-5 text-accent" />
                      </div>
                    </div>
                    
                    <div className="mt-5 flex items-center justify-between border-t border-dashed border-border pt-4">
                      <p className={`text-xs font-bold ${isClosing ? "text-destructive" : "text-muted-foreground"}`}>
                        Expires {format(expires, "MMM do, yyyy")}
                      </p>
                      <button className="rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-white scale-tap">
                        Copy Code
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Personal Info Screen ──────────────────────────────────────────────────

export function PersonalInfoScreen({ userId, onBack }: { userId: string; onBack: () => void }) {
  const customerList = useQuery(api.customers.getCustomerByFirebaseUid, { firebaseUid: userId });
  // Note: we can map customer uid to customer table format. The earlier app version used CustomerRecord in local storage.
  // We'll trust local storage user object if convex fails, but display what Convex returns.
  
  if (customerList === undefined) {
    return (
      <div className="flex h-[100dvh] flex-col bg-muted">
        <ScreenHeader title="Personal Info" onBack={onBack} />
        <div className="py-20 text-center animate-pulse">Loading...</div>
      </div>
    );
  }

  const c = customerList;

  return (
    <div className="flex h-[100dvh] flex-col bg-muted">
      <ScreenHeader title="Personal Info" subtitle="Your account details" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-20">
        
        <div className="overflow-hidden rounded-[18px] bg-card card-shadow mb-6">
          <div className="border-b border-border p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Full Name</p>
            <p className="mt-1 text-base font-semibold text-foreground">{c?.name || "Not provided"}</p>
          </div>
          <div className="border-b border-border p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Phone Number</p>
            <p className="mt-1 text-base font-semibold text-foreground">{c?.phone || "Not provided"}</p>
          </div>
          <div className="p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Email</p>
            <p className="mt-1 text-base font-semibold text-foreground">{c?.email || "Not provided"}</p>
          </div>
        </div>

        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Location Settings</p>
        <div className="overflow-hidden rounded-[18px] bg-card card-shadow">
          <div className="flex items-center justify-between border-b border-border p-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Current City</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{c?.location || "Unknown"}</p>
            </div>
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-semibold text-foreground">GPS Permission</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Used for showing nearby shops</p>
            </div>
            <div className="rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-green-700">
              Allowed
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}

// ─── Notifications Screen ──────────────────────────────────────────────────

export function NotificationsScreen({ userId, onBack }: { userId: string; onBack: () => void }) {
  const notifications = useQuery(api.profile.getUserNotifications, { userId });
  const seed = useMutation(api.profile.seedNotifications);
  
  useEffect(() => { seed({ userId }); }, [userId, seed]);

  return (
    <div className="flex h-[100dvh] flex-col bg-muted">
      <ScreenHeader title="Notifications" subtitle="Updates and alerts" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-20">
        {notifications === undefined ? (
          <div className="py-20 text-center animate-pulse">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            <Bell className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p className="font-semibold">No notifications yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {notifications.map((n) => (
              <div key={n._id} className={`flex gap-3 rounded-[18px] p-4 card-shadow ${n.isRead ? "bg-card" : "bg-primary/5"}`}>
                <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${n.isRead ? "bg-muted text-muted-foreground" : "bg-primary text-white"}`}>
                  <Bell className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className={`text-sm font-bold ${n.isRead ? "text-foreground" : "text-primary"}`}>{n.title}</h3>
                    <span className="shrink-0 text-[10px] font-semibold text-muted-foreground">
                      {formatDistanceToNow(n.createdAt, { addSuffix: true })}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{n.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Static Policy Screens ─────────────────────────────────────────────────

export function PrivacyScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex h-[100dvh] flex-col bg-muted">
      <ScreenHeader title="Privacy & Security" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-20">
        <div className="rounded-[18px] bg-card p-5 card-shadow">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <h2 className="mb-2 text-lg font-bold text-foreground">Data Privacy</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            TRIMO protects your personal information using industry-standard encryption. 
            We do not share your phone number or booking history with third parties without your explicit consent.
          </p>
          
          <h2 className="mb-2 text-lg font-bold text-foreground">Account Security</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your account is secured via OTP authentication and Clerk secure tokens. 
            If you notice any suspicious activity, please contact support immediately.
          </p>
        </div>
      </div>
    </div>
  );
}

export function HelpScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex h-[100dvh] flex-col bg-muted">
      <ScreenHeader title="Help Center" subtitle="We're here for you" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-20">
        <div className="flex flex-col gap-3">
          <button className="flex items-center justify-between rounded-[16px] bg-card p-4 card-shadow scale-tap">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <MessageCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-foreground">WhatsApp Support</p>
                <p className="text-xs text-muted-foreground">Avg. response: 5 mins</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
          
          <button className="flex items-center justify-between rounded-[16px] bg-card p-4 card-shadow scale-tap">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <Phone className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-foreground">Call Us</p>
                <p className="text-xs text-muted-foreground">9 AM to 9 PM daily</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AboutScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex h-[100dvh] flex-col bg-muted">
      <ScreenHeader title="About TRIMO" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-4 pt-6 pb-20 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-[24px] bg-primary card-shadow">
          <Scissors className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-2xl font-extrabold text-foreground">TRIMO</h2>
        <p className="text-sm font-medium text-muted-foreground">Booking Hub</p>
        <p className="mt-2 text-xs font-bold uppercase tracking-widest text-primary">Version 1.0.0</p>
        
        <div className="mx-auto mt-8 max-w-xs text-sm text-muted-foreground leading-relaxed">
          TRIMO simplifies barber shop bookings. Our mission is to connect customers with the best grooming professionals seamlessly.
        </div>
        
        <div className="mt-10 flex flex-col gap-2">
          <button className="text-sm font-semibold text-primary scale-tap">Terms & Conditions</button>
          <button className="text-sm font-semibold text-primary scale-tap">Privacy Policy</button>
        </div>
      </div>
    </div>
  );
}
