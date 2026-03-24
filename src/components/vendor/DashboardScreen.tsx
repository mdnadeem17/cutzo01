import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, BarChart3, Calendar, Check, Clock, Play, Settings, Wallet, X } from "lucide-react";
import { useState } from "react";
import TrimoHeader from "./TrimoHeader";
import { VendorBooking } from "./types";
import { bookingStatusStyles, formatCurrency } from "./utils";
import OtpVerificationModal from "./OtpVerificationModal";

interface Props {
  shopName: string;
  dateLabel: string;
  todayBookings: VendorBooking[];
  pendingCount: number;
  earningsToday: number;
  bookingsLoading?: boolean;
  onAcceptBooking: (id: string) => void;
  onRejectBooking: (id: string) => void;
  onStartBooking: (id: string, otp: number) => Promise<void>;
  onCompleteBooking: (id: string) => void;
  onCancelBooking: (id: string) => void;
  onOpenAvailability: () => void;
  onOpenEarnings: () => void;
  onOpenBookings: () => void;
}

// Custom Status Chip based on the user request (Waiting, In Progress, Completed, etc)
function LiveStatusChip({ status }: { status: VendorBooking["status"] }) {
  let label = "Pending";
  let bg = "bg-gray-100";
  let text = "text-gray-600";
  let border = "border-gray-200";

  if (status === "pending") {
    label = "New Request";
    bg = "bg-orange-50";
    text = "text-orange-500";
    border = "border-orange-200";
  } else if (status === "confirmed") {
    label = "Waiting";
    bg = "bg-orange-100";
    text = "text-orange-600";
    border = "border-orange-300";
  } else if (status === "active") {
    label = "Active";
    bg = "bg-blue-100";
    text = "text-blue-600";
    border = "border-blue-300";
  } else if (status === "completed") {
    label = "Completed";
    bg = "bg-green-100";
    text = "text-green-600";
    border = "border-green-300";
  } else if (status === "cancelled") {
    label = "Cancelled";
    bg = "bg-red-50";
    text = "text-red-500";
    border = "border-red-200";
  }

  return (
    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-extrabold tracking-wide uppercase ${bg} ${text} ${border}`}>
      {label}
    </span>
  );
}

function StatCard({
  label,
  value,
  Icon,
  theme,
}: {
  label: string;
  value: string;
  Icon: React.ComponentType<{ className?: string }>;
  theme: "blue" | "green" | "orange";
}) {
  const themes = {
    blue: { bg: "bg-blue-500", text: "text-blue-500", light: "bg-blue-500/10" },
    green: { bg: "bg-green-500", text: "text-green-500", light: "bg-green-500/10" },
    orange: { bg: "bg-orange-500", text: "text-orange-500", light: "bg-orange-500/10" },
  };
  const t = themes[theme];

  return (
    <motion.div
      whileTap={{ scale: 0.95 }}
      className="flex flex-col items-center justify-center rounded-[16px] bg-white p-4 shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-border/50"
    >
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${t.light}`}>
        <Icon className={`h-5 w-5 ${t.text}`} />
      </div>
      <motion.p
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-2xl font-black tracking-tight text-foreground"
      >
        {value}
      </motion.p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
    </motion.div>
  );
}

