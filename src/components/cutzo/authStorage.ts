import { CustomerRecord } from "./types";

interface CutzoCustomerDatabase {
  users: Record<string, CustomerRecord>;
}

const DATABASE_KEY = "cutzo_customer_db";
const SESSION_KEY = "cutzo_customer_session";

const emptyDatabase = (): CutzoCustomerDatabase => ({ users: {} });

const hasWindow = () => typeof window !== "undefined";

export const readCustomerDatabase = (): CutzoCustomerDatabase => {
  if (!hasWindow()) {
    return emptyDatabase();
  }

  const raw = window.localStorage.getItem(DATABASE_KEY);

  if (!raw) {
    return emptyDatabase();
  }

  try {
    const parsed = JSON.parse(raw) as CutzoCustomerDatabase;
    return parsed?.users ? parsed : emptyDatabase();
  } catch {
    return emptyDatabase();
  }
};

const writeCustomerDatabase = (database: CutzoCustomerDatabase) => {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.setItem(DATABASE_KEY, JSON.stringify(database));
};

export const saveCustomer = (user: CustomerRecord) => {
  const database = readCustomerDatabase();
  database.users[user.userId] = user;
  writeCustomerDatabase(database);
  return user;
};

export const findCustomerByPhone = (phone: string) => {
  const users = Object.values(readCustomerDatabase().users);
  return users.find((user) => user.phone === phone) ?? null;
};

export const getCustomerById = (userId: string) => {
  return readCustomerDatabase().users[userId] ?? null;
};

export const setCustomerSession = (userId: string) => {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.setItem(SESSION_KEY, userId);
};

export const clearCustomerSession = () => {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.removeItem(SESSION_KEY);
};

export const getActiveCustomer = () => {
  if (!hasWindow()) {
    return null;
  }

  const userId = window.localStorage.getItem(SESSION_KEY);
  return userId ? getCustomerById(userId) : null;
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
