"use client";

import { useState } from "react";
import { Button, Modal, useToast } from "@/components/ui";

export function DesignOverlays() {
  const [open, setOpen] = useState(false);
  const toast = useToast();
  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Buka modal
      </Button>
      <Button variant="secondary" onClick={() => toast.show("Ditambahkan ke keranjang")}>
        Tampilkan toast
      </Button>
      <Modal open={open} title="Panduan ukuran" onClose={() => setOpen(false)}>
        <p className="text-sm">Isi modal. Tekan Esc atau tombol Tutup untuk menutup.</p>
      </Modal>
    </div>
  );
}
