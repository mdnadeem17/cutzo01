import { useEffect, useState } from "react";
import { loadVendorBookings, updateStoredBookingStatus } from "../trimo/marketplaceStorage";
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

interface Props {
  onExit: () => void;
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

export default function VendorApp({ onExit, ownerRecord, onOwnerRecordChange }: Props) {
  const [screen, setScreen] = useState<VendorScreen>("dashboard");
  const [bookings, setBookings] = useState<VendorBooking[]>([]);
  const [services, setServices] = useState<VendorService[]>(createServicesFromOwner(ownerRecord));
  const [workingHours, setWorkingHours] = useState<WorkingHours>(
    ownerRecord?.workingHours ?? fallbackWorkingHours
  );
  const [slots, setSlots] = useState<AvailabilitySlot[]>(createSlotsFromOwner(ownerRecord));
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>(ownerRecord?.blockedDates ?? []);
  const [profile, setProfile] = useState<VendorProfile>(createProfileFromOwner(ownerRecord));

  useEffect(() => {
    setProfile(createProfileFromOwner(ownerRecord));
    setServices(createServicesFromOwner(ownerRecord));
    setWorkingHours(ownerRecord?.workingHours ?? fallbackWorkingHours);
    setSlots(createSlotsFromOwner(ownerRecord));
    setBlockedDates(ownerRecord?.blockedDates ?? []);
    setBookings(ownerRecord ? loadVendorBookings(ownerRecord.userId) : []);
  }, [ownerRecord]);

  const mainTabs: VendorTab[] = ["dashboard", "bookings", "services", "profile"];
  const showBottomNav = mainTabs.includes(screen as VendorTab);

  const todayBookings = bookings.filter(isBookingToday);
  const pendingCount = bookings.filter((booking) => booking.status === "pending").length;
  const todayEarnings = getTodayEarnings(bookings);
  const weeklyEarnings = getWeeklyEarnings(bookings);
  const monthlyEarnings = getMonthlyEarnings(bookings);
  const earningsHistory = [...bookings]
    .filter((booking) => booking.status === "completed")
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());

  const syncOwnerRecord = (
    nextProfile: VendorProfile = profile,
    nextServices: VendorService[] = services,
    nextWorkingHours: WorkingHours = workingHours,
    nextSlots: AvailabilitySlot[] = slots,
    nextBlockedDates: BlockedDate[] = blockedDates
  ) => {
    if (!ownerRecord || !onOwnerRecordChange) {
      return;
    }

    onOwnerRecordChange({
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
      availabilitySlots: nextSlots,
      blockedDates: nextBlockedDates,
      images: nextProfile.images,
      image: nextProfile.images[0] ?? ownerRecord.image,
    });
  };

  const refreshBookings = () => {
    if (!ownerRecord) {
      setBookings([]);
      return;
    }

    setBookings(loadVendorBookings(ownerRecord.userId));
  };

  const updateBookingStatus = (id: string, status: VendorBooking["status"]) => {
    updateStoredBookingStatus(id, status);
    refreshBookings();
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
    syncOwnerRecord(profile, nextServices, workingHours, slots, blockedDates);
  };

  const updateService = (id: string, nextService: Omit<VendorService, "id">) => {
    const nextServices = services.map((service) =>
      service.id === id ? { ...service, ...nextService } : service
    );
    setServices(nextServices);
    syncOwnerRecord(profile, nextServices, workingHours, slots, blockedDates);
  };

  const deleteService = (id: string) => {
    const nextServices = services.filter((service) => service.id !== id);
    setServices(nextServices);
    syncOwnerRecord(profile, nextServices, workingHours, slots, blockedDates);
  };

  const toggleSlot = (id: string) => {
    const nextSlots = slots.map((slot) => (slot.id === id ? { ...slot, enabled: !slot.enabled } : slot));
    setSlots(nextSlots);
    syncOwnerRecord(profile, services, workingHours, nextSlots, blockedDates);
  };

  const handleSaveProfile = (nextProfile: VendorProfile) => {
    setProfile(nextProfile);
    syncOwnerRecord(nextProfile, services, workingHours, slots, blockedDates);
  };

  const handleUpdateWorkingHours = (nextWorkingHours: WorkingHours) => {
    const nextSlots = createDefaultAvailabilitySlots(nextWorkingHours).map((slot) => {
      const existingSlot = slots.find((current) => current.time === slot.time);
      return existingSlot ? { ...slot, enabled: existingSlot.enabled } : slot;
    });

    setWorkingHours(nextWorkingHours);
    setSlots(nextSlots);
    syncOwnerRecord(profile, services, nextWorkingHours, nextSlots, blockedDates);
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
    syncOwnerRecord(profile, services, workingHours, slots, nextBlockedDates);
  };

  const removeBlockedDate = (id: string) => {
    const nextBlockedDates = blockedDates.filter((entry) => entry.id !== id);
    setBlockedDates(nextBlockedDates);
    syncOwnerRecord(profile, services, workingHours, slots, nextBlockedDates);
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
          onAcceptBooking={(id) => updateBookingStatus(id, "confirmed")}
          onRejectBooking={(id) => updateBookingStatus(id, "cancelled")}
          onOpenAvailability={() => setScreen("availability")}
          onOpenEarnings={() => setScreen("earnings")}
          onOpenBookings={() => setScreen("bookings")}
        />
      )}

      {screen === "bookings" && (
        <BookingsScreen
          bookings={bookings}
          onAcceptBooking={(id) => updateBookingStatus(id, "confirmed")}
          onRejectBooking={(id) => updateBookingStatus(id, "cancelled")}
          onCompleteBooking={(id) => updateBookingStatus(id, "completed")}
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
        <ProfileScreen profile={profile} onSaveProfile={handleSaveProfile} onExit={onExit} />
      )}

      {screen === "availability" && (
        <AvailabilityScreen
          slots={slots}
          workingHours={workingHours}
          blockedDates={blockedDates}
          onBack={() => setScreen("dashboard")}
          onToggleSlot={toggleSlot}
          onUpdateWorkingHours={handleUpdateWorkingHours}
          onAddBlockedDate={addBlockedDate}
          onRemoveBlockedDate={removeBlockedDate}
        />
      )}

      {screen === "earnings" && (
        <EarningsScreen
          todayEarnings={todayEarnings}
          weeklyEarnings={weeklyEarnings}
          monthlyEarnings={monthlyEarnings}
          history={earningsHistory}
          onBack={() => setScreen("dashboard")}
        />
      )}

      {showBottomNav && <VendorBottomNav active={screen as VendorTab} onTab={setScreen} />}
    </>
  );
}
