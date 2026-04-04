import { AnimatePresence, motion } from "framer-motion";
import { Clock, Scissors, Play, X, UserPlus, Timer } from "lucide-react";
import { useState } from "react";

interface Props {
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  onSubmit: (serviceName: string, duration: number) => Promise<void>;
}

const PRESET_DURATIONS = [10, 15, 20, 25, 30];

export default function WalkInModal({ isOpen, isLoading, onClose, onSubmit }: Props) {
  const [duration, setDuration] = useState<number>(10);
  const [serviceName, setServiceName] = useState("Walk-in Customer");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (duration > 480) {
      alert("Duration cannot exceed 480 minutes (8 hours).");
      return;
    }
    onSubmit(serviceName.trim() || "Walk-in Customer", duration);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-5">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={isLoading ? undefined : onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: "100%", scale: 1 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: "100%", scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative w-full max-w-[420px] rounded-t-[32px] sm:rounded-[32px] bg-white p-6 sm:p-8 shadow-2xl flex flex-col gap-6"
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <h3 className="text-2xl font-black tracking-tight text-slate-900">Add Walk-in</h3>
                </div>
                <p className="text-sm font-medium text-slate-500 leading-relaxed max-w-[280px]">
                  Reserve a seat for a physical customer. Online bookings will be paused.
                </p>
              </div>
              <button
                onClick={onClose}
                disabled={isLoading}
                className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              
              {/* Service Details */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 pl-1">
                  Service Title
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    disabled={isLoading}
                    className="w-full h-14 rounded-[16px] border border-slate-200 bg-slate-50 p-4 pl-12 text-sm font-bold text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400 placeholder:font-medium"
                    placeholder="e.g. Haircut & Beard"
                  />
                  <Scissors className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                </div>
              </div>

              {/* Quick Select Duration */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between pl-1 pr-1">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    Estimated Time
                  </label>
                  <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    {duration} MIN
                  </span>
                </div>
                
                <div className="grid grid-cols-5 gap-2">
                  {PRESET_DURATIONS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDuration(preset)}
                      className={`h-12 rounded-[12px] border text-sm font-bold transition-all ${
                        duration === preset
                          ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/25 scale-[1.02]"
                          : "bg-white border-slate-200 text-slate-600 hover:border-blue-200 hover:bg-blue-50"
                      }`}
                    >
                      {preset}m
                    </button>
                  ))}
                </div>

                <div className="relative mt-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-100"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-3 text-[10px] font-bold uppercase tracking-widest text-slate-300">
                      Or Custom Input
                    </span>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    disabled={isLoading}
                    min={10}
                    max={480}
                    step={5}
                    className="w-full h-14 rounded-[16px] border border-slate-200 bg-slate-50 p-4 pl-12 text-sm font-bold text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                    required
                  />
                  <Timer className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 flex h-[60px] w-full items-center justify-center gap-2 rounded-[16px] bg-slate-900 text-[15px] font-bold tracking-wide text-white shadow-[0_8px_20px_rgb(15,23,42,0.25)] transition-all hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-[3px] border-white/30 border-t-white" />
                ) : (
                  <>
                    <Play className="h-5 w-5" /> BEGIN SESSION
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
