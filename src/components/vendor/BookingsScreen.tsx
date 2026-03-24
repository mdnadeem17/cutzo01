import { AnimatePresence, motion } from "framer-motion";
import { Calendar, Check, Clock, Play, X } from "lucide-react";
import { useState } from "react";
import { isThisWeek, isToday, isTomorrow, parseISO } from "date-fns";
import TrimoHeader from "./TrimoHeader";
import { VendorBooking } from "./types";
import { formatBookingDate, formatCurrency } from "./utils";
import OtpVerificationModal from "./OtpVerificationModal";

type FilterTab = VendorBooking["status"];
type DateFilter = "today" | "tomorrow" | "this_week" | "all";

interface Props {
  bookings: VendorBooking[];
  bookingsLoading?: boolean;
  onAcceptBooking: (id: string) => void;
  onRejectBooking: (id: string) => void;
  onStartBooking: (id: string, otp: number) => Promise<void>;
  onCompleteBooking: (id: string) => void;
  onCancelBooking: (id: string) => void;
}

const tabs: { id: FilterTab; label: string; color: string }[] = [
  { id: "pending", label: "Pending", color: "orange" },
  { id: "confirmed", label: "Confirmed", color: "blue" },
  { id: "active", label: "Active", color: "purple" },
  { id: "completed", label: "Completed", color: "green" },
  { id: "cancelled", label: "Cancelled", color: "red" },
];

