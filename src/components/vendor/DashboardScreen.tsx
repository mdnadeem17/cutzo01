import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, BarChart3, Calendar, Check, Clock, Play, Settings, Wallet, X } from "lucide-react";
import { useState } from "react";
import CutzoHeader from "./CutzoHeader";
import { VendorBooking } from "./types";
import { bookingStatusStyles, formatCurrency } from "./utils";
import OtpVerificationModal from "./OtpVerificationModal";
import WalkInModal from "./WalkInModal";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

interface Props {
  ownerId: string;
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
  canLoadMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
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
    blue: { 
      accent: "text-blue-600", 
      bg: "bg-blue-50/50", 
      iconBg: "bg-blue-100", 
      glow: "group-hover:shadow-blue-200/50" 
    },
    green: { 
      accent: "text-emerald-600", 
      bg: "bg-emerald-50/50", 
      iconBg: "bg-emerald-100", 
      glow: "group-hover:shadow-emerald-200/50" 
    },
    orange: { 
      accent: "text-amber-600", 
      bg: "bg-amber-50/50", 
      iconBg: "bg-amber-100", 
      glow: "group-hover:shadow-amber-200/50" 
    },
  };
  const t = themes[theme];

  return (
    <motion.div
      whileTap={{ scale: 0.95 }}
      className="group flex flex-col items-center justify-center rounded-[24px] bg-white p-5 border border-slate-100 shadow-[0_10px_30px_rgba(0,0,0,0.02)] transition-all hover:shadow-2xl hover:-translate-y-1"
    >
      <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-2xl transition-transform group-hover:scale-110 ${t.iconBg}`}>
        <Icon className={`h-5 w-5 ${t.accent}`} />
      </div>
      <motion.p
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`text-2xl font-black tracking-tight text-slate-900`}
      >
        {value}
      </motion.p>
      <p className="mt-1 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
        {label}
      </p>
    </motion.div>
  );
}

export default function DashboardScreen({
  ownerId,
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
  canLoadMore = false,
  isLoadingMore = false,
  onLoadMore = () => {},
}: Props) {
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [isWalkInLoading, setIsWalkInLoading] = useState(false);

  const barberStatus = useQuery(api.walkIns.getBarberStatus, ownerId ? { ownerId } : "skip");
  const startWalkIn = useMutation(api.walkIns.startWalkIn);
  const finishWalkIn = useMutation(api.walkIns.finishWalkIn);
  const cancelWalkIn = useMutation(api.walkIns.cancelWalkIn);

  const handleStartWalkIn = async (serviceName: string, duration: number) => {
    try {
      setIsWalkInLoading(true);
      await startWalkIn({ ownerId, serviceName, estimatedDuration: duration });
      setShowWalkInModal(false);
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsWalkInLoading(false);
    }
  };

  const handleFinishWalkIn = async (walkInId: string) => {
    try {
      await finishWalkIn({ ownerId, walkInId: walkInId as any });
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const handleCancelWalkIn = async (walkInId: string) => {
    try {
      await cancelWalkIn({ ownerId, walkInId: walkInId as any });
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

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
      <CutzoHeader
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

        {/* Premium Live Status Widget */}
        <motion.div 
          layout
          className="relative overflow-hidden rounded-[28px] bg-white border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.04)]"
        >
          {/* Subtle Background Glow */}
          <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-20 pointer-events-none -mr-16 -mt-16 ${barberStatus?.currentStatus === "busy" ? "bg-red-500" : "bg-emerald-500"}`} />
          
          <div className="p-6 relative z-10">
            {/* Header Area */}
            <div className="flex items-start justify-between mb-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${barberStatus?.currentStatus === "busy" ? "bg-red-500 animate-pulse" : "bg-emerald-500"}`} />
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/80">Live Now</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                  Shop Availability
                </h3>
              </div>
              
              <div className="flex flex-col items-end">
                <div className={`px-4 py-2 rounded-2xl text-[11px] font-black uppercase tracking-widest border transition-all duration-500 ${barberStatus?.currentStatus === "busy" ? "bg-red-50 text-red-600 border-red-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"}`}>
                  {barberStatus?.currentStatus === "busy" ? "Occupied" : "Available"}
                </div>
                <span className="text-[9px] font-bold text-slate-400 mt-2 tracking-wider">
                  {barberStatus?.capacity?.occupied || 0} / {barberStatus?.capacity?.total || 1} CHAIRS FILLED
                </span>
              </div>
            </div>

            {/* Content Area */}
            <AnimatePresence mode="wait">
              {barberStatus?.activeSessions && barberStatus.activeSessions.length > 0 ? (
                <motion.div 
                  key="busy"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="space-y-4"
                >
                  {barberStatus.activeSessions.map((session: any) => (
                    <div key={session.id} className="group relative overflow-hidden bg-slate-50/50 rounded-[22px] border border-slate-100/80 p-5 transition-all hover:bg-white hover:border-slate-200 hover:shadow-xl hover:shadow-slate-200/20">
                      <div className="flex justify-between items-start">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${session.type === 'walk-in' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                              {session.type === 'walk-in' ? 'Walk-in' : 'Online'}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">• Current Session</span>
                          </div>
                          
                          <div>
                            <h4 className="text-xl font-black text-slate-900 tracking-tight">{session.serviceName || "Premium Haircut"}</h4>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <p className="text-xs font-bold text-slate-500">Scheduled task</p>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Finishing At</p>
                          <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm inline-block">
                            <p className="text-sm font-black text-indigo-600">
                              {new Date(session.busyUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2.5 mt-6">
                        {session.type === "online" ? (
                          <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={async () => {
                              try {
                                await onCompleteBooking(session.id);
                              } catch (e: any) {
                                alert("Error: " + e.message);
                              }
                            }}
                            className="w-full flex justify-center items-center gap-2.5 bg-slate-900 hover:bg-black text-white rounded-[16px] h-12 text-xs font-black uppercase tracking-widest shadow-lg shadow-slate-900/10 active:scale-95 transition-all"
                          >
                            <Check className="w-4 h-4 text-emerald-400" /> Finish Service
                          </motion.button>
                        ) : (
                          <>
                            <motion.button
                              whileTap={{ scale: 0.97 }}
                              onClick={() => handleCancelWalkIn(session.id)}
                              className="flex-1 flex justify-center items-center gap-2.5 bg-white hover:bg-red-50 text-red-500 border border-slate-100 rounded-[16px] h-12 text-xs font-black uppercase tracking-widest active:scale-95 transition-all"
                            >
                              <X className="w-4 h-4" /> Cancel
                            </motion.button>
                            <motion.button
                              whileTap={{ scale: 0.97 }}
                              onClick={() => handleFinishWalkIn(session.id)}
                              className="flex-[1.5] flex justify-center items-center gap-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[16px] h-12 text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-200 active:scale-95 transition-all"
                            >
                              <Check className="w-4 h-4" /> Complete
                            </motion.button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </motion.div>
              ) : (
                <motion.div 
                  key="idle"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col items-center justify-center py-8 text-center"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-50 mb-4 animate-pulse">
                    <Check className="h-8 w-8 text-emerald-500" />
                  </div>
                  <h4 className="text-xl font-black text-slate-900 mb-1">Available to Serve</h4>
                  <p className="text-xs font-bold text-slate-400 max-w-[200px] leading-relaxed"> No active sessions. Your shop is ready for the next customer.</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-8">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowWalkInModal(true)}
                disabled={barberStatus?.currentStatus === "busy"}
                className="w-full flex justify-center items-center gap-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-300 text-white rounded-[20px] h-[60px] text-sm font-black uppercase tracking-[0.1em] shadow-xl shadow-indigo-100 active:scale-95 transition-all"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20">
                  <Play className="w-4 h-4 fill-white" />
                </div>
                New Walk-In Session
              </motion.button>
            </div>
          </div>
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

          {canLoadMore && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={onLoadMore}
              disabled={isLoadingMore}
              className="mt-2 w-full rounded-[20px] border border-dashed border-primary/30 bg-white/50 py-4 text-xs font-bold uppercase tracking-widest text-primary hover:bg-white active:scale-95 transition-all disabled:opacity-50"
            >
              {isLoadingMore ? "Loading More..." : "Load More Activity"}
            </motion.button>
          )}

        </div>
      </div>
      
      <OtpVerificationModal
        isOpen={!!verifyingId}
        isLoading={isVerifying}
        onClose={() => setVerifyingId(null)}
        onSubmit={handleVerifySubmit}
      />

      <WalkInModal
        isOpen={showWalkInModal}
        isLoading={isWalkInLoading}
        onClose={() => setShowWalkInModal(false)}
        onSubmit={handleStartWalkIn}
      />
    </motion.div>
  );
}
