import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import React from "react";

interface CutzoHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  rightButtonText?: string;
  onRightButtonClick?: () => void;
  rightNode?: React.ReactNode;
}

export default function CutzoHeader({
  title,
  subtitle,
  showBackButton,
  onBack,
  rightButtonText,
  onRightButtonClick,
  rightNode,
}: CutzoHeaderProps) {
  return (
    <div className="bg-gradient-to-br from-[#0c1e3e] to-[#044f6f] px-5 pb-6 pt-12 safe-top rounded-b-[24px] shadow-md relative overflow-hidden flex flex-col justify-end min-h-[140px] shrink-0">
      {/* Background decorations for premium feel */}
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5 blur-2xl pointer-events-none" />
      <div className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-cyan-400/10 blur-xl pointer-events-none" />

      {/* Brand water mark / logo */}
      <div className="absolute top-5 left-5 z-20 flex items-baseline gap-1.5 opacity-90 pointer-events-none">
        <h2 className="font-montserrat text-lg font-black tracking-wider text-white">
          CUTZO
        </h2>
        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-cyan-300">
          For Business
        </span>
      </div>

      <div className="relative z-10 flex items-center justify-between gap-3 mt-4">
        <div className="flex items-center gap-3">
          {showBackButton && onBack && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onBack}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20"
            >
              <ArrowLeft className="h-5 w-5" />
            </motion.button>
          )}
          <div className="min-w-0">
            <h1 className="text-[26px] sm:text-3xl font-black tracking-tight text-white leading-tight truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 text-xs font-medium text-white/70 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right Action container */}
        <div className="flex items-center shrink-0">
          {rightNode}
          {rightButtonText && onRightButtonClick && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onRightButtonClick}
              className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-md shadow-sm transition-colors hover:bg-white/20 whitespace-nowrap"
            >
              {rightButtonText}
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
