import { useState } from "react";
import {
  initialAvailabilitySlots,
  initialBlockedDates,
  initialVendorBookings,
  initialVendorProfile,
  initialVendorServices,
  initialWorkingHours,
} from "./data";
import AvailabilityScreen from "./AvailabilityScreen";
import BookingsScreen from "./BookingsScreen";
import DashboardScreen from "./DashboardScreen";
import EarningsScreen from "./EarningsScreen";
import ProfileScreen from "./ProfileScreen";
import ServicesScreen from "./ServicesScreen";
import VendorBottomNav from "./VendorBottomNav";
import { ShopOwnerRecord } from "./storage";
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

const createProfileFromOwner = (ownerRecord?: ShopOwnerRecord): VendorProfile => {
  if (!ownerRecord) {
    return initialVendorProfile;
  }

  return {
    shopName: ownerRecord.shopName || initialVendorProfile.shopName,
    ownerName: ownerRecord.name || initialVendorProfile.ownerName,
    address: ownerRecord.address || initialVendorProfile.address,
    phone: ownerRecord.phone || initialVendorProfile.phone,
    images: ownerRecord.image
      ? [ownerRecord.image, ...initialVendorProfile.images.slice(0, 2)]
      : initialVendorProfile.images,
  };
};

const createServicesFromOwner = (ownerRecord?: ShopOwnerRecord): VendorService[] => {
  if (!ownerRecord || ownerRecord.services.length === 0) {
    return initialVendorServices;
  }

  return ownerRecord.services.map((serviceName, index) => ({
    id: `service-${index + 1}`,
    name: serviceName,
    durationMinutes: index % 2 === 0 ? 30 : 45,
    price: ownerRecord.startingPrice + index * 80,
  }));
};

export default function VendorApp({ onExit, ownerRecord, onOwnerRecordChange }: Props) {
  const [screen, setScreen] = useState<VendorScreen>("dashboard");
  const [bookings, setBookings] = useState<VendorBooking[]>(initialVendorBookings);
  const [services, setServices] = useState<VendorService[]>(createServicesFromOwner(ownerRecord));
  const [slots, setSlots] = useState<AvailabilitySlot[]>(initialAvailabilitySlots);
  const [workingHours, setWorkingHours] = useState<WorkingHours>(
    ownerRecord?.workingHours ?? initialWorkingHours
  );
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>(initialBlockedDates);
  const [profile, setProfile] = useState<VendorProfile>(createProfileFromOwner(ownerRecord));

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
    nextWorkingHours: WorkingHours = workingHours
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
      startingPrice:
        nextServices.length > 0
          ? Math.min(...nextServices.map((service) => service.price))
          : ownerRecord.startingPrice,
      workingHours: nextWorkingHours,
      image: nextProfile.images[0] ?? ownerRecord.image,
    });
  };

  const updateBookingStatus = (id: string, status: VendorBooking["status"]) => {
    setBookings((current) =>
      current.map((booking) => (booking.id === id ? { ...booking, status } : booking))
    );
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
    syncOwnerRecord(profile, nextServices, workingHours);
  };

  const updateService = (id: string, nextService: Omit<VendorService, "id">) => {
    const nextServices = services.map((service) =>
      service.id === id ? { ...service, ...nextService } : service
    );
    setServices(nextServices);
    syncOwnerRecord(profile, nextServices, workingHours);
  };

  const deleteService = (id: string) => {
    const nextServices = services.filter((service) => service.id !== id);
    setServices(nextServices);
    syncOwnerRecord(profile, nextServices, workingHours);
  };

  const toggleSlot = (id: string) => {
    setSlots((current) =>
      current.map((slot) => (slot.id === id ? { ...slot, enabled: !slot.enabled } : slot))
    );
  };

  const handleSaveProfile = (nextProfile: VendorProfile) => {
    setProfile(nextProfile);
    syncOwnerRecord(nextProfile, services, workingHours);
  };

  const handleUpdateWorkingHours = (nextWorkingHours: WorkingHours) => {
    setWorkingHours(nextWorkingHours);
    syncOwnerRecord(profile, services, nextWorkingHours);
  };

  const addBlockedDate = (blockedDate: Omit<BlockedDate, "id">) => {
    setBlockedDates((current) => [
      ...current,
      {
        id: `blocked-${Date.now()}`,
        ...blockedDate,
      },
    ]);
  };

  const removeBlockedDate = (id: string) => {
    setBlockedDates((current) => current.filter((entry) => entry.id !== id));
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
        <ProfileScreen
          profile={profile}
          onSaveProfile={handleSaveProfile}
          onExit={onExit}
        />
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

      {showBottomNav && (
        <VendorBottomNav active={screen as VendorTab} onTab={setScreen} />
      )}
    </>
  );
}
