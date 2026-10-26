"use client";

import * as React from "react";
import { MapPin, Navigation, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

export interface SharedLocation {
  lat: number;
  lng: number;
  address?: string;
}

/**
 * Real location share: requests the browser geolocation position (with
 * permission/denied states surfaced honestly) and always allows manual
 * coordinate entry as a fallback. No coordinates are ever fabricated.
 */
export function LocationShareDialog({
  open,
  onClose,
  onShare,
}: {
  open: boolean;
  onClose: () => void;
  onShare: (location: SharedLocation) => void;
}) {
  const [lat, setLat] = React.useState("");
  const [lng, setLng] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setLat("");
      setLng("");
      setAddress("");
      setError(null);
    }
  }, [open]);

  const detect = () => {
    if (!("geolocation" in navigator)) {
      setError("Geolocation is not supported by this browser. Enter coordinates manually.");
      return;
    }
    setBusy(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setBusy(false);
      },
      (err) => {
        setBusy(false);
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. You can enter coordinates manually."
            : "Could not determine your location. Enter coordinates manually.",
        );
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  };

  const submit = () => {
    const la = Number.parseFloat(lat);
    const ln = Number.parseFloat(lng);
    if (!Number.isFinite(la) || la < -90 || la > 90 || !Number.isFinite(ln) || ln < -180 || ln > 180) {
      setError("Enter valid latitude (-90…90) and longitude (-180…180).");
      return;
    }
    onShare({ lat: la, lng: ln, address: address.trim() || undefined });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Share location" description="Send your current position or pick coordinates manually." size="md">
      <div className="space-y-4">
        <button onClick={detect} disabled={busy} className="btn btn-secondary w-full">
          <Navigation className="size-4" />
          {busy ? "Locating…" : "Use my current location"}
        </button>
        {error && (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-600 dark:text-amber-300">
            {error}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Latitude</span>
            <input
              className="field w-full"
              inputMode="decimal"
              placeholder="23.8103"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Longitude</span>
            <input
              className="field w-full"
              inputMode="decimal"
              placeholder="90.4125"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
            />
          </label>
        </div>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Label / address (optional)</span>
          <input
            className="field w-full"
            placeholder="e.g. Banani, Dhaka"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </label>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn btn-ghost btn-sm">
            <X className="size-4" /> Cancel
          </button>
          <button onClick={submit} className="btn btn-primary btn-sm">
            <MapPin className="size-4" /> Send location
          </button>
        </div>
      </div>
    </Modal>
  );
}
