export interface ShopOwnerRecord {
  userId: string;
  role: "shop_owner";
  name: string;
  phone: string;
  shopName: string;
  location: string;
  address: string;
  services: string[];
  startingPrice: number;
  workingHours: {
    start: string;
    end: string;
  };
  image?: string;
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

export const readDatabase = (): TrimoDatabase => {
  if (!hasWindow()) {
    return emptyDatabase();
  }

  const raw = window.localStorage.getItem(DATABASE_KEY);

  if (!raw) {
    return emptyDatabase();
  }

  try {
    const parsed = JSON.parse(raw) as TrimoDatabase;
    return parsed?.users ? parsed : emptyDatabase();
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
  database.users[user.userId] = user;
  writeDatabase(database);
  return user;
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
  const digits = value.replace(/\D/g, "").slice(-10);

  if (digits.length <= 5) {
    return digits;
  }

  return `${digits.slice(0, 5)} ${digits.slice(5)}`;
};
