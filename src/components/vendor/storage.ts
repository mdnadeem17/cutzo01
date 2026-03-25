import { formatHourLabel } from "./utils";
import {
  AvailabilitySlot,
  BlockedDate,
  BreakTime,
  VendorService,
  WorkingHours,
} from "./types";

export interface ShopOwnerRecord {
  userId: string;
  role: "shop_owner";
  name: string;
  phone: string;
  shopName: string;
  location: string;
  address: string;
  services: string[];
  serviceCatalog: VendorService[];
  startingPrice: number;
  workingHours: WorkingHours;
  slotDuration: number;
  maxBookingsPerSlot: number;
  breakTime?: BreakTime | null;
  availabilitySlots: AvailabilitySlot[];
  blockedDates: BlockedDate[];
  image?: string;
  images: string[];
  gpsLocation?: string;
  createdAt: string;
  authProvider: "phone" | "google";
  firebaseUid?: string;
}

interface TrimoDatabase {
  users: Record<string, ShopOwnerRecord>;
}

const DATABASE_KEY = "trimo_shop_owner_db";
const SESSION_KEY = "trimo_shop_owner_session";
const SESSION_EXPIRY_KEY = "trimo_shop_owner_session_expiry";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

const emptyDatabase = (): TrimoDatabase => ({ users: {} });

const hasWindow = () => typeof window !== "undefined";

const defaultWorkingHours: WorkingHours = {
  start: "09:00",
  end: "21:00",
};

export const createDefaultAvailabilitySlots = (
  workingHours: WorkingHours,
  slotDuration: number = 30,
  breakTime?: BreakTime | null
): AvailabilitySlot[] => {
  const [startHourStr, startMinStr] = workingHours.start.split(":");
  const [endHourStr, endMinStr] = workingHours.end.split(":");
  const startHour = Number.parseInt(startHourStr ?? "9", 10);
  const startMin = Number.parseInt(startMinStr ?? "0", 10);
  const endHour = Number.parseInt(endHourStr ?? "21", 10);
  const endMin = Number.parseInt(endMinStr ?? "0", 10);

  const safeStart = Number.isFinite(startHour) ? startHour : 9;
  const safeEnd = Number.isFinite(endHour) ? endHour : 21;

  let currentMinutes = safeStart * 60 + (Number.isFinite(startMin) ? startMin : 0);
  const endMinutes = safeEnd * 60 + (Number.isFinite(endMin) ? endMin : 0);

  let breakStartMinutes = -1;
  let breakEndMinutes = -1;
  if (breakTime?.start && breakTime?.end) {
    const [bStartH, bStartM] = breakTime.start.split(":");
    const [bEndH, bEndM] = breakTime.end.split(":");
    breakStartMinutes = Number.parseInt(bStartH, 10) * 60 + Number.parseInt(bStartM, 10);
    breakEndMinutes = Number.parseInt(bEndH, 10) * 60 + Number.parseInt(bEndM, 10);
  }

  const duration = slotDuration > 0 ? slotDuration : 30;
  const slots: AvailabilitySlot[] = [];
  let index = 1;

  while (currentMinutes + duration <= endMinutes) {
    const slotStartMinutes = currentMinutes;
    const slotEndMinutes = currentMinutes + duration;

    const isDuringBreak = breakStartMinutes !== -1 && breakEndMinutes !== -1 && 
      !(slotEndMinutes <= breakStartMinutes || slotStartMinutes >= breakEndMinutes);

    if (!isDuringBreak) {
      const h = Math.floor(slotStartMinutes / 60);
      const m = slotStartMinutes % 60;
      const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      slots.push({
        id: `slot-${index}`,
        time: formatHourLabel(timeStr),
        enabled: true,
      });
      index++;
    }
    currentMinutes += duration;
  }

  return slots;
};

export const createDefaultServiceCatalog = (
  serviceNames: string[],
  startingPrice: number
): VendorService[] =>
  serviceNames
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name, index) => ({
      id: `service-${index + 1}`,
      name,
      durationMinutes: 30,
      price: startingPrice > 0 ? startingPrice : 0,
    }));

