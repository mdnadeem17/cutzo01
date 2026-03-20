import { ArrowLeft, MapPin, Clock, Shield, ChevronRight, X, CheckCircle } from "lucide-react";
import { useState } from "react";
import { Shop, Service } from "./types";

interface Props {
  shop: Shop;
  services: Service[];
  date: string;
  time: string;
  onBack: () => void;
  onSuccess: (booking: { shop: Shop; services: Service[]; date: string; time: string }) => void;
}

function OTPModal({ phone, onConfirm, onClose }: {
  phone: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [sent, setSent] = useState(true);
  const [verifying, setVerifying] = useState(false);

  const handleChange = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 3) {
      document.getElementById(`otp-${i + 1}`)?.focus();
    }
  };

  const handleVerify = () => {
    setVerifying(true);
    setTimeout(() => onConfirm(), 1000);
  };

  const filled = otp.every((d) => d !== "");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 fade-in" onClick={onClose}>
      <div
        className="w-full bg-background rounded-t-[24px] px-6 pt-6 pb-10 slide-up"
        style={{ maxWidth: "430px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-border mx-auto mb-5" />

        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Verify Your Number</h2>
            <p className="text-xs text-muted-foreground mt-0.5">OTP sent to {phone}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex items-center justify-between p-3 bg-muted rounded-xl mb-5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">🇮🇳 +91</span>
            <span className="text-sm font-medium text-foreground">{phone}</span>
          </div>
          <button className="text-xs font-semibold text-accent">Change</button>
        </div>

        {/* OTP Inputs */}
        <div className="flex gap-3 justify-center mb-5">
          {otp.map((digit, i) => (
            <input
              key={i}
              id={`otp-${i}`}
              type="tel"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              className="w-14 h-14 rounded-xl text-center text-xl font-bold outline-none transition-all"
              style={{
                border: digit ? "2px solid hsl(var(--accent))" : "2px solid hsl(var(--border))",
                background: digit ? "hsl(var(--accent)/0.08)" : "hsl(var(--card))",
                color: "hsl(var(--foreground))",
              }}
            />
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mb-5">
          Didn't receive?{" "}
          <button className="text-accent font-semibold">Resend OTP</button>
        </p>

        <button
          onClick={handleVerify}
          disabled={!filled || verifying}
          className="gradient-btn w-full h-[50px] rounded-[12px] text-white font-semibold text-base disabled:opacity-50 scale-tap transition-all"
          style={!filled ? { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" } : {}}
        >
          {verifying ? "Verifying..." : "Verify & Confirm Booking"}
        </button>

        <div className="flex items-center justify-center gap-1.5 mt-3">
          <Shield className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-[11px] text-muted-foreground">Your number is safe with us</p>
        </div>
      </div>
    </div>
  );
}

export default function BookingConfirmationScreen({ shop, services, date, time, onBack, onSuccess }: Props) {
  const [showOTP, setShowOTP] = useState(false);
  const [phone, setPhone] = useState("98765 43210");
  const total = services.reduce((acc, s) => acc + s.price, 0);
  const totalDuration = services.reduce((acc, s) => acc + parseInt(s.duration), 0);

  return (
    <>
      <div className="flex flex-col min-h-screen bg-muted pb-32">
        {/* Header */}
        <div className="brand-gradient px-4 pt-12 pb-6">
          <button onClick={onBack} className="mb-4 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-2xl font-bold text-white">Review Booking</h1>
          <p className="text-light-text text-sm mt-1">Check details before confirming</p>
        </div>

        <div className="px-4 pt-4 flex flex-col gap-3">
          {/* Shop Card */}
          <div className="bg-card rounded-[16px] overflow-hidden card-shadow">
            <div className="flex gap-3 p-4">
              <img src={shop.image} alt={shop.name} className="w-16 h-16 rounded-xl object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">{shop.name}</p>
                <div className="flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                  <p className="text-xs text-muted-foreground truncate">{shop.address}</p>
                </div>
              </div>
            </div>
            <div className="px-4 pb-4 border-t border-border pt-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-accent" />
                  <span className="text-xs font-semibold text-foreground">{date}, {time}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{totalDuration} min total</span>
                </div>
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="bg-card rounded-[16px] p-4 card-shadow">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Services</p>
            {services.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.duration}</p>
                </div>
                <p className="text-sm font-semibold text-foreground">₹{s.price}</p>
              </div>
            ))}
            <div className="flex items-center justify-between pt-3 mt-1">
              <p className="text-sm font-bold text-foreground">Total</p>
              <p className="text-base font-bold text-accent">₹{total}</p>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-card rounded-[16px] p-4 card-shadow">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Contact</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Mobile Number</p>
                <p className="text-xs text-muted-foreground">+91 {phone}</p>
              </div>
              <button
                onClick={() => setPhone(phone)}
                className="text-xs font-semibold text-accent border border-accent/30 px-3 py-1.5 rounded-full"
              >
                Edit
              </button>
            </div>
          </div>

          {/* Policy */}
          <div className="bg-accent/5 border border-accent/20 rounded-[16px] p-4">
            <div className="flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Free cancellation up to 2 hours before your appointment. No advance payment required.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-4"
        style={{ maxWidth: "430px", margin: "0 auto" }}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-muted-foreground">Total Amount</p>
          <p className="text-lg font-bold text-accent">₹{total}</p>
        </div>
        <button
          onClick={() => setShowOTP(true)}
          className="gradient-btn w-full h-[50px] rounded-[12px] text-white font-semibold text-base shadow-lg scale-tap transition-transform"
        >
          Confirm Booking
        </button>
      </div>

      {showOTP && (
        <OTPModal
          phone={phone}
          onClose={() => setShowOTP(false)}
          onConfirm={() => {
            setShowOTP(false);
            onSuccess({ shop, services, date, time });
          }}
        />
      )}
    </>
  );
}
