import { Scissors } from "lucide-react";

export default function SplashScreen() {
  return (
    <div className="brand-gradient flex flex-col items-center justify-center min-h-screen fade-in">
      <div className="flex flex-col items-center gap-4">
        {/* Logo mark */}
        <div className="w-20 h-20 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center backdrop-blur-sm shadow-2xl">
          <Scissors className="w-10 h-10 text-white" strokeWidth={1.5} />
        </div>
        {/* Brand name */}
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-5xl font-black tracking-tight text-white">TRIMO</h1>
          <p className="text-sm font-medium text-light-text tracking-widest uppercase">
            Book. Sit. Look Sharp.
          </p>
        </div>
      </div>
      {/* Loading dots */}
      <div className="absolute bottom-16 flex gap-2">
        <div className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: "0ms" }} />
        <div className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: "150ms" }} />
        <div className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}
