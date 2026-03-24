import { AnimatePresence, motion } from "framer-motion";
import { X, KeySquare } from "lucide-react";
import { useState } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (otp: number) => Promise<void>;
  isLoading?: boolean;
}

export default function OtpVerificationModal({ isOpen, onClose, onSubmit, isLoading }: Props) {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (otp.length !== 4) {
      setError("Please enter a 4-digit OTP");
      return;
    }
    setError("");
    try {
      await onSubmit(parseInt(otp, 10));
      setOtp("");
    } catch (e: any) {
      setError(e.message || "Invalid OTP");
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-5 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-sm overflow-hidden rounded-[24px] bg-white shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <KeySquare className="w-5 h-5 text-indigo-500" /> Verify OTP
            </h3>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-6">
            <p className="mb-4 text-xs font-medium text-slate-500 text-center">
              Ask the customer for their 4-digit booking OTP to start the service.
            </p>
            
            <input
              type="number"
              maxLength={4}
              value={otp}
              onChange={(e) => {
                const val = e.target.value.slice(0, 4);
                setOtp(val);
                setError("");
              }}
              className="w-full rounded-[16px] bg-slate-50 border-2 border-slate-100 p-4 text-center text-3xl font-black tracking-[0.5em] text-slate-800 outline-none focus:border-indigo-500 transition-colors"
              placeholder="0000"
              autoFocus
            />

            {error && (
              <p className="mt-3 text-center text-xs font-bold text-red-500">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={isLoading || otp.length !== 4}
              className="mt-6 w-full rounded-[14px] bg-indigo-600 py-3.5 text-sm font-black text-white shadow-lg shadow-indigo-600/30 disabled:opacity-50"
            >
              {isLoading ? "Verifying..." : "Verify & Start Service"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
