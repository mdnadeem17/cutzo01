import { Home, Calendar, User } from "lucide-react";
import { motion } from "framer-motion";

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
      className="fixed left-[12px] right-[12px] h-[65px] z-[60] rounded-[22px] bg-white pointer-events-auto"
      style={{
        bottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
        boxShadow: "0 4px 20px rgba(0,0,0,0.10), 0 1px 6px rgba(0,0,0,0.05)",
        // Own compositor layer — isolate from page repaints
        transform: "translateZ(0)",
        willChange: "transform",
      }}
    >
      <div className="flex h-full w-full items-center justify-around px-2">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <motion.button
              key={id}
              onClick={() => onTab(id)}
              // Framer-motion tap: physical spring, no CSS transition conflict
              whileTap={{ scale: 0.88 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="group flex-1 flex flex-col items-center justify-center h-full relative"
              style={{ WebkitTapHighlightColor: "transparent", outline: "none" }}
            >
              <motion.div
                className={`relative flex items-center justify-center rounded-full ${
                  isActive
                    ? "w-12 h-12 customer-gradient shadow-[0_6px_14px_rgba(143,0,255,0.3)]"
                    : "w-10 h-10 mt-2"
                }`}
                animate={{
                  y: isActive ? -12 : 0,
                  scale: isActive ? 1 : 1,
                }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
              >
                <Icon
                  className={`transition-colors duration-200 ${isActive ? "w-[22px] h-[22px] text-white" : "w-5 h-5 text-muted-foreground"}`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {id === "activity" && bookingCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 600, damping: 20 }}
                    className="absolute -top-1 -right-1 flex min-w-[16px] h-[16px] items-center justify-center rounded-full border-2 border-white text-[9px] font-bold text-white shadow-sm"
                    style={{ background: "hsl(var(--destructive))" }}
                  >
                    {bookingCount}
                  </motion.span>
                )}
              </motion.div>

              <motion.span
                className="absolute bottom-1.5 text-[10px] font-bold tracking-wide text-primary"
                animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 4 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                style={{ pointerEvents: "none" }}
              >
                {label}
              </motion.span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
