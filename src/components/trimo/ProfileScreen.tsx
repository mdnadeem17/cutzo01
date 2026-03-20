import {
  Bell,
  Bookmark,
  ChevronRight,
  HelpCircle,
  Info,
  LogOut,
  MapPin,
  Scissors,
  Shield,
  Tag,
  User,
} from "lucide-react";
import { CustomerRecord } from "./types";

interface Props {
  user: CustomerRecord;
  onOpenHowItWorks: () => void;
  onLogout: () => void;
}

export default function ProfileScreen({ user, onOpenHowItWorks, onLogout }: Props) {
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
        { icon: Scissors, label: "My Bookings", sub: "Track your upcoming and past appointments" },
        { icon: Bookmark, label: "Saved Shops", sub: "Quick access to your favorite barber shops" },
        { icon: Tag, label: "Offers & Coupons", sub: "See active TRIMO deals near you" },
      ],
    },
    {
      title: "Settings",
      items: [
        { icon: User, label: "Personal Info", sub: user.location },
        { icon: Bell, label: "Notifications", sub: "Manage updates and reminders" },
        { icon: Shield, label: "Privacy & Security", sub: "Control your account access" },
      ],
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-muted pb-24">
      <div className="brand-gradient px-4 pb-10 pt-12">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-white/50 bg-white/30 shadow-lg">
            <span className="text-2xl font-bold text-white">{initials}</span>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-white">{user.name}</h2>
            <p className="text-sm text-light-text">{user.phone}</p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-accent" />
              <p className="text-xs text-light-text">{user.location}</p>
            </div>
          </div>
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
            <ChevronRight className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>

      <div className="-mt-5 px-4">
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

      <div className="flex flex-col gap-4 px-4 pt-4">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {section.title}
            </p>
            <div className="overflow-hidden rounded-[16px] bg-card card-shadow">
              {section.items.map(({ icon: Icon, label, sub }) => (
                <button
                  key={label}
                  className="flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left last:border-0 scale-tap transition-transform"
                >
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-xl"
                    style={{ background: "hsl(var(--primary)/0.08)" }}
                  >
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        ))}

        <div>
          <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Support
          </p>
          <div className="overflow-hidden rounded-[16px] bg-card card-shadow">
            {[
              { icon: HelpCircle, label: "Help Center", sub: "", action: undefined },
              { icon: Info, label: "About TRIMO", sub: "v1.0.0", action: undefined },
              { icon: MapPin, label: "How it Works", sub: "", action: onOpenHowItWorks },
            ].map(({ icon: Icon, label, sub, action }) => (
              <button
                key={label}
                onClick={action}
                className="flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left last:border-0 scale-tap transition-transform"
              >
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ background: "hsl(var(--primary)/0.08)" }}
                >
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onLogout}
          className="flex w-full items-center justify-between rounded-[16px] bg-card p-4 card-shadow scale-tap transition-transform"
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: "hsl(var(--destructive)/0.1)" }}
            >
              <LogOut className="h-4 w-4 text-destructive" />
            </div>
            <p className="text-sm font-medium text-destructive">Log Out</p>
          </div>
          <ChevronRight className="h-4 w-4 text-destructive/50" />
        </button>

        <p className="pb-2 text-center text-xs text-muted-foreground">TRIMO v1.0.0 / Made in India</p>
      </div>
    </div>
  );
}
