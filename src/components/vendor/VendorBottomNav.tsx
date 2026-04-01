import { Calendar, Home, LucideIcon, Scissors, User } from "lucide-react";
import { motion } from "framer-motion";
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
      className="fixed left-[12px] right-[12px] h-[65px] z-[60] rounded-[22px] bg-white pointer-events-auto"
      style={{
        bottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
        boxShadow: "0 4px 20px rgba(0,0,0,0.10), 0 1px 6px rgba(0,0,0,0.05)",
        transform: "translateZ(0)",
        willChange: "transform",
      }}
    >
      <div className="flex h-full w-full items-center justify-around px-2">
        {tabs.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <motion.button
              key={id}
              onClick={() => onTab(id)}
              whileTap={{ scale: 0.88 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="group flex-1 flex flex-col items-center justify-center h-full relative"
              style={{ WebkitTapHighlightColor: "transparent", outline: "none" }}
            >
              <motion.div
                className={`relative flex items-center justify-center rounded-full ${
                  isActive
                    ? "w-12 h-12 bg-gradient-to-br from-[#0c1e3e] to-[#044f6f] shadow-[0_6px_14px_rgba(4,79,111,0.3)]"
                    : "w-10 h-10 mt-2"
                }`}
                animate={{ y: isActive ? -12 : 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
              >
                <Icon
                  className={`transition-colors duration-200 ${isActive ? "w-[22px] h-[22px] text-white" : "w-5 h-5 text-muted-foreground"}`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </motion.div>

              <motion.span
                className="absolute bottom-1.5 text-[10px] font-bold tracking-wide text-[#0c1e3e]"
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
