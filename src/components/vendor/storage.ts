import { formatHourLabel } from "./utils";
import {
  AvailabilitySlot,
  BlockedDate,
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
  availabilitySlots: AvailabilitySlot[];
  blockedDates: BlockedDate[];
  image?: string;
  images: string[];
  gpsLocation?: string;
  createdAt: string;
  authProvider: "phone" | "google";
}

interface TrimoDatabase {
  users: Record<string, ShopOwnerRecord>;
}

const DATABASE_KEY = "trimo_shop_owner_db";
const SESSION_KEY = "trimo_shop_owner_session";

const emptyDatabase = (): TrimoDatabase => ({ users: {} });

const hasWindow = () => typeof window !== "undefined";

const defaultWorkingHours: WorkingHours = {
  start: "09:00",
  end: "21:00",
};

const hourRange = (start: number, end: number) => {
  const slots: number[] = [];

  for (let hour = start; hour < end; hour += 1) {
    slots.push(hour);
  }

  return slots;
};

export const createDefaultAvailabilitySlots = (workingHours: WorkingHours): AvailabilitySlot[] => {
  const startHour = Number.parseInt(workingHours.start.split(":")[0] ?? "9", 10);
  const endHour = Number.parseInt(workingHours.end.split(":")[0] ?? "21", 10);
  const safeStart = Number.isFinite(startHour) ? startHour : 9;
  const safeEnd = Number.isFinite(endHour) ? endHour : 21;
  const hours = safeEnd > safeStart ? hourRange(safeStart, safeEnd) : hourRange(9, 21);

  return hours.map((hour, index) => ({
    id: `slot-${index + 1}`,
    time: formatHourLabel(`${String(hour).padStart(2, "0")}:00`),
    enabled: true,
  }));
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
      : createDefaultAvailabilitySlots(workingHours);

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
    availabilitySlots,
    blockedDates: user.blockedDates ?? [],
    image: images[0] ?? user.image,
    images,
    gpsLocation: user.gpsLocation,
    createdAt: user.createdAt ?? new Date().toISOString(),
    authProvider: user.authProvider ?? "phone",
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
};

export const clearShopOwnerSession = () => {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.removeItem(SESSION_KEY);
};

export const getActiveShopOwner = () => {
  if (!hasWindow()) {
    return null;
  }

  const userId = window.localStorage.getItem(SESSION_KEY);
  return userId ? getShopOwnerById(userId) : null;
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