const normalizeShopOwnerRecord = (user: Partial<ShopOwnerRecord>): ShopOwnerRecord => {
  const workingHours = user.workingHours ?? defaultWorkingHours;
  const serviceCatalog =
    user.serviceCatalog && user.serviceCatalog.length > 0
      ? user.serviceCatalog
      : createDefaultServiceCatalog(user.services ?? [], user.startingPrice ?? 0);
  const images =
    user.images && user.images.length > 0
      ? user.images.filter(Boolean)
      : user.image
        ? [user.image]
        : [];
  const availabilitySlots =
    user.availabilitySlots && user.availabilitySlots.length > 0
      ? user.availabilitySlots
      : createDefaultAvailabilitySlots(workingHours, user.slotDuration, user.breakTime);

  return {
    userId: user.userId ?? `owner-${Date.now()}`,
    role: "shop_owner",
    name: user.name ?? "",
    phone: user.phone ?? "",
    shopName: user.shopName ?? "",
    location: user.location ?? "",
    address: user.address ?? "",
    services: serviceCatalog.map((service) => service.name),
    serviceCatalog,
    startingPrice:
      serviceCatalog.length > 0
        ? Math.min(...serviceCatalog.map((service) => service.price))
        : user.startingPrice ?? 0,
    workingHours,
    slotDuration: user.slotDuration ?? 30,
    maxBookingsPerSlot: user.maxBookingsPerSlot ?? 1,
    breakTime: user.breakTime ?? null,
    availabilitySlots,
    blockedDates: user.blockedDates ?? [],
    image: images[0] ?? user.image,
    images,
    gpsLocation: user.gpsLocation,
    createdAt: user.createdAt ?? new Date().toISOString(),
    authProvider: user.authProvider ?? "phone",
    firebaseUid: user.firebaseUid,
  };
};

export const readDatabase = (): TrimoDatabase => {
  if (!hasWindow()) {
    return emptyDatabase();
  }

  const raw = window.localStorage.getItem(DATABASE_KEY);

  if (!raw) {
    return emptyDatabase();
  }

  try {
    const parsed = JSON.parse(raw) as { users?: Record<string, Partial<ShopOwnerRecord>> };
    const users = Object.fromEntries(
      Object.entries(parsed?.users ?? {}).map(([userId, user]) => [
        userId,
        normalizeShopOwnerRecord({ ...user, userId }),
      ])
    );

    return { users };
  } catch {
    return emptyDatabase();
  }
};

const writeDatabase = (database: TrimoDatabase) => {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.setItem(DATABASE_KEY, JSON.stringify(database));
};

export const saveShopOwner = (user: ShopOwnerRecord) => {
  const database = readDatabase();
  const normalizedUser = normalizeShopOwnerRecord(user);
  database.users[normalizedUser.userId] = normalizedUser;
  writeDatabase(database);
  return normalizedUser;
};

export const findShopOwnerByPhone = (phone: string) => {
  const users = Object.values(readDatabase().users);
  return users.find((user) => user.phone === phone) ?? null;
};

export const getShopOwnerById = (userId: string) => {
  return readDatabase().users[userId] ?? null;
};

export const setShopOwnerSession = (userId: string) => {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.setItem(SESSION_KEY, userId);
  window.localStorage.setItem(
    SESSION_EXPIRY_KEY,
    String(Date.now() + SESSION_TTL_MS)
  );
};

export const clearShopOwnerSession = () => {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.removeItem(SESSION_KEY);
  window.localStorage.removeItem(SESSION_EXPIRY_KEY);
};

export const getActiveShopOwner = () => {
  if (!hasWindow()) {
    return null;
  }

  const userId = window.localStorage.getItem(SESSION_KEY);
  if (!userId) return null;

  // Session expiry check
  const expiryStr = window.localStorage.getItem(SESSION_EXPIRY_KEY);
  const expiry = expiryStr ? Number(expiryStr) : 0;
  if (Date.now() > expiry) {
    // Session expired — clear it silently
    clearShopOwnerSession();
    return null;
  }

  return getShopOwnerById(userId);
};

export const normalizePhone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  const localNumber = digits.length > 10 ? digits.slice(-10) : digits;

  if (localNumber.length !== 10) {
    return "";
  }

  return `+91${localNumber}`;
};

export const formatPhoneForInput = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 10);

  if (digits.length <= 5) {
    return digits;
  }

  return `${digits.slice(0, 5)} ${digits.slice(5)}`;
};
