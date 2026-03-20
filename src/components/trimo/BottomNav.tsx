import { Home, Calendar, Clock, User } from "lucide-react";

type Tab = "home" | "activity" | "profile";

interface Props {
  active: Tab;
  onTab: (t: Tab) => void;
  bookingCount?: number;
}

const TABS: { id: Tab; label: string; Icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }[] = [
  { id: "home", label: "Home", Icon: Home },
  { id: "activity", label: "Bookings", Icon: Calendar },
  { id: "profile", label: "Profile", Icon: User },
];

export default function BottomNav({ active, onTab, bookingCount = 0 }: Props) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-card border-t border-border flex items-center justify-around px-2 h-16 z-40"
      style={{
        maxWidth: "430px",
        margin: "0 auto",
        boxShadow: "0 -5px 20px rgba(0,0,0,0.08)",
      }}
    >
      {TABS.map(({ id, label, Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => onTab(id)}
            className="flex-1 flex flex-col items-center justify-center gap-1 h-full relative scale-tap transition-transform"
          >
            <div className="relative">
              <Icon
                className="w-5 h-5"
                style={{ color: isActive ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))" }}
              />
              {id === "activity" && bookingCount > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] rounded-full text-[9px] font-bold text-white flex items-center justify-center px-0.5"
                  style={{ background: "hsl(var(--destructive))" }}
                >
                  {bookingCount}
                </span>
              )}
            </div>
            <span
              className="text-[11px] font-semibold"
              style={{ color: isActive ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}
            >
              {label}
            </span>
            {isActive && (
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
                style={{ background: "hsl(var(--accent))" }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
