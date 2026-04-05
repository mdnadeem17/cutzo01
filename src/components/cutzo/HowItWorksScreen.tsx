import { ArrowLeft, Calendar, MapPin, Scissors, Sparkles } from "lucide-react";
import { motion, Variants } from "framer-motion";

interface Props {
  onBack: () => void;
}

const steps = [
  {
    icon: MapPin,
    title: "Find a Shop",
    desc: "Browse nearby barber shops with fixed pricing and trusted reviews before you choose.",
    color: "from-blue-500 to-cyan-400",
    shadow: "shadow-blue-500/20"
  },
  {
    icon: Calendar,
    title: "Book a Slot",
    desc: "Select your service and preferred time instantly without waiting for callbacks.",
    color: "from-purple-500 to-pink-500",
    shadow: "shadow-purple-500/20"
  },
  {
    icon: Scissors,
    title: "Get Service",
    desc: "Visit the shop, skip the waiting line, and pay after the service is completed.",
    color: "from-orange-500 to-yellow-500",
    shadow: "shadow-orange-500/20"
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -30, scale: 0.95 },
  show: { opacity: 1, x: 0, scale: 1, transition: { type: "spring", stiffness: 100, damping: 15 } }
};

export default function HowItWorksScreen({ onBack }: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-background relative overflow-hidden">
      {/* Background Decorative Blobs */}
      <div className="absolute top-[10%] left-[-10%] w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute top-[50%] right-[-10%] w-64 h-64 bg-accent/10 rounded-full blur-[80px] pointer-events-none" />

      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="customer-header relative z-10 px-6 pb-12 pt-6 safe-top rounded-b-[40px] shadow-2xl overflow-hidden"
      >
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
        
        <button
          onClick={onBack}
          className="relative z-10 mb-6 flex h-11 w-11 items-center justify-center rounded-full bg-white/20 backdrop-blur-md transition-transform active:scale-95"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>

        <div className="relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex items-center gap-2"
          >
            <Sparkles className="h-5 w-5 text-purple-200" />
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-100">Cutzo Guide</p>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-2 text-4xl font-extrabold text-white tracking-tight leading-tight"
          >
            How It Works
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mt-3 text-base text-purple-100/90 leading-relaxed max-w-[280px]"
          >
            A simple three-step flow for faster, more reliable barber bookings.
          </motion.p>
        </div>
      </motion.div>

      <div className="relative z-20 -mt-8 px-5 pb-12 flex-1">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-5 relative"
        >
          {/* Subtle connecting line behind items */}
          <motion.div 
            initial={{ height: 0 }}
            animate={{ height: "70%" }}
            transition={{ delay: 0.6, duration: 1, ease: "easeInOut" }}
            className="absolute left-[38px] top-[60px] w-[2px] bg-gradient-to-b from-primary/30 to-transparent z-0 hidden sm:block" 
          />

          {steps.map(({ icon: Icon, title, desc, color, shadow }, index) => (
            <motion.div 
              key={title} 
              variants={itemVariants}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="relative z-10 rounded-[24px] bg-card p-5 shadow-lg border border-border/50 backdrop-blur-sm"
            >
              <div className="flex items-start gap-5 relative">
                <div className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br ${color} shadow-lg ${shadow}`}>
                  <div className="absolute inset-0 bg-white/20 rounded-[20px] backdrop-blur-sm" />
                  <Icon className="relative z-10 h-7 w-7 text-white drop-shadow-md" />
                </div>
                
                <div className="flex-1 pt-1">
                  <div className="inline-block px-2.5 py-1 mb-2 rounded-lg bg-muted text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Step {index + 1}
                  </div>
                  <h2 className="text-[19px] font-bold text-card-foreground tracking-tight">{title}</h2>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground font-medium">{desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
