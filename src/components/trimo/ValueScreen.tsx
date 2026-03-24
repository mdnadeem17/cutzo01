import { ArrowRight, Store } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  onGetStarted: () => void;
  onOpenVendor: () => void;
}

export default function ValueScreen({ onGetStarted, onOpenVendor }: Props) {
  return (
    <div className="customer-gradient relative flex h-screen w-full flex-col overflow-hidden">
      <motion.div
        className="absolute inset-0"
        style={{
          width: "200%",
          height: "200%",
          background:
            "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.14), transparent 32%), radial-gradient(circle at 80% 18%, rgba(6,182,212,0.18), transparent 26%)",
        }}
        animate={{
          x: ["0%", "-20%", "0%"],
          y: ["0%", "-20%", "0%"]
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
      />

      <motion.button
        onClick={onOpenVendor}
        whileTap={{ scale: 0.95 }}
        animate={{ borderColor: ["rgba(255,255,255,0.3)", "rgba(255,255,255,0.6)", "rgba(255,255,255,0.3)"] }}
        transition={{
          scale: { duration: 0.12 },
          borderColor: { duration: 2.5, repeat: Infinity, ease: "easeInOut" }
        }}
        className="absolute right-5 top-6 z-20 rounded-full border bg-white/10 px-4 py-2 text-[14px] font-medium tracking-[0.01em] text-white shadow-[0_10px_30px_rgba(15,23,42,0.14)] backdrop-blur-md transition-colors hover:text-[#06B6D4]"
        style={{ opacity: 0.96 }}
      >
        Shop Login
      </motion.button>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-[100px] pt-12 text-center">
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="mb-6 flex h-20 w-20 items-center justify-center rounded-[28px] border border-white/20 bg-white/12 shadow-[0_20px_50px_rgba(15,23,42,0.18)] backdrop-blur-xl"
        >
          <Store className="h-10 w-10 text-white" strokeWidth={1.6} />
        </motion.div>

        <h1 className="max-w-[310px] text-[32px] font-bold leading-[1.08] text-white">
          Find barber shops near you
        </h1>

        <p className="mt-4 text-sm font-medium tracking-[0.02em] text-[#E0E7FF]">
          No waiting / Fixed pricing / Trusted shops
        </p>
      </div>

      <div className="pointer-events-none fixed bottom-5 left-4 right-4 z-20">
        <div className="mx-auto max-w-[398px]">
          <div className="pointer-events-auto relative">
            <motion.div
              className="absolute -inset-[2px] rounded-2xl bg-[#8F00FF] blur-[8px]"
              animate={{ opacity: [0.15, 0.35, 0.15] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.button
              onClick={onGetStarted}
              whileTap={{ scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="relative flex h-[56px] w-full items-center justify-center gap-2 rounded-2xl text-base font-semibold text-white transition-colors customer-gradient shadow-[0_0_15px_rgba(143,0,255,0.3)]"
            >
              Continue
              <ArrowRight className="h-5 w-5" />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
