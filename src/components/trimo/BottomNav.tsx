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
    <nav className="fixed left-[12px] right-[12px] h-[65px] z-[60] rounded-[22px] bg-white pointer-events-auto transition-shadow"
      style={{
        bottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
        boxShadow: "0 8px 30px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)",
      }}
    >
      <div className="flex h-full w-full items-center justify-around px-2">
        {TABS.map(({ id, label, Icon }) => {
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
                    ? "w-12 h-12 -translate-y-3 customer-gradient shadow-[0_8px_16px_rgba(143,0,255,0.35)]" 
                    : "w-10 h-10 mt-2"
                }`}
              >
                <Icon
                  className={`transition-colors duration-300 ${isActive ? "w-[22px] h-[22px] text-white" : "w-5 h-5 text-muted-foreground"}`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {id === "activity" && bookingCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 flex min-w-[16px] h-[16px] items-center justify-center rounded-full border-2 border-white text-[9px] font-bold text-white shadow-sm"
                    style={{ background: "hsl(var(--destructive))" }}
                  >
                    {bookingCount}
                  </span>
                )}
              </div>
              
              <span 
                className={`absolute bottom-1.5 text-[10px] font-bold tracking-wide transition-all duration-300 ease-in-out ${
                  isActive ? "opacity-100 text-primary translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
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
