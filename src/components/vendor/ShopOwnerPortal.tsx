import { useState } from "react";
import ShopOwnerAuth from "./ShopOwnerAuth";
import { getActiveShopOwner, saveShopOwner, ShopOwnerRecord } from "./storage";
import VendorApp from "./VendorApp";

interface Props {
  onBackToCustomer: () => void;
}

export default function ShopOwnerPortal({ onBackToCustomer }: Props) {
  const [activeOwner, setActiveOwner] = useState<ShopOwnerRecord | null>(() => getActiveShopOwner());

  const handleAuthenticated = (user: ShopOwnerRecord) => {
    setActiveOwner(user);
  };

  const handleOwnerUpdate = (user: ShopOwnerRecord) => {
    saveShopOwner(user);
    setActiveOwner(user);
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
      ownerRecord={activeOwner}
      onOwnerRecordChange={handleOwnerUpdate}
    />
  );
}
