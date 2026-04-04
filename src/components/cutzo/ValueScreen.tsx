import { ArrowRight, Scissors, Zap, Star, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

interface Props {
  onGetStarted: () => void;
  onOpenVendor: () => void;
}

// ── Floating particle dot ─────────────────────────────────────────────────────
function Particle({
  x, y, size, delay, duration, color,
}: {
  x: string; y: string; size: number; delay: number; duration: number; color: string;
}) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ left: x, top: y, width: size, height: size, background: color }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: [0, 0.7, 0.7, 0],
        scale: [0, 1, 1, 0],
        y: [0, -40, -80, -120],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeOut",
      }}
    />
  );
}

// ── Pill feature badge ────────────────────────────────────────────────────────
function FeaturePill({
  icon: Icon,
  label,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center gap-2 rounded-full px-4 py-2"
      style={{
        background: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(255,255,255,0.12)",
        backdropFilter: "blur(12px)",
      }}
    >
      <Icon className="h-3.5 w-3.5 text-violet-300" />
      <span className="text-[12px] font-semibold text-white/80">{label}</span>
    </motion.div>
  );
}

export default function ValueScreen({ onGetStarted, onOpenVendor }: Props) {
  const [hoverContinue, setHoverContinue] = useState(false);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  // Animate shimmer on the Continue button continuously
  const handleContinueTap = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    setRipples((prev) => [...prev, { id, x, y }]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 600);
    onGetStarted();
  };

  return (
    <div
      className="relative flex h-screen w-full flex-col overflow-hidden safe-top"
      style={{ background: "linear-gradient(145deg, #12002E 0%, #4B00B5 50%, #8F00FF 100%)" }}
    >
      {/* ── Background mesh orbs (Matched to Theme) ───────────────────────── */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 600, height: 600,
          top: "-30%", left: "-25%",
          background: "radial-gradient(circle, rgba(143,0,255,0.4) 0%, transparent 70%)",
        }}
        animate={{ scale: [1, 1.08, 1], x: [0, 15, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 500, height: 500,
          bottom: "-20%", right: "-20%",
          background: "radial-gradient(circle, rgba(143,0,255,0.3) 0%, transparent 65%)",
        }}
        animate={{ scale: [1, 1.12, 1], y: [0, -15, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />

      {/* ── Soft floating particles ───────────────────────────────────────── */}
      <Particle x="12%"  y="72%" size={4} delay={0}    duration={4}   color="rgba(255,255,255,0.4)" />
      <Particle x="30%" y="65%" size={3} delay={0.8}  duration={3.5} color="rgba(255,255,255,0.5)" />
      <Particle x="65%" y="78%" size={4} delay={1.6}  duration={4.5} color="rgba(255,255,255,0.3)" />
      <Particle x="85%" y="68%" size={5} delay={0.4}  duration={3.8} color="rgba(255,255,255,0.6)" />
      <Particle x="45%" y="82%" size={3} delay={1.2}  duration={4.2} color="rgba(255,255,255,0.2)" />

      {/* ── Grid texture overlay ──────────────────────────────────────────── */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      {/* ── Shop Login pill (top right) ───────────────────────────────────── */}
      <motion.button
        onClick={onOpenVendor}
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        whileTap={{ scale: 0.94 }}
        className="absolute right-5 top-6 z-20 flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold text-white/90"
        style={{
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.15)",
          backdropFilter: "blur(12px)",
        }}
      >
        <Zap className="h-3.5 w-3.5 text-purple-300" />
        Shop Login
      </motion.button>

      {/* ── Center hero content ───────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-7 text-center" style={{ paddingBottom: "140px" }}>

        {/* Animated icon */}
        <motion.div
          initial={{ scale: 0, opacity: 0, rotate: -20 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="mb-8 relative"
        >
          {/* Outer glow ring 1 */}
          <motion.div
            className="absolute -inset-6 rounded-[36px]"
            style={{ background: "radial-gradient(circle, rgba(143,0,255,0.35) 0%, transparent 65%)" }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Outer glow ring 2 */}
          <motion.div
            className="absolute -inset-10 rounded-[44px]"
            style={{ background: "radial-gradient(circle, rgba(180,80,255,0.15) 0%, transparent 65%)" }}
            animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          />

          {/* Glass card background */}
          <div
            className="relative flex h-[85px] w-[85px] items-center justify-center rounded-[24px]"
            style={{
              background: "linear-gradient(145deg, rgba(143,0,255,0.6) 0%, rgba(75,0,181,0.8) 100%)",
              border: "1px solid rgba(255,255,255,0.15)",
              boxShadow: "0 10px 30px rgba(143,0,255,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
            }}
          >
            {/* Animated Z Icon Logo */}
            <motion.div
              animate={{ rotate: [0, -3, 0, 3, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            >
              <svg width="44" height="44" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <mask id="cutMaskSmall">
                    <rect width="1024" height="1024" fill="white" />
                    {/* Scaled slash for better visibility at 44px */}
                    <path d="M 80 940 Q 512 650 860 160 L 800 140 Q 512 600 60 900 Z" fill="black" />
                  </mask>
                </defs>
                <g mask="url(#cutMaskSmall)">
                  <path d="M 280 340 L 744 340" stroke="white" stroke-width="160" stroke-linecap="round" />
                  <path d="M 744 340 L 280 684" stroke="white" stroke-width="160" stroke-linejoin="miter" />
                  <path d="M 280 684 L 744 684" stroke="white" stroke-width="160" stroke-linecap="round" />
                </g>
              </svg>
            </motion.div>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="text-[34px] font-montserrat font-black leading-[1.05] text-white"
          style={{ letterSpacing: "-0.03em" }}
        >
          Find Barber Shops
          <br />
          Near You
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mt-4 text-[14px] font-medium leading-relaxed"
          style={{ color: "rgba(210,190,255,0.8)", maxWidth: "260px" }}
        >
          Premium grooming, fixed pricing,<br />zero waiting time.
        </motion.p>

        {/* Feature pills */}
        <div className="mt-7 flex flex-wrap justify-center gap-2.5">
          <FeaturePill icon={Star}    label="Trusted Reviews"  delay={0.65} />
          <FeaturePill icon={Clock}   label="Instant Booking"  delay={0.78} />
          <FeaturePill icon={Zap}     label="Fixed Pricing"    delay={0.91} />
        </div>
      </div>

      {/* ── Continue CTA ──────────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 pb-8 safe-bottom px-5">
        <div className="pointer-events-auto mx-auto max-w-[420px]">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Outer glow aura */}
            <motion.div
              className="absolute -inset-[2px] rounded-[18px]"
              style={{ background: "#8F00FF", opacity: 0.4, filter: "blur(8px)" }}
            />

            {/* Button */}
            <button
              id="btn-get-started"
              onClick={handleContinueTap}
              onMouseEnter={() => setHoverContinue(true)}
              onMouseLeave={() => setHoverContinue(false)}
              className="relative flex h-[56px] w-full items-center justify-center gap-2 rounded-[16px] text-[16px] font-bold text-white transition-transform active:scale-95"
              style={{ background: "#8F00FF", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              {/* Ripple effects on tap */}
              {ripples.map((r) => (
                <motion.span
                  key={r.id}
                  className="absolute rounded-full bg-white/25 pointer-events-none"
                  style={{ left: r.x - 30, top: r.y - 30, width: 60, height: 60 }}
                  initial={{ scale: 0, opacity: 1 }}
                  animate={{ scale: 5, opacity: 0 }}
                  transition={{ duration: 0.55, ease: "easeOut" }}
                />
              ))}

              <span>Continue</span>
              <motion.div
                animate={hoverContinue ? { x: 4 } : { x: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <ArrowRight className="h-5 w-5" />
              </motion.div>
            </button>
          </motion.div>

          {/* Sub-label */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 1.3 }}
            className="mt-4 text-center text-[11px] font-medium"
            style={{ color: "rgba(180,140,255,0.6)" }}
          >
            Find shops · Book slots · Skip the queue
          </motion.p>
        </div>
      </div>

      {/* ── Edge vignette ─────────────────────────────────────────────────── */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(10,0,30,0.6) 100%)",
        }}
      />
    </div>
  );
}
