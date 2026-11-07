"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/misc";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { DIFFICULTY_LABEL } from "@/lib/constants";

type Values = {
  bounties: Record<"EASY" | "MEDIUM" | "HARD" | "EXPERT", number>;
  shards: Record<"1" | "2" | "3" | "4" | "5" | "6", number>;
};

export function SettingsForm({ initial }: { initial: Values }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const form = useForm<Values>({ defaultValues: initial });
  return (
    <form
      className="grid gap-6 md:grid-cols-2"
      onSubmit={form.handleSubmit(async (values) => {
        setMsg(null);
        try {
          await apiFetch("/api/admin/settings", { method: "PUT", body: values });
          setMsg({ type: "success", text: "Pengaturan tersimpan." });
          router.refresh();
        } catch (e) {
          setMsg({ type: "error", text: errorMessage(e) });
        }
      })}
    >
      <Card>
        <CardHeader>
          <CardTitle>Bounty default per kesulitan</CardTitle>
          <p className="text-muted-foreground text-sm">
            Perubahan bounty akan langsung diterapkan ke seluruh soal dengan tingkat kesulitan terkait, termasuk soal yang sudah dibuat.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {(["EASY", "MEDIUM", "HARD", "EXPERT"] as const).map((d) => (
            <div key={d} className="flex items-center justify-between gap-3">
              <Label htmlFor={`b-${d}`}>{DIFFICULTY_LABEL[d]}</Label>
              <Input
                id={`b-${d}`}
                type="number"
                min={0}
                className="w-32"
                {...form.register(`bounties.${d}`, { valueAsNumber: true })}
              />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Shard per duplikat</CardTitle>
          <p className="text-muted-foreground text-sm">Berlaku untuk pull berikutnya.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {(["1", "2", "3", "4", "5", "6"] as const).map((r) => (
            <div key={r} className="flex items-center justify-between gap-3">
              <Label htmlFor={`s-${r}`}>{r}★</Label>
              <Input
                id={`s-${r}`}
                type="number"
                min={0}
                className="w-32"
                {...form.register(`shards.${r}`, { valueAsNumber: true })}
              />
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="space-y-3 md:col-span-2">
        {msg && <Alert variant={msg.type}>{msg.text}</Alert>}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          Simpan pengaturan
        </Button>
      </div>
    </form>
  );
}
