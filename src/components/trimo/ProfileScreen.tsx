import {
  Bookmark,
  ChevronRight,
  HelpCircle,
  Info,
  LogOut,
  MapPin,
  Shield,
  Tag,
} from "lucide-react";
import { CustomerRecord, Screen } from "./types";

interface Props {
  user: CustomerRecord;
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
}

export default function ProfileScreen({ user, onNavigate, onLogout }: Props) {
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const joinedLabel = new Date(user.createdAt).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });

  const sections = [
    {
      title: "My Account",
      items: [
        { icon: Bookmark, label: "Saved Shops", sub: "Quick access to your favorite barber shops", screen: "savedShops" as Screen },
        { icon: Tag, label: "Offers & Coupons", sub: "See active TRIMO deals near you", screen: "offers" as Screen },
      ],
    },
    {
      title: "Settings",
      items: [
        { icon: Shield, label: "Privacy & Security", sub: "Control your account access", screen: "privacy" as Screen },
      ],
    },
    {
      title: "Support",
      items: [
        { icon: HelpCircle, label: "Help Center", sub: "", screen: "help" as Screen },
        { icon: Info, label: "About TRIMO", sub: "v1.0.0", screen: "about" as Screen },
        { icon: MapPin, label: "How it Works", sub: "", screen: "howItWorks" as Screen },
      ],
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-muted pb-24">
      <div className="customer-header px-4 pb-10 pt-4 safe-top">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-white/50 bg-white/30 shadow-lg animate-scale-in">
            <span className="text-2xl font-bold text-white">{initials}</span>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-white animate-fade-slide-up">{user.name}</h2>
            <p className="text-sm text-light-text animate-fade-in-delayed">{user.phone}</p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-accent" />
              <p className="text-xs text-light-text">{user.location}</p>
            </div>
          </div>
          <button
            onClick={() => onNavigate("personalInfo")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 scale-tap"
          >
            <ChevronRight className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>

      <div className="-mt-5 px-4 mb-4">
        <div className="flex items-center justify-around rounded-[16px] bg-card p-4 card-shadow">
          {[
            { val: "Customer", label: "Account Type" },
            { val: user.location, label: "Location" },
            { val: joinedLabel, label: "Member Since" },
          ].map(({ val, label }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <p className="text-center text-sm font-bold text-primary">{val}</p>
              <p className="text-center text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 px-4 pt-2">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {section.title}
            </p>
            <div className="overflow-hidden rounded-[16px] bg-card card-shadow">
              {section.items.map(({ icon: Icon, label, sub, screen }) => (
                <button
                  key={label}
                  onClick={() => onNavigate(screen)}
                  className="flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left last:border-0 scale-tap transition-transform active:scale-[0.98]"
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]"
                    style={{ background: "hsl(var(--primary)/0.08)" }}
                  >
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{label}</p>
                    {sub && <p className="text-xs font-medium text-muted-foreground truncate">{sub}</p>}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ))}

        <button
          onClick={onLogout}
          className="flex w-full items-center justify-between rounded-[16px] bg-card p-4 card-shadow scale-tap transition-transform active:scale-[0.98] mt-2"
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]"
              style={{ background: "hsl(var(--destructive)/0.1)" }}
            >
              <LogOut className="h-5 w-5 text-destructive" />
            </div>
            <p className="text-sm font-semibold text-destructive">Log Out</p>
          </div>
          <ChevronRight className="h-4 w-4 text-destructive/50 shrink-0" />
        </button>

        <p className="pb-2 pt-4 text-center text-xs font-medium text-muted-foreground">
          TRIMO v1.0.0 / Made in India
        </p>
      </div>
    </div>
  );
}
