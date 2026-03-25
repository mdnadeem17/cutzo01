import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, ChevronRight, Image as ImageIcon, Loader2, LogOut, MapPin, Phone, Store, Trash2, User, X } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import TrimoHeader from "./TrimoHeader";
import { VendorProfile } from "./types";
import { formatError } from "../../lib/errorUtils";

interface Props {
  ownerId: string;
  profile: VendorProfile;
  onSaveProfile: (profile: VendorProfile) => void;
  onExit: () => void;
  onLogout: () => void;
}

interface ProfileDraft {
  shopName: string;
  ownerName: string;
  address: string;
  phone: string;
}

export default function ProfileScreen({ ownerId, profile, onSaveProfile, onLogout }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [draft, setDraft] = useState<ProfileDraft>({
    shopName: profile.shopName,
    ownerName: profile.ownerName,
    address: profile.address,
    phone: profile.phone,
  });

  // Focus ref for specific fields if clicked from rows
  const nameRef = useRef<HTMLInputElement>(null);
  const ownerRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const [focusField, setFocusField] = useState<"shopName" | "ownerName" | "address" | "phone" | null>(null);

  const generateUploadUrl = useMutation(api.shops.generateUploadUrl);
  const getImageUrl = useMutation(api.shops.getImageUrl);
  const toggleShopStatusMutation = useMutation(api.shops.toggleShopStatus);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  // Live reactive read — updates instantly on any device when toggled
  const liveIsOpen = useQuery(api.shops.getShopIsOpen, { ownerId });
  // Use live value if loaded, fall back to profile.isOpen, fall back to true
  const isOpen = liveIsOpen ?? profile.isOpen ?? true;

  const openEdit = (field: "shopName" | "ownerName" | "address" | "phone" | null = null) => {
    setDraft({
      shopName: profile.shopName,
      ownerName: profile.ownerName,
      address: profile.address,
      phone: profile.phone,
    });
    setFocusField(field);
    setIsEditing(true);
  };

  useEffect(() => {
    if (isEditing && focusField) {
      setTimeout(() => {
        if (focusField === "shopName") nameRef.current?.focus();
        if (focusField === "ownerName") ownerRef.current?.focus();
        if (focusField === "address") addressRef.current?.focus();
        if (focusField === "phone") phoneRef.current?.focus();
      }, 300); // Wait for animation
    }
  }, [isEditing, focusField]);

  const handleSave = () => {
    onSaveProfile({
      ...profile,
      shopName: draft.shopName.trim() || profile.shopName,
      ownerName: draft.ownerName.trim() || profile.ownerName,
      address: draft.address.trim() || profile.address,
      phone: draft.phone.trim() || profile.phone,
    });
    setIsEditing(false);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const postUrl = await generateUploadUrl();
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "image/jpeg" },
        body: file,
      });

      if (!result.ok) throw new Error(`Upload rejected: ${result.statusText}`);

      const { storageId } = await result.json();
      const fullUrl = await getImageUrl({ storageId });
      
      if (fullUrl) {
        onSaveProfile({
          ...profile,
          images: [...profile.images, fullUrl]
        });
      }
    } catch (error: any) {
      alert(formatError(error));
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (indexToRemove: number) => {
    const nextImages = profile.images.filter((_, idx) => idx !== indexToRemove);
    onSaveProfile({ ...profile, images: nextImages });
  };

  const setCoverImage = (indexToCover: number) => {
    if (indexToCover === 0) return;
    const nextImages = [...profile.images];
    const [selected] = nextImages.splice(indexToCover, 1);
    nextImages.unshift(selected); // Put at index 0
    onSaveProfile({ ...profile, images: nextImages });
  };

  const toggleShopStatus = async () => {
    if (isTogglingStatus) return;
    try {
      setIsTogglingStatus(true);
      await toggleShopStatusMutation({ ownerId });
    } catch (error: any) {
      alert(formatError(error));
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const InfoRow = ({ label, value, icon: Icon, field }: any) => (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() => openEdit(field)}
      className="flex w-full items-center justify-between p-4 border-b border-slate-100 last:border-0 bg-white hover:bg-slate-50 transition-colors"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 border border-slate-100">
          <Icon className="h-4 w-4 text-slate-500" />
        </div>
        <div className="text-left">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
          <p className="mt-0.5 text-sm font-bold text-foreground">{value || "Not Set"}</p>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-300" />
    </motion.button>
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="flex min-h-[100dvh] flex-col bg-slate-50 pb-24"
    >
      {/* Premium Header */}
      <TrimoHeader
        title="Business Profile"
        subtitle={profile.shopName}
        rightButtonText="Edit Info"
        onRightButtonClick={() => openEdit(null)}
      />

      <div className="px-5 mt-4 space-y-6 relative z-10">
        
        {/* Profile Avatar Card */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }}
          className="flex items-center gap-4 rounded-[24px] bg-white p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100"
        >
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-slate-100 shadow-sm border border-slate-200">
            {profile.images?.[0] ? (
              <img src={profile.images[0]} alt="Shop" className="h-full w-full object-cover" />
            ) : (
              <Store className="h-6 w-6 text-slate-300 m-auto mt-5" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground tracking-tight">{profile.shopName}</h1>
            <p className="text-sm font-bold text-slate-500 flex items-center gap-1.5 mt-0.5">
              <User className="h-3.5 w-3.5" />
              {profile.ownerName}
            </p>
          </div>
        </motion.div>
        
        {/* Shop Status Toggle */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
          className="flex items-center justify-between rounded-[24px] bg-white p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100"
        >
          <div>
            <p className="text-base font-black text-foreground">Operational Status</p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {isOpen ? "Shop is open and accepting bookings." : "Shop is closed. Bookings are paused."}
            </p>
          </div>
          <button 
            onClick={toggleShopStatus}
            disabled={isTogglingStatus}
            className={`relative flex h-8 w-14 shrink-0 cursor-pointer rounded-full p-1 transition-colors duration-300 ${
              isOpen ? "bg-green-500" : "bg-slate-200"
            } ${isTogglingStatus ? "opacity-60" : ""}`}
          >
            {isTogglingStatus ? (
              <Loader2 className="h-6 w-6 animate-spin text-white/70 mx-auto" />
            ) : (
              <motion.div 
                layout 
                className="h-6 w-6 rounded-full bg-white shadow-sm"
                animate={{ x: isOpen ? 24 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        </motion.div>

        {/* Info Cards */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
          className="overflow-hidden rounded-[24px] bg-white shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100"
        >
          <InfoRow label="Shop Name" value={profile.shopName} icon={Store} field="shopName" />
          <InfoRow label="Owner Name" value={profile.ownerName} icon={User} field="ownerName" />
          <InfoRow label="Address" value={profile.address} icon={MapPin} field="address" />
          <InfoRow label="Phone Number" value={profile.phone} icon={Phone} field="phone" />
        </motion.div>

        {/* Shop Gallery Section */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
          className="rounded-[24px] bg-white p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-base font-black text-foreground">Shop Gallery</p>
              <p className="text-xs font-medium text-slate-500">First image is used as your cover.</p>
            </div>
            <label className="flex h-9 items-center justify-center gap-2 rounded-full bg-blue-50 px-4 text-xs font-bold text-blue-600 cursor-pointer overflow-hidden relative">
              <Camera className="h-3.5 w-3.5" /> Add Photo
              {isUploading && <div className="absolute inset-0 bg-blue-100/80 flex justify-center items-center"><Loader2 className="w-4 h-4 animate-spin text-blue-600" /></div>}
              <input type="file" accept="image/*" className="hidden" disabled={isUploading} onChange={handleImageUpload} />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {profile.images?.map((url, idx) => (
              <div key={url} className="group relative aspect-square overflow-hidden rounded-[16px] bg-slate-100">
                <img src={url} alt={`Gallery ${idx}`} className="h-full w-full object-cover" />
                
                {/* Image Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                  <div className="flex justify-end">
                    <button onClick={() => removeImage(idx)} className="h-7 w-7 rounded-full bg-red-500/90 text-white flex items-center justify-center backdrop-blur-sm">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {idx !== 0 && (
                    <button onClick={() => setCoverImage(idx)} className="w-full py-1.5 rounded-lg bg-white/90 text-[10px] font-black uppercase text-slate-900 backdrop-blur-md">
                      Set Cover
                    </button>
                  )}
                </div>

                {idx === 0 && (
                  <div className="absolute top-2 left-2 bg-blue-500 text-white text-[9px] font-black uppercase px-2 py-1 rounded shadow-sm">Cover</div>
                )}
              </div>
            ))}
            {(!profile.images || profile.images.length === 0) && (
              <div className="col-span-2 py-8 rounded-[16px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center bg-slate-50 text-slate-400">
                <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm font-bold">No images added</p>
                <p className="text-xs">Upload photos to attract more bookings.</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Logout Section */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="flex w-full h-14 items-center justify-center gap-2 rounded-[20px] border-2 border-red-100 bg-white text-sm font-bold text-red-500 shadow-sm"
          >
            <LogOut className="h-4 w-4" /> Log Out of Partner Dashboard
          </button>
        </motion.div>

      </div>

      {/* Edit Form Modal Slide-Up */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsEditing(false)} />
             <motion.div
               initial={{ y: "100%", borderTopLeftRadius: "32px", borderTopRightRadius: "32px" }}
               animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
               className="relative z-10 w-full bg-white px-6 pb-10 pt-6 shadow-2xl"
             >
               <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-slate-200" />
               <div className="flex items-start justify-between gap-3 mb-6">
                 <div>
                   <h2 className="text-2xl font-black text-foreground">Update Shop Info</h2>
                   <p className="mt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">Profile Details</p>
                 </div>
                 <button onClick={() => setIsEditing(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"><X className="h-4 w-4" /></button>
               </div>
               
               <div className="flex flex-col gap-4">
                 <label className="flex flex-col gap-1.5">
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Shop Name</span>
                   <input ref={nameRef} value={draft.shopName} onChange={(e) => setDraft(d => ({ ...d, shopName: e.target.value }))} className="h-14 rounded-[16px] border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:bg-white focus:border-blue-500" />
                 </label>
                 <label className="flex flex-col gap-1.5">
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Owner Name</span>
                   <input ref={ownerRef} value={draft.ownerName} onChange={(e) => setDraft(d => ({ ...d, ownerName: e.target.value }))} className="h-14 rounded-[16px] border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:bg-white focus:border-blue-500" />
                 </label>
                 <label className="flex flex-col gap-1.5">
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Address</span>
                   <input ref={addressRef} value={draft.address} onChange={(e) => setDraft(d => ({ ...d, address: e.target.value }))} className="h-14 rounded-[16px] border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:bg-white focus:border-blue-500" />
                 </label>
                 <label className="flex flex-col gap-1.5">
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Phone Number</span>
                   <input ref={phoneRef} type="tel" value={draft.phone} onChange={(e) => setDraft(d => ({ ...d, phone: e.target.value }))} className="h-14 rounded-[16px] border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:bg-white focus:border-blue-500" />
                 </label>

                 <motion.button whileTap={{ scale: 0.95 }} onClick={handleSave} className="mt-4 flex h-14 items-center justify-center rounded-[16px] bg-foreground text-sm font-bold text-white shadow-xl shadow-slate-900/20">
                   Save Changes
                 </motion.button>
               </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowLogoutConfirm(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative z-10 w-full max-w-[320px] rounded-[24px] bg-white p-6 shadow-2xl text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
                <LogOut className="h-6 w-6 ml-1" />
              </div>
              <h3 className="text-xl font-black text-foreground">Sign Out?</h3>
              <p className="mt-2 text-sm font-medium text-slate-500 leading-relaxed">You will stop receiving push notifications for new booking requests until you log back in.</p>
              
              <div className="mt-6 flex flex-col gap-3">
                <button onClick={onLogout} className="flex h-12 w-full items-center justify-center rounded-[14px] bg-red-500 text-sm font-bold text-white shadow-lg shadow-red-500/30">
                  Yes, Log Out
                </button>
                <button onClick={() => setShowLogoutConfirm(false)} className="flex h-12 w-full items-center justify-center rounded-[14px] bg-slate-100 text-sm font-bold text-slate-600">
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
