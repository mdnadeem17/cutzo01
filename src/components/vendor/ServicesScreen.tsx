import { ArrowRight, Pencil, Plus, Scissors, Trash2 } from "lucide-react";
import { useState } from "react";
import { VendorService } from "./types";
import { formatCurrency } from "./utils";

interface Props {
  services: VendorService[];
  onCreateService: (service: Omit<VendorService, "id">) => void;
  onUpdateService: (id: string, service: Omit<VendorService, "id">) => void;
  onDeleteService: (id: string) => void;
  onOpenAvailability: () => void;
}

interface ServiceDraft {
  name: string;
  durationMinutes: string;
  price: string;
}

const emptyDraft: ServiceDraft = {
  name: "",
  durationMinutes: "30",
  price: "",
};

export default function ServicesScreen({
  services,
  onCreateService,
  onUpdateService,
  onDeleteService,
  onOpenAvailability,
}: Props) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ServiceDraft>(emptyDraft);

  const averageTicket =
    services.length > 0
      ? Math.round(services.reduce((total, service) => total + service.price, 0) / services.length)
      : 0;

  const openCreate = () => {
    setEditingId(null);
    setDraft(emptyDraft);
    setIsFormOpen(true);
  };

  const openEdit = (service: VendorService) => {
    setEditingId(service.id);
    setDraft({
      name: service.name,
      durationMinutes: String(service.durationMinutes),
      price: String(service.price),
    });
    setIsFormOpen(true);
  };

  const handleSubmit = () => {
    if (!draft.name.trim() || !draft.durationMinutes || !draft.price) {
      return;
    }

    const payload = {
      name: draft.name.trim(),
      durationMinutes: Number(draft.durationMinutes),
      price: Number(draft.price),
    };

    if (editingId) {
      onUpdateService(editingId, payload);
    } else {
      onCreateService(payload);
    }

    setIsFormOpen(false);
    setEditingId(null);
    setDraft(emptyDraft);
  };

  const isInvalid =
    !draft.name.trim() || Number(draft.durationMinutes) <= 0 || Number(draft.price) <= 0;

  return (
    <>
      <div className="flex min-h-screen flex-col bg-muted pb-24">
        <div className="brand-gradient px-4 pb-8 pt-12">
          <p className="text-sm font-medium text-light-text">Service management</p>
          <h1 className="mt-1 text-2xl font-bold text-white">Menu and pricing</h1>
          <p className="mt-1 text-sm text-light-text">
            Keep service names, duration, and pricing aligned with your chair schedule.
          </p>
        </div>

        <div className="-mt-5 flex flex-col gap-4 px-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[18px] bg-card p-4 card-shadow">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Active services
              </p>
              <p className="mt-2 text-2xl font-bold text-foreground">{services.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">Visible to customers right now</p>
            </div>
            <div className="rounded-[18px] bg-card p-4 card-shadow">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Average ticket
              </p>
              <p className="mt-2 text-2xl font-bold text-foreground">{formatCurrency(averageTicket)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Based on listed menu price</p>
            </div>
          </div>

          <button
            onClick={onOpenAvailability}
            className="rounded-[18px] bg-card p-4 text-left card-shadow"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-foreground">Availability and slots</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Open or close time slots without leaving the business flow.
                </p>
              </div>
              <div
                className="flex h-10 w-10 items-center justify-center rounded-2xl"
                style={{ background: "hsl(var(--accent) / 0.12)" }}
              >
                <ArrowRight className="h-5 w-5 text-accent" />
              </div>
            </div>
          </button>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Services
            </p>
            <div className="mt-3 flex flex-col gap-3">
              {services.map((service) => (
                <div key={service.id} className="rounded-[18px] bg-card p-4 card-shadow">
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                      style={{ background: "hsl(var(--primary) / 0.08)" }}
                    >
                      <Scissors className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground">{service.name}</p>
                      <p className="mt-1 text-xs font-medium text-muted-foreground">
                        {service.durationMinutes} min service
                      </p>
                      <p className="mt-3 text-lg font-bold text-accent">{formatCurrency(service.price)}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button
                      onClick={() => openEdit(service)}
                      className="flex h-11 items-center justify-center gap-2 rounded-[12px] border border-border text-sm font-semibold text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => onDeleteService(service.id)}
                      className="flex h-11 items-center justify-center gap-2 rounded-[12px] text-sm font-semibold text-white"
                      style={{ background: "hsl(var(--destructive))" }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-30">
        <div className="mx-auto flex max-w-[430px] justify-end px-4">
          <button
            onClick={openCreate}
            className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl shadow-cyan-500/25"
            style={{ background: "hsl(var(--accent))" }}
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setIsFormOpen(false)}>
          <div
            className="fixed inset-x-0 bottom-0 mx-auto max-w-[430px] rounded-t-[28px] bg-background px-5 pb-8 pt-6 slide-up"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-5 h-1 w-12 rounded-full bg-border" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {editingId ? "Update service" : "New service"}
                </p>
                <h2 className="mt-1 text-xl font-bold text-foreground">
                  {editingId ? "Edit menu item" : "Add a service"}
                </h2>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground"
              >
                Close
              </button>
            </div>

            <div className="mt-6 flex flex-col gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Service name
                </span>
                <input
                  value={draft.name}
                  onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                  className="h-12 rounded-[14px] border border-border bg-card px-4 text-sm font-medium outline-none"
                  placeholder="Classic Haircut"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Duration
                  </span>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={draft.durationMinutes}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, durationMinutes: event.target.value }))
                    }
                    className="h-12 rounded-[14px] border border-border bg-card px-4 text-sm font-medium outline-none"
                    placeholder="30"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Price
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="10"
                    value={draft.price}
                    onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value }))}
                    className="h-12 rounded-[14px] border border-border bg-card px-4 text-sm font-medium outline-none"
                    placeholder="250"
                  />
                </label>
              </div>

              <button
                onClick={handleSubmit}
                disabled={isInvalid}
                className="gradient-btn mt-2 h-12 rounded-[14px] text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {editingId ? "Save changes" : "Add service"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