export default function DashboardScreen({
  shopName,
  dateLabel,
  todayBookings,
  pendingCount,
  earningsToday,
  bookingsLoading = false,
  onAcceptBooking,
  onRejectBooking,
  onStartBooking,
  onCompleteBooking,
  onCancelBooking,
  onOpenAvailability,
  onOpenEarnings,
  onOpenBookings,
}: Props) {
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

  return (
    <motion.div 
      className="flex min-h-[100dvh] flex-col bg-slate-50 pb-24"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Top Header */}
      <TrimoHeader
        title={shopName}
        subtitle={dateLabel}
        rightButtonText="View Queue"
        onRightButtonClick={onOpenBookings}
      />

      <div className="mt-6 flex flex-col gap-6 px-5 relative z-20">
        
        {/* Stats Cards */}
        <motion.div 
          className="grid grid-cols-3 gap-3"
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0, y: 20 },
            show: {
              opacity: 1,
              y: 0,
              transition: { staggerChildren: 0.1 },
            },
          }}
        >
          <StatCard label="Today" value={`${todayBookings.length}`} Icon={Calendar} theme="blue" />
          <StatCard label="Earnings" value={`₹${earningsToday}`} Icon={Wallet} theme="green" />
          <StatCard label="Pending" value={`${pendingCount}`} Icon={Clock} theme="orange" />
        </motion.div>

        {/* Action Cards */}
        <div className="grid grid-cols-2 gap-3">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onOpenAvailability}
            className="group relative overflow-hidden rounded-[20px] bg-white p-5 text-left border border-white max-sm:p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 backdrop-blur-lg" />
            <div className="relative z-10">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[12px] bg-indigo-50">
                <Settings className="h-5 w-5 text-indigo-500" />
              </div>
              <p className="text-sm font-extrabold text-foreground">Availability</p>
              <p className="mt-1.5 text-[11px] font-medium leading-relaxed text-muted-foreground line-clamp-2">
                Manage working hours and breaks.
              </p>
              <div className="mt-5 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-indigo-500">
                Manage
                <motion.div
                  initial={{ x: 0 }}
                  whileHover={{ x: 4 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </motion.div>
              </div>
            </div>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onOpenEarnings}
            className="group relative overflow-hidden rounded-[20px] bg-white p-5 text-left border border-white max-sm:p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 backdrop-blur-lg" />
            <div className="relative z-10">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[12px] bg-emerald-50">
                <BarChart3 className="h-5 w-5 text-emerald-500" />
              </div>
              <p className="text-sm font-extrabold text-foreground">Earnings</p>
              <p className="mt-1.5 text-[11px] font-medium leading-relaxed text-muted-foreground line-clamp-2">
                View your financial reports.
              </p>
              <div className="mt-5 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-emerald-500">
                Reports
                <motion.div
                  initial={{ x: 0 }}
                  whileHover={{ x: 4 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </motion.div>
              </div>
            </div>
          </motion.button>
        </div>

        {/* Live Appointment Queue */}
        <div className="mt-2">
          <div className="flex items-end justify-between gap-3 mb-5 px-1">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">
                Right Now
              </p>
              <h2 className="text-xl font-black tracking-tight text-foreground">Live Queue</h2>
            </div>
          </div>

          <AnimatePresence mode="popLayout">
            {bookingsLoading ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-[24px] bg-white px-5 py-12 text-center border border-border/50 shadow-sm"
              >
                <div className="flex justify-center gap-2">
                  {[0, 0.15, 0.3].map((delay, i) => (
                    <div key={i} className="h-2.5 w-2.5 rounded-full bg-primary/60 dot-wave" style={{ animationDelay: `${delay}s` }} />
                  ))}
                </div>
                <p className="mt-4 text-xs font-medium text-muted-foreground">Loading live bookings...</p>
              </motion.div>
            ) : todayBookings.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-[24px] bg-white px-5 py-12 text-center border border-border/50 shadow-sm"
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <Calendar className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-base font-bold text-foreground">No bookings today</p>
                <p className="mt-2 text-xs font-medium text-muted-foreground">
                  When customers book appointments, they will appear here in real-time.
                </p>
              </motion.div>
            ) : (
              todayBookings.map((booking, i) => (
                <motion.div 
                  key={booking.id} 
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, type: "spring", damping: 25, stiffness: 200 }}
                  className="mb-4 overflow-hidden rounded-[20px] bg-white border border-border/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)]"
                >
                  <div className="p-5 pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-base font-black tracking-tight text-foreground">{booking.customerName}</p>
                        <p className="mt-1 text-xs font-bold text-muted-foreground uppercase tracking-wide">{booking.service}</p>
                      </div>
                      <LiveStatusChip status={booking.status} />
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3 divide-x divide-border">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          Time
                        </p>
                        <p className="mt-1 text-sm font-black text-foreground flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-primary" />
                          {booking.time}
                        </p>
                      </div>
                      <div className="pl-3 text-right">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          Revenue
                        </p>
                        <p className="mt-1 text-sm font-black text-foreground">{formatCurrency(booking.price)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons Container */}
                  <div className="bg-slate-50/80 p-3 flex flex-wrap gap-2">
                    {booking.status === "pending" && (
                      <div className="flex w-full gap-2">
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => onAcceptBooking(booking.id)}
                          className="flex flex-1 h-11 items-center justify-center gap-2 rounded-[12px] bg-primary text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-primary/20"
                        >
                          <Check className="h-4 w-4" /> Accept
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => onRejectBooking(booking.id)}
                          className="flex flex-1 h-11 items-center justify-center gap-2 rounded-[12px] bg-red-100 text-xs font-bold uppercase tracking-wider text-red-600"
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
                          className="flex flex-1 h-11 items-center justify-center gap-2 rounded-[12px] bg-blue-500 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-blue-500/20"
                        >
                          <Play className="h-4 w-4" /> Start Service
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
                        <Check className="h-4 w-4" /> Mark Completed
                      </motion.button>
                    )}

                    {(booking.status === "completed" || booking.status === "cancelled") && (
                      <div className="w-full flex items-center justify-center py-2">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">
                          {booking.status === "completed" ? "Service Delivered" : "Service Cancelled"}
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
