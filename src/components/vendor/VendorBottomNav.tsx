import { Calendar, Home, LucideIcon, Scissors, Store } from "lucide-react";
import { VendorTab } from "./types";

interface Props {
  active: VendorTab;
  onTab: (tab: VendorTab) => void;
}

const tabs: { id: VendorTab; label: string; Icon: LucideIcon }[] = [
  { id: "dashboard", label: "Dashboard", Icon: Home },
  { id: "bookings", label: "Bookings", Icon: Calendar },
  { id: "services", label: "Services", Icon: Scissors },
  { id: "profile", label: "Profile", Icon: Store },
];

export default function VendorBottomNav({ active, onTab }: Props) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-border bg-card px-2"
      style={{
        maxWidth: "430px",
        margin: "0 auto",
        boxShadow: "0 -5px 20px rgba(0,0,0,0.08)",
      }}
    >
      {tabs.map(({ id, label, Icon }) => {
        const isActive = active === id;

        return (
          <button
            key={id}
            onClick={() => onTab(id)}
            className="relative flex h-full flex-1 scale-tap flex-col items-center justify-center gap-1 transition-transform"
          >
            <Icon
              className="h-5 w-5"
              style={{ color: isActive ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))" }}
            />
            <span
              className="text-[11px] font-semibold"
              style={{ color: isActive ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}
            >
              {label}
            </span>
            {isActive && (
              <div
                className="absolute left-1/2 top-0 h-0.5 w-7 -translate-x-1/2 rounded-full"
                style={{ background: "hsl(var(--accent))" }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
