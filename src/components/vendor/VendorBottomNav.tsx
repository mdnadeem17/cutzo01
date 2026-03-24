import { Calendar, Home, LucideIcon, Scissors, User } from "lucide-react";
import { VendorTab } from "./types";

interface Props {
  active: VendorTab;
  onTab: (tab: VendorTab) => void;
}

const tabs: { id: VendorTab; label: string; Icon: LucideIcon }[] = [
  { id: "dashboard", label: "Dashboard", Icon: Home },
  { id: "bookings", label: "Bookings", Icon: Calendar },
  { id: "services", label: "Services", Icon: Scissors },
  { id: "profile", label: "Profile", Icon: User },
];

export default function VendorBottomNav({ active, onTab }: Props) {
  return (
    <nav
      className="fixed bottom-[12px] left-[12px] right-[12px] h-[65px] z-[60] rounded-[22px] bg-white pointer-events-auto transition-shadow"
      style={{
        boxShadow: "0 8px 30px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)",
      }}
    >
      <div className="flex h-full w-full items-center justify-around px-2">
        {tabs.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onTab(id)}
              className="group flex-1 flex flex-col items-center justify-center h-full relative scale-tap duration-200 ease-in-out touch-manipulation"
            >
              <div
                className={`relative flex items-center justify-center rounded-full transition-all duration-300 ease-in-out ${
                  isActive
                    ? "w-12 h-12 -translate-y-3 bg-gradient-to-br from-[#0c1e3e] to-[#044f6f] shadow-[0_8px_16px_rgba(4,79,111,0.35)]"
                    : "w-10 h-10 mt-2"
                }`}
              >
                <Icon
                  className={`transition-colors duration-300 ${isActive ? "w-[22px] h-[22px] text-white" : "w-5 h-5 text-muted-foreground"}`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </div>

              <span
                className={`absolute bottom-1.5 text-[10px] font-bold tracking-wide transition-all duration-300 ease-in-out ${
                  isActive ? "opacity-100 text-[#0c1e3e] translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
