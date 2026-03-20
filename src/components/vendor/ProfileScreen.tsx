import { ImageIcon, MapPin, Pencil, Phone, Store, User } from "lucide-react";
import { useState } from "react";
import { VendorProfile } from "./types";

interface Props {
  profile: VendorProfile;
  onSaveProfile: (profile: VendorProfile) => void;
  onExit: () => void;
}

interface ProfileDraft {
  shopName: string;
  ownerName: string;
  address: string;
  phone: string;
  imageOne: string;
  imageTwo: string;
  imageThree: string;
}

const createDraft = (profile: VendorProfile): ProfileDraft => ({
  shopName: profile.shopName,
  ownerName: profile.ownerName,
  address: profile.address,
  phone: profile.phone,
  imageOne: profile.images[0] ?? "",
  imageTwo: profile.images[1] ?? "",
  imageThree: profile.images[2] ?? "",
});

function InfoCard({
  label,
  value,
  Icon,
}: {
  label: string;
  value: string;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-[16px] bg-card p-4 card-shadow">
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
          style={{ background: "hsl(var(--primary) / 0.08)" }}
        >
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 text-sm font-bold text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function ProfileScreen({ profile, onSaveProfile, onExit }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<ProfileDraft>(createDraft(profile));

  const openEdit = () => {
    setDraft(createDraft(profile));
    setIsEditing(true);
  };

  const handleSave = () => {
    const nextImages = [draft.imageOne, draft.imageTwo, draft.imageThree]
      .map((value) => value.trim())
      .filter(Boolean);

    onSaveProfile({
      shopName: draft.shopName.trim(),
      ownerName: draft.ownerName.trim(),
      address: draft.address.trim(),
      phone: draft.phone.trim(),
      images: nextImages.length > 0 ? nextImages : profile.images,
    });
    setIsEditing(false);
  };

  const isInvalid =
    !draft.shopName.trim() ||
    !draft.ownerName.trim() ||
    !draft.address.trim() ||
    !draft.phone.trim();

  return (
    <>
      <div className="flex min-h-screen flex-col bg-muted pb-24">
        <div className="brand-gradient px-4 pb-10 pt-12">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/45 bg-white/20 shadow-lg">
                <Store className="h-8 w-8 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-light-text">Shop profile</p>
                <h1 className="mt-1 text-xl font-bold text-white">{profile.shopName}</h1>
                <p className="mt-1 text-sm text-light-text">Owner: {profile.ownerName}</p>
              </div>
            </div>
            <button
              onClick={openEdit}
              className="flex h-10 items-center gap-2 rounded-full bg-white/15 px-4 text-xs font-semibold text-white"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>
          </div>
        </div>

        <div className="-mt-5 flex flex-col gap-4 px-4">
          <InfoCard label="Shop name" value={profile.shopName} Icon={Store} />
          <InfoCard label="Owner" value={profile.ownerName} Icon={User} />
          <InfoCard label="Address" value={profile.address} Icon={MapPin} />
          <InfoCard label="Phone" value={profile.phone} Icon={Phone} />

          <div className="rounded-[18px] bg-card p-4 card-shadow">
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-2xl"
                style={{ background: "hsl(var(--accent) / 0.12)" }}
              >
                <ImageIcon className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Shop images</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Keep storefront photos fresh so customers trust the listing.
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              {profile.images.map((image, index) => (
                <div key={image} className="overflow-hidden rounded-[16px] bg-muted">
                  <img
                    src={image}
                    alt={`${profile.shopName} ${index + 1}`}
                    className="h-24 w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={onExit}
            className="h-12 rounded-[14px] border border-border bg-card text-sm font-semibold text-foreground card-shadow"
          >
            Back to TRIMO customer app
          </button>
        </div>
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setIsEditing(false)}>
          <div
            className="fixed inset-x-0 bottom-0 mx-auto max-w-[430px] rounded-t-[28px] bg-background px-5 pb-8 pt-6 slide-up"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-5 h-1 w-12 rounded-full bg-border" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Edit profile</p>
                <h2 className="mt-1 text-xl font-bold text-foreground">Update shop details</h2>
              </div>
              <button
                onClick={() => setIsEditing(false)}
                className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground"
              >
                Close
              </button>
            </div>

            <div className="mt-6 flex flex-col gap-4">
              <input
                value={draft.shopName}
                onChange={(event) => setDraft((current) => ({ ...current, shopName: event.target.value }))}
                className="h-12 rounded-[14px] border border-border bg-card px-4 text-sm font-medium outline-none"
                placeholder="Shop name"
              />
              <input
                value={draft.ownerName}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, ownerName: event.target.value }))
                }
                className="h-12 rounded-[14px] border border-border bg-card px-4 text-sm font-medium outline-none"
                placeholder="Owner name"
              />
              <input
                value={draft.address}
                onChange={(event) => setDraft((current) => ({ ...current, address: event.target.value }))}
                className="h-12 rounded-[14px] border border-border bg-card px-4 text-sm font-medium outline-none"
                placeholder="Address"
              />
              <input
                value={draft.phone}
                onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))}
                className="h-12 rounded-[14px] border border-border bg-card px-4 text-sm font-medium outline-none"
                placeholder="Phone"
              />
              <input
                value={draft.imageOne}
                onChange={(event) => setDraft((current) => ({ ...current, imageOne: event.target.value }))}
                className="h-12 rounded-[14px] border border-border bg-card px-4 text-sm font-medium outline-none"
                placeholder="Image URL 1"
              />
              <input
                value={draft.imageTwo}
                onChange={(event) => setDraft((current) => ({ ...current, imageTwo: event.target.value }))}
                className="h-12 rounded-[14px] border border-border bg-card px-4 text-sm font-medium outline-none"
                placeholder="Image URL 2"
              />
              <input
                value={draft.imageThree}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, imageThree: event.target.value }))
                }
                className="h-12 rounded-[14px] border border-border bg-card px-4 text-sm font-medium outline-none"
                placeholder="Image URL 3"
              />

              <button
                onClick={handleSave}
                disabled={isInvalid}
                className="gradient-btn mt-2 h-12 rounded-[14px] text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save profile
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
