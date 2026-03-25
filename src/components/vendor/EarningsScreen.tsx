import { ArrowLeft, BarChart3, Calendar, Wallet, Download, CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";
import { format, isToday, isThisWeek, isThisMonth, parseISO } from "date-fns";
import { VendorBooking } from "./types";
import { formatBookingDate, formatCurrency } from "./utils";
import TrimoHeader from "./TrimoHeader";

interface Props {
  todayEarnings: number;
  weeklyEarnings: number;
  monthlyEarnings: number;
  totalEarnings: number;
  history: VendorBooking[];
  onBack: () => void;
}

type FilterType = "today" | "week" | "month" | "all";

export default function EarningsScreen({
  todayEarnings,
  weeklyEarnings,
  monthlyEarnings,
  totalEarnings,
  history,
  onBack,
}: Props) {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const filteredHistory = useMemo(() => {
    return history.filter((booking) => {
      if (booking.status !== "completed") return false;
      const date = new Date(booking.date);
      if (activeFilter === "today") return isToday(date);
      if (activeFilter === "week") return isThisWeek(date);
      if (activeFilter === "month") return isThisMonth(date);
      return true; // all
    });
  }, [history, activeFilter]);

  // Compute weekly earnings data for the chart (Monday to Sunday)
  const weeklyData = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const earningsByDay = new Array(7).fill(0);
    
    // Simple logic: get current week bookings and sum by day
    history.forEach(booking => {
      if (booking.status !== "completed") return;
      const d = parseISO(booking.date);
      if (isThisWeek(d, { weekStartsOn: 1 })) {
        // map day to 0-6 where 0=Mon, 6=Sun
        let dayIdx = d.getDay() - 1;
        if (dayIdx === -1) dayIdx = 6; // Sunday
        earningsByDay[dayIdx] += booking.price;
      }
    });
    
    const maxEarning = Math.max(...earningsByDay, 100); // 100 is min for height
    
    return days.map((day, idx) => ({
      day,
      amount: earningsByDay[idx],
      heightPercentage: Math.round((earningsByDay[idx] / maxEarning) * 100)
    }));
  }, [history]);

  return (
    <div className="flex min-h-screen flex-col bg-muted pb-[100px]">
      <TrimoHeader
        title="Revenue"
        subtitle="Business Dashboard"
        showBackButton
        onBack={onBack}
      />

      <div className="mt-4 flex flex-col gap-5 px-4 z-10">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[20px] bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/60 gradient-border">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
               <Wallet className="h-4 w-4" />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Today</p>
            <p className="mt-1 text-[22px] font-extrabold text-slate-800 drop-shadow-sm">{formatCurrency(todayEarnings)}</p>
          </div>
          
          <div className="rounded-[20px] bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/60 gradient-border">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-500">
               <Calendar className="h-4 w-4" />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">This Week</p>
            <p className="mt-1 text-[22px] font-extrabold text-slate-800 drop-shadow-sm">{formatCurrency(weeklyEarnings)}</p>
          </div>

          <div className="rounded-[20px] bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/60 gradient-border">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-500">
               <BarChart3 className="h-4 w-4" />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">This Month</p>
            <p className="mt-1 text-[22px] font-extrabold text-slate-800 drop-shadow-sm">{formatCurrency(monthlyEarnings)}</p>
          </div>

          <div className="rounded-[20px] bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/60 gradient-border relative overflow-hidden">
             <div className="absolute top-0 right-0 h-24 w-24 bg-primary/5 rounded-full blur-2xl -mr-6 -mt-6" />
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
               <Wallet className="h-4 w-4" />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Earned</p>
            <p className="mt-1 text-[22px] font-extrabold text-primary drop-shadow-sm">{formatCurrency(totalEarnings)}</p>
          </div>
        </div>

        {/* Weekly Chart */}
        <div className="rounded-[24px] bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/60">
          <h2 className="text-[15px] font-bold text-slate-800 mb-6">Earnings Overview</h2>
          <div className="h-40 flex items-end justify-between gap-2">
             {weeklyData.map((d) => (
               <div key={d.day} className="flex flex-col items-center flex-1 group">
                 <div className="w-full flex justify-center h-28 relative">
                   <div className="absolute bottom-0 w-8 bg-slate-100 rounded-t-md h-full transition-all" />
                   <div 
                     className="absolute bottom-0 w-8 bg-gradient-to-t from-primary/80 to-primary rounded-t-md transition-all duration-700 ease-out group-hover:opacity-80" 
                     style={{ height: `${Math.max(d.heightPercentage, 5)}%` }} 
                   />
                 </div>
                 <p className="text-[10px] font-bold text-muted-foreground mt-3 uppercase tracking-wider">{d.day}</p>
                 {d.amount > 0 && (
                   <div className="absolute -top-8 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                     ₹{d.amount}
                   </div>
                 )}
               </div>
             ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4 mt-2">
            <h2 className="text-[15px] font-bold text-slate-800">Booking History</h2>
            <button 
              className="flex items-center gap-1.5 text-xs font-bold text-primary active:opacity-70 transition-opacity"
              onClick={() => {
                // Download report feature — to be implemented
              }}
            >
              <Download className="h-3.5 w-3.5" />
              Download Report
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-2">
             {(["all", "today", "week", "month"] as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold tracking-wide transition-all ${
                    activeFilter === f
                      ? "bg-slate-800 text-white shadow-md cursor-default pointer-events-none"
                      : "bg-white text-slate-600 shadow-sm border border-slate-200/60 active:bg-slate-50"
                  }`}
                >
                  {f === "all" ? "All Time" : f === "week" ? "This Week" : f === "month" ? "This Month" : "Today"}
                </button>
             ))}
          </div>

          <div className="mt-2 flex flex-col gap-3 pb-8">
            {filteredHistory.length === 0 ? (
              <div className="rounded-[24px] bg-white px-5 py-12 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/60">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 mb-3">
                  <Wallet className="h-6 w-6 text-slate-300" />
                </div>
                <p className="text-sm font-bold text-slate-800">No completed bookings</p>
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  Try changing your filter or check back later.
                </p>
              </div>
            ) : (
              filteredHistory.map((booking) => (
                <div key={booking.id} className="rounded-[20px] bg-white p-4 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100/40 relative overflow-hidden transition-all scale-tap active:shadow-sm">
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                  
                  <div className="flex items-start justify-between gap-3 pl-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{booking.customerName}</p>
                      <p className="mt-0.5 text-[13px] font-semibold text-primary truncate">{booking.service}</p>
                    </div>
                    <div className="text-right shrink-0">
                       <p className="text-[17px] font-extrabold text-slate-800">{formatCurrency(booking.price)}</p>
                       <div className="flex items-center gap-1 justify-end mt-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Completed</span>
                       </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center pl-2">
                     <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Date &amp; Time</p>
                     <p className="text-[12px] font-bold text-slate-700">
                        {formatBookingDate(booking.date)} at {booking.time}
                     </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
