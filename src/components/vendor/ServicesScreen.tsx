import { useState } from "react";
import { AnimatePresence, motion, useAnimation } from "framer-motion";
import { ArrowLeft, ArrowRight, ChartBar, Check, Clock, Edit2, Plus, Scissors, Trash2, X } from "lucide-react";
import CutzoHeader from "./CutzoHeader";
import { VendorService } from "./types";
import { formatCurrency } from "./utils";

interface Props {
  services: VendorService[];
  onCreateService: (service: Omit<VendorService, "id">) => void;
  onUpdateService: (id: string, service: Omit<VendorService, "id">) => void;
  onDeleteService: (id: string) => void;
  onOpenAvailability: () => void;
}

interface ServiceDraft {
  name: string;
  durationMinutes: number;
  price: string;
  category: "Haircut" | "Beard" | "Facial" | "Kids" | "Other";
  popular: boolean;
  available: boolean;
}

const emptyDraft: ServiceDraft = {
  name: "",
  durationMinutes: 30,
  price: "",
  category: "Haircut",
  popular: false,
  available: true,
};

// Sub-component for Swipeable cards
function SwipeableServiceCard({
  service,
  onEdit,
  onDelete,
}: {
  service: VendorService;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const controls = useAnimation();
  const [swipingAction, setSwipingAction] = useState<"edit" | "delete" | null>(null);

  const handleDragEnd = async (event: any, info: any) => {
    const threshold = 80;
    if (info.offset.x > threshold) {
      await controls.start({ x: 500, opacity: 0 });
      onEdit();
      // Snap back instantly since the form covers it
      controls.set({ x: 0, opacity: 1 });
    } else if (info.offset.x < -threshold) {
      await controls.start({ x: -500, opacity: 0 });
      onDelete();
    } else {
      controls.start({ x: 0, opacity: 1 });
    }
    setSwipingAction(null);
  };

  const handleDragUpdate = (event: any, info: any) => {
    if (info.offset.x > 30) setSwipingAction("edit");
    else if (info.offset.x < -30) setSwipingAction("delete");
    else setSwipingAction(null);
  };

  return (
    <div className="relative mb-4 overflow-hidden rounded-[20px] bg-white border border-border/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] touch-pan-y">
      {/* Background Action Indicators (under the card) */}
      <div className="absolute inset-0 flex items-center justify-between px-6 pointer-events-none">
        <div className={`flex items-center gap-2 font-bold transition-opacity ${swipingAction === "edit" ? "opacity-100 text-blue-500" : "opacity-0"}`}>
          <Edit2 className="h-5 w-5" /> Edit
        </div>
        <div className={`flex items-center gap-2 font-bold transition-opacity ${swipingAction === "delete" ? "opacity-100 text-red-500" : "opacity-0"}`}>
          Delete <Trash2 className="h-5 w-5" />
        </div>
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.4}
        onDragEnd={handleDragEnd}
        onDrag={handleDragUpdate}
        animate={controls}
        whileTap={{ cursor: "grabbing" }}
        className="relative z-10 flex items-center bg-white p-5 cursor-grab active:cursor-grabbing"
      >
        <div className="flex flex-col items-center gap-2 mr-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-slate-50 border border-slate-100 shadow-sm">
            <Scissors className="h-5 w-5 text-indigo-500" />
          </div>
          {service.popular && (
            <span className="text-[9px] font-black uppercase text-rose-500 tracking-wider">Hot</span>
          )}
        </div>
        
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <p className="text-base font-black tracking-tight text-foreground truncate mr-2">
              {service.name}
              {!service.available && <span className="ml-2 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded uppercase self-center tracking-widest leading-none">Off</span>}
            </p>
            <p className="text-lg font-black bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent shrink-0">
              {formatCurrency(service.price)}
            </p>
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <span>{service.category || "Service"}</span> • 
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {service.durationMinutes} min</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function ServicesScreen({
  services,
  onCreateService,
  onUpdateService,
  onDeleteService,
  onOpenAvailability,
}: Props) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ServiceDraft>(emptyDraft);

  const activeServices = services.filter(s => s.available !== false);
  const averagePrice = activeServices.length > 0
    ? Math.round(activeServices.reduce((acc, s) => acc + s.price, 0) / activeServices.length)
    : 0;
  const averageDuration = activeServices.length > 0
    ? Math.round(activeServices.reduce((acc, s) => acc + s.durationMinutes, 0) / activeServices.length)
    : 0;

  const openCreate = () => {
    setEditingId(null);
    setDraft(emptyDraft);
    setIsFormOpen(true);
  };

  const openEdit = (service: VendorService) => {
    setEditingId(service.id);
    setDraft({
      name: service.name,
      durationMinutes: service.durationMinutes,
      price: String(service.price),
      category: service.category || "Haircut",
      popular: service.popular || false,
      available: service.available ?? true,
    });
    setIsFormOpen(true);
  };

  const handleSubmit = () => {
    if (!draft.name.trim() || !draft.durationMinutes || !draft.price) return;

    const payload: Omit<VendorService, "id"> = {
      name: draft.name.trim(),
      durationMinutes: Number(draft.durationMinutes),
      price: Number(draft.price),
      category: draft.category,
      popular: draft.popular,
      available: draft.available,
    };

    if (editingId) {
      onUpdateService(editingId, payload);
    } else {
      onCreateService(payload);
    }

    setIsFormOpen(false);
  };

  const isInvalid = !draft.name.trim() || Number(draft.durationMinutes) <= 0 || Number(draft.price) <= 0;

  return (
    <motion.div 
      className="flex min-h-[100dvh] flex-col bg-slate-50 pb-36"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Top Header */}
      <CutzoHeader
        title="Menu & Pricing"
        subtitle="Professional control panel for shop offerings"
      />

      <div className="mt-4 flex flex-col gap-6 px-5 relative z-10">
        
        {/* 3 Stat Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center justify-center rounded-[16px] bg-gradient-to-b from-white to-slate-50/50 p-4 shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-slate-100">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10">
              <Scissors className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-xl font-black text-foreground">{activeServices.length}</p>
            <p className="mt-0.5 text-[9px] font-black uppercase tracking-widest text-slate-400">Services</p>
          </div>
          <div className="flex flex-col items-center justify-center rounded-[16px] bg-gradient-to-b from-white to-slate-50/50 p-4 shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-slate-100">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10">
              <ChartBar className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-xl font-black text-foreground">₹{averagePrice}</p>
            <p className="mt-0.5 text-[9px] font-black uppercase tracking-widest text-slate-400">Avg Price</p>
          </div>
          <div className="flex flex-col items-center justify-center rounded-[16px] bg-gradient-to-b from-white to-slate-50/50 p-4 shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-slate-100">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/10">
              <Clock className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-xl font-black text-foreground">{averageDuration}m</p>
            <p className="mt-0.5 text-[9px] font-black uppercase tracking-widest text-slate-400">Avg Time</p>
          </div>
        </div>

        {/* Availability Control Card */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onOpenAvailability}
          className="group relative overflow-hidden rounded-[20px] bg-white p-5 text-left border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] block w-full"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 backdrop-blur-lg" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-sm font-extrabold text-foreground">Availability & Time Slots</p>
              <p className="mt-1 text-xs font-medium leading-relaxed text-muted-foreground w-4/5">
                Set opening time, closing time, break time, and blocked days.
              </p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-indigo-50 text-indigo-500">
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </motion.button>

        {/* Services List */}
        <div>
          <div className="flex items-center justify-between mb-4 px-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Service Menu</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Swipe cards</p>
          </div>
          <div className="flex flex-col">
            <AnimatePresence>
              {services.map((service) => (
                <motion.div key={service.id} layout exit={{ opacity: 0, height: 0, scale: 0.8 }}>
                  <SwipeableServiceCard service={service} onEdit={() => openEdit(service)} onDelete={() => onDeleteService(service.id)} />
                </motion.div>
              ))}
            </AnimatePresence>
            {services.length === 0 && (
               <div className="py-10 text-center text-sm font-bold text-slate-400 rounded-2xl border border-dashed border-slate-200">
                 No services listed. Add one to start earning.
               </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Add Service Button */}
      <div className="fixed bottom-32 right-5 z-40">
        <motion.button
          animate={{ scale: [1, 1.05, 1], boxShadow: ["0 8px 30px rgba(14,165,233,0.3)", "0 8px 40px rgba(14,165,233,0.5)", "0 8px 30px rgba(14,165,233,0.3)"] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          whileTap={{ scale: 0.9 }}
          onClick={openCreate}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-600 to-blue-500 text-white"
        >
          <Plus className="h-8 w-8" />
        </motion.button>
      </div>

      {/* Slide-Up Form */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
              onClick={() => setIsFormOpen(false)} 
            />
            
            <motion.div
              initial={{ y: "100%", borderTopLeftRadius: "25px", borderTopRightRadius: "25px" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative z-10 w-full bg-white px-6 pt-6 shadow-2xl overflow-y-auto"
              style={{ height: "85vh", paddingBottom: "110px" }}
            >
              <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-slate-200" />
              
              <div className="flex items-start justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-2xl font-black text-foreground">
                    {editingId ? "Edit Service" : "Add Service"}
                  </h2>
                  <p className="mt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">Menu Config</p>
                </div>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-col gap-6" style={{ paddingBottom: "140px" }}>
                {/* Name */}
                <label className="flex flex-col gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Service Name</span>
                  <input
                    value={draft.name}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                    className="h-14 rounded-[16px] border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Enter service name"
                  />
                </label>

                {/* Price */}
                <label className="flex flex-col gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Price (₹)</span>
                  <input
                    type="number"
                    value={draft.price}
                    onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
                    className="h-14 rounded-[16px] border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>

                {/* Category */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</span>
                  <div className="grid grid-cols-2 gap-2">
                    {["Haircut", "Beard", "Facial", "Kids"].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setDraft((d) => ({ ...d, category: cat as any }))}
                        className={`h-12 rounded-[14px] text-xs font-bold border ${draft.category === cat ? "bg-blue-500 text-white border-blue-500" : "bg-white text-slate-600 border-slate-200"}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Duration</span>
                  <div className="flex gap-2">
                    {[10, 15, 20, 25, 30].map((mins) => (
                      <button
                        key={mins}
                        onClick={() => setDraft((d) => ({ ...d, durationMinutes: mins }))}
                        className={`flex-1 h-12 rounded-[14px] text-xs font-bold border ${draft.durationMinutes === mins ? "bg-cyan-500 text-white border-cyan-500" : "bg-white text-slate-600 border-slate-200"}`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggles */}
                <div className="flex flex-col gap-4 mt-2 bg-slate-50 rounded-[16px] p-4 border border-slate-100">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <span className="text-sm font-bold text-foreground block">Popular Feature</span>
                      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Highlight with "HOT" badge</span>
                    </div>
                    <div className={`relative w-12 h-6 rounded-full transition-colors ${draft.popular ? "bg-rose-500" : "bg-slate-300"}`} onClick={(e) => { e.preventDefault(); setDraft((d) => ({ ...d, popular: !d.popular })) }}>
                      <motion.div layout className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm" animate={{ x: draft.popular ? 24 : 0 }} />
                    </div>
                  </label>
                  
                  <div className="h-px bg-slate-200 w-full" />
                  
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <span className="text-sm font-bold text-foreground block">Available Now</span>
                      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Allow customers to book this</span>
                    </div>
                    <div className={`relative w-12 h-6 rounded-full transition-colors ${draft.available ? "bg-green-500" : "bg-slate-300"}`} onClick={(e) => { e.preventDefault(); setDraft((d) => ({ ...d, available: !d.available })) }}>
                      <motion.div layout className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm" animate={{ x: draft.available ? 24 : 0 }} />
                    </div>
                  </label>
                </div>
              </div>

              <div 
                style={{
                  position: "fixed",
                  bottom: "82px",
                  left: "16px",
                  right: "16px",
                  zIndex: 50,
                  maxWidth: "400px",
                  margin: "0 auto"
                }}
              >
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSubmit}
                  disabled={isInvalid}
                  className="flex w-full items-center justify-center bg-gradient-to-r from-blue-600 to-teal-500 text-sm font-bold text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ height: "56px", borderRadius: "16px" }}
                >
                  <Check className="mr-2 h-5 w-5" /> Save Service
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
