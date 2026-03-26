import { useEffect, useState } from "react";
import { App } from "@capacitor/app";
import { useAction, useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import AvailabilityScreen from "./AvailabilityScreen";
import BookingsScreen from "./BookingsScreen";
import DashboardScreen from "./DashboardScreen";
import EarningsScreen from "./EarningsScreen";
import ProfileScreen from "./ProfileScreen";
import ServicesScreen from "./ServicesScreen";
import VendorBottomNav from "./VendorBottomNav";
import {
  createDefaultAvailabilitySlots,
  createDefaultServiceCatalog,
  ShopOwnerRecord,
} from "./storage";
import {
  AvailabilitySlot,
  BlockedDate,
  BreakTime,
  VendorBooking,
  VendorProfile,
  VendorScreen,
  VendorService,
  VendorTab,
  WorkingHours,
} from "./types";
import {
  formatHeaderDate,
  getMonthlyEarnings,
  getTodayEarnings,
  getWeeklyEarnings,
  isBookingToday,
} from "./utils";
import { formatError } from "../../lib/errorUtils";

interface Props {
  onExit: () => void;
  onLogout: () => void;
  ownerRecord?: ShopOwnerRecord;
  onOwnerRecordChange?: (user: ShopOwnerRecord) => void;
}

const fallbackWorkingHours: WorkingHours = {
  start: "09:00",
  end: "21:00",
};

const emptyProfile: VendorProfile = {
  shopName: "",
  ownerName: "",
  address: "",
  phone: "",
  images: [],
};

const createProfileFromOwner = (ownerRecord?: ShopOwnerRecord): VendorProfile => {
  if (!ownerRecord) {
    return emptyProfile;
  }

  return {
    shopName: ownerRecord.shopName,
    ownerName: ownerRecord.name,
    address: ownerRecord.address,
    phone: ownerRecord.phone,
    images: ownerRecord.images,
  };
};

const createServicesFromOwner = (ownerRecord?: ShopOwnerRecord): VendorService[] => {
  if (!ownerRecord) {
    return [];
  }

  if (ownerRecord.serviceCatalog.length > 0) {
    return ownerRecord.serviceCatalog;
  }

  return createDefaultServiceCatalog(ownerRecord.services, ownerRecord.startingPrice);
};

const createSlotsFromOwner = (ownerRecord?: ShopOwnerRecord): AvailabilitySlot[] => {
  if (!ownerRecord) {
    return [];
  }

  if (ownerRecord.availabilitySlots.length > 0) {
    return ownerRecord.availabilitySlots;
  }

  return createDefaultAvailabilitySlots(ownerRecord.workingHours);
};

export default function VendorApp({ onExit, onLogout, ownerRecord, onOwnerRecordChange }: Props) {
  const [screen, setScreen] = useState<VendorScreen>("dashboard");
  const [services, setServices] = useState<VendorService[]>(createServicesFromOwner(ownerRecord));
  const [workingHours, setWorkingHours] = useState<WorkingHours>(ownerRecord?.workingHours ?? fallbackWorkingHours);
  const [slots, setSlots] = useState<AvailabilitySlot[]>(createSlotsFromOwner(ownerRecord));
  const [slotDuration, setSlotDuration] = useState<number>(ownerRecord?.slotDuration ?? 30);
  const [maxBookingsPerSlot, setMaxBookingsPerSlot] = useState<number>(ownerRecord?.maxBookingsPerSlot ?? 1);
  const [breakTime, setBreakTime] = useState<BreakTime | null>(ownerRecord?.breakTime ?? null);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>(ownerRecord?.blockedDates ?? []);
  const [profile, setProfile] = useState<VendorProfile>(createProfileFromOwner(ownerRecord));

  const upsertShop = useAction(api.auth_actions.upsertShop);
  const acceptBookingMutation = useMutation(api.bookings.acceptBooking);
  const verifyBookingOtpMutation = useMutation(api.bookings.verifyBookingOtp);
  const completeBookingMutation = useMutation(api.bookings.completeBooking);
  const cancelBookingMutation = useMutation(api.bookings.cancelBooking);

  // ── Live bookings from Convex (Paginated) ─────────────────────────────────
  const { results: convexBookingsRaw, status: bookingsStatus, loadMore: loadMoreBookings } = usePaginatedQuery(
    api.bookings.getShopBookingsByOwnerId,
    ownerRecord ? { ownerId: ownerRecord.userId } : "skip",
    { initialNumItems: 25 }
  );

  const bookingsLoading = bookingsStatus === "LoadingFirstPage";
  const canLoadMoreBookings = bookingsStatus === "CanLoadMore";
  const isLoadingMoreBookings = bookingsStatus === "LoadingMore";

  // Map to VendorBooking type (convex already returns the right shape)
  const bookings: VendorBooking[] = (convexBookingsRaw ?? []).map((b) => ({
    id: b.id,
    customerName: b.customerName,
    service: b.service,
    date: b.date,
    time: b.time,
    price: b.price,
    status: b.status as VendorBooking["status"],
    otp: b.otp,
    otpVerified: b.otpVerified,
  }));

  // ── Sync owner record from props ─────────────────────────────────────────
  useEffect(() => {
    setProfile(createProfileFromOwner(ownerRecord));
    setServices(createServicesFromOwner(ownerRecord));
    setWorkingHours(ownerRecord?.workingHours ?? fallbackWorkingHours);
    setSlotDuration(ownerRecord?.slotDuration ?? 30);
    setMaxBookingsPerSlot(ownerRecord?.maxBookingsPerSlot ?? 1);
    setBreakTime(ownerRecord?.breakTime ?? null);
    setSlots(createSlotsFromOwner(ownerRecord));
    setBlockedDates(ownerRecord?.blockedDates ?? []);
  }, [ownerRecord]);

  useEffect(() => {
    const handler = App.addListener("backButton", () => {
      const backMap: Partial<Record<VendorScreen, VendorScreen>> = {
        availability: "dashboard",
        earnings: "dashboard",
      };

      const previous = backMap[screen];
      if (previous) {
        setScreen(previous);
      } else if (["dashboard", "bookings", "services", "profile"].includes(screen)) {
        App.exitApp();
      }
    });

    return () => {
      handler.then(h => h.remove());
    };
  }, [screen]);

  const mainTabs: VendorTab[] = ["dashboard", "bookings", "services", "profile"];
  const showBottomNav = mainTabs.includes(screen as VendorTab);

  const todayBookings = (bookings ?? []).filter(isBookingToday);
  const pendingCount = (bookings ?? []).filter((booking) => booking.status === "pending").length;
  const todayEarnings = getTodayEarnings(bookings ?? []);
  const weeklyEarnings = getWeeklyEarnings(bookings);
  const monthlyEarnings = getMonthlyEarnings(bookings);
  const earningsHistory = [...bookings]
    .filter((booking) => booking.status === "completed")
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
  const totalEarnings = earningsHistory.reduce((sum, b) => sum + b.price, 0);

  // ── Booking status update via Convex mutation ─────────────────────────────
  
  const handleAcceptBooking = async (id: string) => {
    if (!ownerRecord) return;
    try {
      await acceptBookingMutation({ bookingId: id as Id<"bookings">, callerOwnerId: ownerRecord.firebaseUid || ownerRecord.userId });
    } catch (err: any) { alert(formatError(err)); }
  };

  const handleVerifyOtp = async (id: string, otp: number) => {
    if (!ownerRecord) return;
    try {
      await verifyBookingOtpMutation({ bookingId: id as Id<"bookings">, otp, callerOwnerId: ownerRecord.firebaseUid || ownerRecord.userId });
    } catch (err: any) { alert(formatError(err)); throw err; } // throw so UI can keep spinner or show error
  };

  const handleCompleteBooking = async (id: string) => {
    if (!ownerRecord) return;
    try {
      await completeBookingMutation({ bookingId: id as Id<"bookings">, callerOwnerId: ownerRecord.firebaseUid || ownerRecord.userId });
    } catch (err: any) { alert(formatError(err)); }
  };

  const handleCancelBooking = async (id: string) => {
    if (!ownerRecord) return;
    try {
      await cancelBookingMutation({ bookingId: id as Id<"bookings">, callerOwnerId: ownerRecord.firebaseUid || ownerRecord.userId });
    } catch (err: any) { alert(formatError(err)); }
  };

  // ── Shop data sync to Convex ──────────────────────────────────────────────
  const syncOwnerRecord = (
    nextProfile: VendorProfile = profile,
    nextServices: VendorService[] = services,
    nextWorkingHours: WorkingHours = workingHours,
    nextSlotDuration: number = slotDuration,
    nextMaxBookingsPerSlot: number = maxBookingsPerSlot,
    nextBreakTime: BreakTime | null = breakTime,
    nextSlots: AvailabilitySlot[] = slots,
    nextBlockedDates: BlockedDate[] = blockedDates
  ) => {
    if (!ownerRecord || !onOwnerRecordChange) {
      return;
    }

    const updatedRecord: ShopOwnerRecord = {
      ...ownerRecord,
      name: nextProfile.ownerName,
      phone: nextProfile.phone,
      shopName: nextProfile.shopName,
      address: nextProfile.address,
      services: nextServices.map((service) => service.name),
      serviceCatalog: nextServices,
      startingPrice:
        nextServices.length > 0
          ? Math.min(...nextServices.map((service) => service.price))
          : ownerRecord.startingPrice,
      workingHours: nextWorkingHours,
      slotDuration: nextSlotDuration,
      maxBookingsPerSlot: nextMaxBookingsPerSlot,
      breakTime: nextBreakTime ?? undefined,
      availabilitySlots: nextSlots,
      blockedDates: nextBlockedDates,
      images: nextProfile.images,
      image: nextProfile.images[0] ?? ownerRecord.image,
    };

    onOwnerRecordChange(updatedRecord);

    // Parse GPS coordinates from stored gpsLocation string
    const gpsMatch = ownerRecord.gpsLocation?.match(
      /Lat\s*(-?\d+(?:\.\d+)?),\s*Lng\s*(-?\d+(?:\.\d+)?)/i
    );
    const lat = gpsMatch ? Number(gpsMatch[1]) : 0;
    const lng = gpsMatch ? Number(gpsMatch[2]) : 0;
    const nextSlot = nextSlots.find((s) => s.enabled)?.time ?? "Not available";

    // Sync to Convex using relational fields (purified)
    upsertShop({
      ownerId: ownerRecord.userId,
      shopName: nextProfile.shopName,
      address: nextProfile.address,
      lat,
      lng,
      phone: nextProfile.phone,
      image: nextProfile.images[0] ?? ownerRecord.image,
      images: nextProfile.images,
      startingPrice: updatedRecord.startingPrice,
      openTime: nextWorkingHours.start,
      closeTime: nextWorkingHours.end,
      slotDuration: nextSlotDuration,
      maxBookingsPerSlot: nextMaxBookingsPerSlot,
      breakTime: nextBreakTime ?? undefined,
      nextSlot,
      gpsLocation: ownerRecord.gpsLocation,
      locationLabel: ownerRecord.location,
      firebaseUid: ownerRecord.firebaseUid,
      services: nextServices.map(s => ({
        name: s.name,
        price: Number(s.price),
        duration: Number(s.durationMinutes)
      })),
      blockedDates: nextBlockedDates.map(b => ({
        date: b.date,
        reason: b.reason
      })),
    }).catch(console.error);
  };

  const createService = (service: Omit<VendorService, "id">) => {
    const nextServices = [
      ...services,
      {
        id: `service-${Date.now()}`,
        ...service,
      },
    ];
    setServices(nextServices);
    syncOwnerRecord(profile, nextServices, workingHours, slotDuration, maxBookingsPerSlot, breakTime, slots, blockedDates);
  };

  const updateService = (id: string, nextService: Omit<VendorService, "id">) => {
    const nextServices = services.map((service) =>
      service.id === id ? { ...service, ...nextService } : service
    );
    setServices(nextServices);
    syncOwnerRecord(profile, nextServices, workingHours, slotDuration, maxBookingsPerSlot, breakTime, slots, blockedDates);
  };

  const deleteService = (id: string) => {
    const nextServices = services.filter((service) => service.id !== id);
    setServices(nextServices);
    syncOwnerRecord(profile, nextServices, workingHours, slotDuration, maxBookingsPerSlot, breakTime, slots, blockedDates);
  };

  const toggleSlot = (id: string) => {
    const nextSlots = slots.map((slot) => (slot.id === id ? { ...slot, enabled: !slot.enabled } : slot));
    setSlots(nextSlots);
    syncOwnerRecord(profile, services, workingHours, slotDuration, maxBookingsPerSlot, breakTime, nextSlots, blockedDates);
  };

  const toggleAllSlots = (enabled: boolean) => {
    const nextSlots = slots.map((slot) => ({ ...slot, enabled }));
    setSlots(nextSlots);
    syncOwnerRecord(profile, services, workingHours, slotDuration, maxBookingsPerSlot, breakTime, nextSlots, blockedDates);
  };

  const handleSaveProfile = (nextProfile: VendorProfile) => {
    setProfile(nextProfile);
    syncOwnerRecord(nextProfile, services, workingHours, slotDuration, maxBookingsPerSlot, breakTime, slots, blockedDates);
  };

  const handleUpdateAvailabilitySettings = (
    nextWorkingHours: WorkingHours,
    nextSlotDuration: number,
    nextBreakTime: BreakTime | null
  ) => {
    const nextSlots = createDefaultAvailabilitySlots(nextWorkingHours, nextSlotDuration, nextBreakTime).map((slot) => {
      const existingSlot = slots.find((current) => current.time === slot.time);
      return existingSlot ? { ...slot, enabled: existingSlot.enabled } : slot;
    });

    setWorkingHours(nextWorkingHours);
    setSlotDuration(nextSlotDuration);
    setBreakTime(nextBreakTime);
    setSlots(nextSlots);
    syncOwnerRecord(profile, services, nextWorkingHours, nextSlotDuration, maxBookingsPerSlot, nextBreakTime, nextSlots, blockedDates);
  };

  const handleUpdateMaxBookings = (nextMaxBookingsPerSlot: number) => {
    setMaxBookingsPerSlot(nextMaxBookingsPerSlot);
    syncOwnerRecord(profile, services, workingHours, slotDuration, nextMaxBookingsPerSlot, breakTime, slots, blockedDates);
  };

  const addBlockedDate = (blockedDate: Omit<BlockedDate, "id">) => {
    const nextBlockedDates = [
      ...blockedDates,
      {
        id: `blocked-${Date.now()}`,
        ...blockedDate,
      },
    ];
    setBlockedDates(nextBlockedDates);
    syncOwnerRecord(profile, services, workingHours, slotDuration, maxBookingsPerSlot, breakTime, slots, nextBlockedDates);
  };

  const removeBlockedDate = (id: string) => {
    const nextBlockedDates = blockedDates.filter((entry) => entry.id !== id);
    setBlockedDates(nextBlockedDates);
    syncOwnerRecord(profile, services, workingHours, slotDuration, maxBookingsPerSlot, breakTime, slots, nextBlockedDates);
  };


  return (
    <>
      {screen === "dashboard" && (
        <DashboardScreen
          shopName={profile.shopName}
          dateLabel={formatHeaderDate()}
          todayBookings={todayBookings}
          pendingCount={pendingCount}
          earningsToday={todayEarnings}
          bookingsLoading={bookingsLoading}
          onAcceptBooking={handleAcceptBooking}
          onRejectBooking={handleCancelBooking}
          onStartBooking={handleVerifyOtp}
          onCompleteBooking={handleCompleteBooking}
          onCancelBooking={handleCancelBooking}
          onOpenAvailability={() => setScreen("availability")}
          onOpenEarnings={() => setScreen("earnings")}
          onOpenBookings={() => setScreen("bookings")}
        />
      )}

      {screen === "bookings" && (
        <BookingsScreen
          bookings={bookings}
          bookingsLoading={bookingsLoading}
          canLoadMore={canLoadMoreBookings}
          isLoadingMore={isLoadingMoreBookings}
          onLoadMore={() => loadMoreBookings(25)}
          onAcceptBooking={handleAcceptBooking}
          onRejectBooking={handleCancelBooking}
          onCompleteBooking={handleCompleteBooking}
          onStartBooking={handleVerifyOtp}
          onCancelBooking={handleCancelBooking}
        />
      )}

      {screen === "services" && (
        <ServicesScreen
          services={services}
          onCreateService={createService}
          onUpdateService={updateService}
          onDeleteService={deleteService}
          onOpenAvailability={() => setScreen("availability")}
        />
      )}

      {screen === "profile" && (
        <ProfileScreen ownerId={ownerRecord?.userId ?? ""} profile={profile} onSaveProfile={handleSaveProfile} onExit={onExit} onLogout={onLogout} />
      )}

      {screen === "availability" && (
        <AvailabilityScreen
          slots={slots}
          workingHours={workingHours}
          slotDuration={slotDuration}
          maxBookingsPerSlot={maxBookingsPerSlot}
          breakTime={breakTime}
          blockedDates={blockedDates}
          onBack={() => setScreen("dashboard")}
          onToggleSlot={toggleSlot}
          onToggleAllSlots={toggleAllSlots}
          onUpdateSettings={handleUpdateAvailabilitySettings}
          onUpdateMaxBookings={handleUpdateMaxBookings}
          onAddBlockedDate={addBlockedDate}
          onRemoveBlockedDate={removeBlockedDate}
        />
      )}

      {screen === "earnings" && (
        <EarningsScreen
          todayEarnings={todayEarnings}
          weeklyEarnings={weeklyEarnings}
          monthlyEarnings={monthlyEarnings}
          totalEarnings={totalEarnings}
          history={earningsHistory}
          onBack={() => setScreen("dashboard")}
        />
      )}

      {showBottomNav && <VendorBottomNav active={screen as VendorTab} onTab={setScreen} />}
    </>
  );
}
