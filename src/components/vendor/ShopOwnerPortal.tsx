import { useState } from "react";
import ShopOwnerAuth from "./ShopOwnerAuth";
import { clearShopOwnerSession, getActiveShopOwner, saveShopOwner, ShopOwnerRecord } from "./storage";
import VendorApp from "./VendorApp";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface Props {
  onBackToCustomer: () => void;
}

export default function ShopOwnerPortal({ onBackToCustomer }: Props) {
  const [activeOwner, setActiveOwner] = useState<ShopOwnerRecord | null>(() => getActiveShopOwner());

  usePushNotifications({ ownerId: activeOwner?.userId });

  const handleAuthenticated = (user: ShopOwnerRecord) => {
    setActiveOwner(user);
  };

  const handleOwnerUpdate = (user: ShopOwnerRecord) => {
    saveShopOwner(user);
    setActiveOwner(user);
  };

  const handleLogout = async () => {
    try {
      const { auth } = await import("../../lib/firebase");
      await auth.signOut();
    } catch (e) {
      console.warn("Vendor signOut error:", e);
    }
    clearShopOwnerSession();
    setActiveOwner(null);
  };

  if (!activeOwner) {
    return (
      <ShopOwnerAuth
        onBack={onBackToCustomer}
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  return (
    <VendorApp
      onExit={onBackToCustomer}
      onLogout={handleLogout}
      ownerRecord={activeOwner}
      onOwnerRecordChange={handleOwnerUpdate}
    />
  );
}
