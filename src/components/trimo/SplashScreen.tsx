import { Scissors } from "lucide-react";

export default function SplashScreen() {
  return (
    <div className="splash-gradient flex flex-col items-center justify-center min-h-screen safe-top">
      <div className="flex flex-col items-center gap-4">
        {/* Logo mark */}
        <div className="animate-scale-in">
          <div className="w-20 h-20 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center backdrop-blur-sm shadow-2xl animate-float-glow">
            <Scissors className="w-10 h-10 text-white" strokeWidth={1.5} />
          </div>
        </div>
        {/* Brand name */}
        <div className="flex flex-col items-center gap-1 animate-fade-slide-up" style={{ animationDelay: "200ms" }}>
          <h1 className="text-5xl font-black tracking-tight text-white">TRIMO</h1>
          <p className="text-sm font-medium text-light-text tracking-widest uppercase">
            Book. Sit. Look Sharp.
          </p>
        </div>
      </div>
      {/* Loading dots */}
      <div className="absolute bottom-16 flex gap-2">
        <div className="w-2 h-2 rounded-full bg-white/60 animate-dots" style={{ animationDelay: "0ms" }} />
        <div className="w-2 h-2 rounded-full bg-white/60 animate-dots" style={{ animationDelay: "300ms" }} />
        <div className="w-2 h-2 rounded-full bg-white/60 animate-dots" style={{ animationDelay: "600ms" }} />
      </div>
    </div>
  );
}