function LiveStatusBadge({ status }: { status: VendorBooking["status"] }) {
  let label = "Pending";
  let bg = "bg-orange-50";
  let text = "text-orange-500";
  let border = "border-orange-200";

  if (status === "confirmed") {
    label = "Confirmed";
    bg = "bg-blue-50";
    text = "text-blue-500";
    border = "border-blue-200";
  } else if (status === "active") {
    label = "Active";
    bg = "bg-purple-50";
    text = "text-purple-600";
    border = "border-purple-200";
  } else if (status === "completed") {
    label = "Completed";
    bg = "bg-green-50";
    text = "text-green-600";
    border = "border-green-200";
  } else if (status === "cancelled") {
    label = "Cancelled";
    bg = "bg-red-50";
    text = "text-red-500";
    border = "border-red-200";
  }

  return (
    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black tracking-widest uppercase ${bg} ${text} ${border}`}>
      {label}
    </span>
  );
}

export default function BookingsScreen({
  bookings,
  bookingsLoading = false,
  onAcceptBooking,
  onRejectBooking,
  onStartBooking,
  onCompleteBooking,
  onCancelBooking,
}: Props) {
  const [activeTab, setActiveTab] = useState<FilterTab>("pending");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerifySubmit = async (otp: number) => {
    if (!verifyingId) return;
    setIsVerifying(true);
    try {
      await onStartBooking(verifyingId, otp);
      setVerifyingId(null);
    } catch (error) {
      throw error;
    } finally {
      setIsVerifying(false);
    }
  };

  const filtered = bookings.filter((booking) => {
    if (booking.status !== activeTab) return false;

    if (dateFilter === "all") return true;
    
    const date = parseISO(booking.date);
    if (dateFilter === "today") return isToday(date);
    if (dateFilter === "tomorrow") return isTomorrow(date);
    if (dateFilter === "this_week") return isThisWeek(date, { weekStartsOn: 1 });
    
    return true;
  });

  return (
    <motion.div 
      className="flex min-h-[100dvh] flex-col bg-slate-50 pb-24"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <TrimoHeader
        title="Appointment Requests"
        subtitle="Manage and respond to booking requests"
        rightNode={
          <select 
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as DateFilter)}
            className="rounded-[12px] border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold text-white backdrop-blur-md outline-none focus:ring-2 focus:ring-cyan-500/50 appearance-none shadow-sm cursor-pointer hover:bg-white/20 transition-colors"
          >
            <option value="today" className="text-slate-800">Today</option>
            <option value="tomorrow" className="text-slate-800">Tomorrow</option>
            <option value="this_week" className="text-slate-800">This Week</option>
            <option value="all" className="text-slate-800">All Dates</option>
          </select>
        }
      />

      <div className="mt-5 px-5 relative z-10 space-y-5">

        {/* Status Filter Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const count = bookings.filter((b) => b.status === tab.id).length;

            // Per-status style definitions
            const colorMap: Record<string, { activeBg: string; activeShadow: string; inactiveBg: string; border: string; dot: string; activeText: string; inactiveText: string; subText: string }> = {
              orange: {
                activeBg:     "bg-orange-500",
                activeShadow: "shadow-orange-500/30",
                inactiveBg:   "bg-white",
                border:       "border-orange-300",
                dot:          "bg-orange-500",
                activeText:   "text-white",
                inactiveText: "text-orange-700",
                subText:      "text-orange-400",
              },
              blue: {
                activeBg:     "bg-blue-500",
                activeShadow: "shadow-blue-500/30",
                inactiveBg:   "bg-white",
                border:       "border-blue-300",
                dot:          "bg-blue-500",
                activeText:   "text-white",
                inactiveText: "text-blue-700",
                subText:      "text-blue-400",
              },
              purple: {
                activeBg:     "bg-purple-500",
                activeShadow: "shadow-purple-500/30",
                inactiveBg:   "bg-white",
                border:       "border-purple-300",
                dot:          "bg-purple-500",
                activeText:   "text-white",
                inactiveText: "text-purple-700",
                subText:      "text-purple-400",
              },
              green: {
                activeBg:     "bg-green-500",
                activeShadow: "shadow-green-500/30",
                inactiveBg:   "bg-white",
                border:       "border-green-300",
                dot:          "bg-green-500",
                activeText:   "text-white",
                inactiveText: "text-green-700",
                subText:      "text-green-400",
              },
              red: {
                activeBg:     "bg-red-500",
                activeShadow: "shadow-red-500/30",
                inactiveBg:   "bg-white",
                border:       "border-red-300",
                dot:          "bg-red-500",
                activeText:   "text-white",
                inactiveText: "text-red-700",
                subText:      "text-red-400",
              },
            };

            const c = colorMap[tab.color] ?? colorMap["blue"];
            const shortLabel = tab.id === "active" ? "Active" : tab.label;

            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                animate={{ scale: isActive ? 1.03 : 1 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={`relative flex flex-col items-start overflow-hidden rounded-[16px] border px-4 py-3.5 text-left shadow-md transition-all duration-300 ${
                  isActive
                    ? `${c.activeBg} border-transparent ${c.activeShadow}`
                    : `${c.inactiveBg} ${c.border}`
                }`}
              >
                {/* Colored dot indicator */}
                <div className={`mb-2 h-2.5 w-2.5 rounded-full ${isActive ? "bg-white/70" : c.dot}`} />

                {/* Status name */}
                <p className={`text-[13px] font-black leading-tight tracking-tight ${isActive ? c.activeText : c.inactiveText}`}>
                  {shortLabel}
                </p>

                {/* Count */}
                <p className={`mt-0.5 text-[11px] font-bold ${isActive ? "text-white/80" : c.subText}`}>
                  {count} {count === 1 ? "booking" : "bookings"}
                </p>

                {/* Active glow accent line */}
                {!isActive && (
                  <div className={`absolute bottom-0 left-0 h-[3px] w-full rounded-b-[16px] ${c.dot} opacity-40`} />
                )}
              </motion.button>
            );
          })}
        </div>


        {/* Bookings List */}
        <div className="flex flex-col gap-4">
          <AnimatePresence mode="popLayout">
            {bookingsLoading ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-6 rounded-[24px] bg-white px-5 py-14 text-center border border-border/50 shadow-sm"
              >
                <div className="flex justify-center gap-2">
                  {[0, 0.15, 0.3].map((delay, i) => (
                    <div key={i} className="h-2.5 w-2.5 rounded-full bg-primary/60 dot-wave" style={{ animationDelay: `${delay}s` }} />
                  ))}
                </div>
                <p className="mt-4 text-xs font-medium text-muted-foreground">Loading bookings from database...</p>
              </motion.div>
            ) : filtered.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mt-6 rounded-[24px] bg-white px-5 py-14 text-center border border-border/50 shadow-sm"
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                  <Calendar className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-base font-black tracking-tight text-foreground">No bookings in this queue</p>
                <p className="mt-2 text-xs font-medium text-muted-foreground/80 max-w-[200px] mx-auto">
                  New booking requests will appear here when available.
                </p>
              </motion.div>
            ) : (
              filtered.map((booking, i) => (
                <motion.div 
                  layout
                  key={booking.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 30 }}
                  className="overflow-hidden rounded-[20px] bg-white border border-border/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)]"
                >
                  <div className="p-5 pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-base font-black tracking-tight text-foreground">{booking.customerName}</p>
                        <p className="mt-1 text-xs font-bold text-muted-foreground uppercase tracking-wide">{booking.service}</p>
                      </div>
                      <LiveStatusBadge status={booking.status} />
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3 divide-x divide-slate-100 rounded-[14px] bg-slate-50 p-3">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                          Date & Time
                        </p>
                        <p className="mt-1 text-sm font-black text-foreground">
                          {formatBookingDate(booking.date)}
                        </p>
                        <p className="mt-0.5 text-[11px] font-bold text-primary flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {booking.time}
                        </p>
                      </div>
                      <div className="pl-3 text-right">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                          Price
                        </p>
                        <p className="mt-1 text-sm font-black text-emerald-600">{formatCurrency(booking.price)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="bg-slate-50 border-t border-slate-100 p-3 flex flex-wrap gap-2">
                    {booking.status === "pending" && (
                      <div className="flex w-full gap-2">
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => onAcceptBooking(booking.id)}
                          className="flex flex-1 h-11 items-center justify-center gap-2 rounded-[12px] bg-blue-500 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-blue-500/20"
                        >
                          <Check className="h-4 w-4" /> Accept
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => onRejectBooking(booking.id)}
                          className="flex flex-1 h-11 items-center justify-center gap-2 rounded-[12px] bg-red-500 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-red-500/20"
                        >
                          <X className="h-4 w-4" /> Reject
                        </motion.button>
                      </div>
                    )}

                    {booking.status === "confirmed" && (
                      <div className="flex w-full gap-2">
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setVerifyingId(booking.id)}
                          className="flex flex-1 h-11 items-center justify-center gap-2 rounded-[12px] bg-purple-500 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-purple-500/20"
                        >
                          <Play className="h-4 w-4" /> Start
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => onCancelBooking(booking.id)}
                          className="flex h-11 px-4 items-center justify-center gap-2 rounded-[12px] bg-slate-200 text-xs font-bold uppercase tracking-wider text-slate-600"
                        >
                          Cancel
                        </motion.button>
                      </div>
                    )}

                    {booking.status === "active" && (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onCompleteBooking(booking.id)}
                        className="flex w-full h-11 items-center justify-center gap-2 rounded-[12px] bg-green-500 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-green-500/20"
                      >
                        <Check className="h-4 w-4" /> Complete
                      </motion.button>
                    )}

                    {(booking.status === "completed" || booking.status === "cancelled") && (
                      <div className="w-full flex items-center justify-center py-2">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5">
                          {booking.status === "completed" ? (
                            <><Check className="w-3 h-3 text-green-500" /> Completed</>
                          ) : (
                            <><X className="w-3 h-3 text-red-500" /> Cancelled</>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      <OtpVerificationModal
        isOpen={!!verifyingId}
        isLoading={isVerifying}
        onClose={() => setVerifyingId(null)}
        onSubmit={handleVerifySubmit}
      />
    </motion.div>
  );
}
