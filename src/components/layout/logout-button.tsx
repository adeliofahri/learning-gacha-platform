"use client";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="ghost"
      size={compact ? "icon" : "sm"}
      disabled={pending}
      aria-label="Keluar"
      onClick={async () => {
        setPending(true);
        try {
          await apiFetch("/api/auth/logout", { body: {} });
        } finally {
          router.push("/login");
          router.refresh();
        }
      }}
    >
      <LogOut />
      {!compact && "Keluar"}
    </Button>
  );
}
