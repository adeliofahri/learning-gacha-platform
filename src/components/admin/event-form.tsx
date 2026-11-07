"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/misc";
import { apiFetch, errorMessage } from "@/lib/api-client";

type Values = {
  id?: string;
  name: string;
  description: string;
  coinReward: number;
  minSolved: number;
  maxClaims: number | "";
  startsAt: string;
  endsAt: string;
  status: "ACTIVE" | "ARCHIVED";
};

export function EventForm({ initial }: { initial?: Values }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const form = useForm<Values>({
    defaultValues: initial ?? {
      name: "",
      description: "",
      coinReward: 100,
      minSolved: 0,
      maxClaims: "",
      startsAt: "",
      endsAt: "",
      status: "ACTIVE",
    },
  });
  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={form.handleSubmit(async (v) => {
        setMsg(null);
        if (!v.startsAt || !v.endsAt)
          return setMsg({ type: "error", text: "Tanggal mulai dan akhir wajib diisi." });
        const body = {
          name: v.name,
          description: v.description,
          coinReward: Number(v.coinReward),
          minSolved: Number(v.minSolved) || 0,
          maxClaims:
            v.maxClaims === "" || Number.isNaN(Number(v.maxClaims)) ? null : Number(v.maxClaims),
          startsAt: new Date(v.startsAt).toISOString(),
          endsAt: new Date(v.endsAt).toISOString(),
          status: v.status,
        };
        try {
          if (initial?.id) {
            await apiFetch(`/api/admin/events/${initial.id}`, { method: "PUT", body });
            setMsg({ type: "success", text: "Event tersimpan." });
          } else {
            await apiFetch("/api/admin/events", { body });
            form.reset();
            setMsg({ type: "success", text: "Event dibuat." });
          }
          router.refresh();
        } catch (e) {
          setMsg({ type: "error", text: errorMessage(e) });
        }
      })}
    >
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="ev-name">Nama</Label>
        <Input id="ev-name" required minLength={3} {...form.register("name", { required: true })} />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="ev-desc">Deskripsi</Label>
        <Textarea id="ev-desc" rows={2} {...form.register("description")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ev-start">Mulai</Label>
        <Input id="ev-start" type="datetime-local" {...form.register("startsAt")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ev-end">Berakhir</Label>
        <Input id="ev-end" type="datetime-local" {...form.register("endsAt")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ev-reward">Reward koin</Label>
        <Input
          id="ev-reward"
          type="number"
          min={1}
          {...form.register("coinReward", { valueAsNumber: true })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ev-min">Syarat minimal soal solved</Label>
        <Input
          id="ev-min"
          type="number"
          min={0}
          {...form.register("minSolved", { valueAsNumber: true })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ev-max">Kuota klaim global (kosong = tanpa batas)</Label>
        <Input id="ev-max" type="number" min={1} {...form.register("maxClaims")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ev-status">Status</Label>
        <Select id="ev-status" {...form.register("status")}>
          <option value="ACTIVE">Aktif</option>
          <option value="ARCHIVED">Diarsipkan</option>
        </Select>
      </div>
      {msg && (
        <Alert variant={msg.type} className="sm:col-span-2">
          {msg.text}
        </Alert>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {initial?.id ? "Simpan event" : "Buat event"}
        </Button>
      </div>
    </form>
  );
}
