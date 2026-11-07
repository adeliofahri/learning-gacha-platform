"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { FieldError, Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/misc";
import { CharacterTile } from "@/components/shared/rarity";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { characterSchema, type CharacterInput } from "@/lib/validation/collection";
import type { z } from "zod";
import { cn } from "@/lib/utils/cn";

type FormIn = z.input<typeof characterSchema>;

export function CharacterForm({
  library,
  initial,
  lockRarity = false,
}: {
  library: string[];
  initial?: Required<FormIn> & { id: string };
  lockRarity?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const form = useForm<FormIn, unknown, CharacterInput>({
    resolver: zodResolver(characterSchema),
    defaultValues: initial ?? {
      name: "",
      description: "",
      rarity: 3,
      imageUrl: library[0] ?? "",
      category: "PERMANENT",
      status: "ACTIVE",
    },
  });
  const v = form.watch();
  const { errors } = form.formState;

  async function upload(file: File) {
    setError(null);
    if (file.size > 2 * 1024 * 1024) return setError("Ukuran file maksimal 2 MB");
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
      return setError("Tipe file harus PNG, JPEG, atau WebP");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/uploads", {
        method: "POST",
        body: fd,
        credentials: "same-origin",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Upload gagal");
      form.setValue("imageUrl", data.url, { shouldValidate: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload gagal");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form
      className="grid gap-6 lg:grid-cols-[1fr_280px]"
      onSubmit={form.handleSubmit(async (values) => {
        setError(null);
        setSaved(false);
        try {
          if (initial) {
            await apiFetch(`/api/admin/characters/${initial.id}`, { method: "PUT", body: values });
            setSaved(true);
            router.refresh();
          } else {
            await apiFetch("/api/admin/characters", { body: values });
            router.push("/admin/characters");
            router.refresh();
          }
        } catch (e) {
          setError(errorMessage(e));
        }
      })}
    >
      <Card>
        <CardHeader>
          <CardTitle>Data karakter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nama</Label>
            <Input id="name" aria-invalid={!!errors.name} {...form.register("name")} />
            <FieldError message={errors.name?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea id="description" rows={3} {...form.register("description")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="rarity">Rarity</Label>
              <Select
                id="rarity"
                disabled={lockRarity}
                {...form.register("rarity", { valueAsNumber: true })}
              >
                {[1, 2, 3, 4, 5, 6].map((r) => (
                  <option key={r} value={r}>
                    {r}★
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category">Kategori</Label>
              <Select id="category" {...form.register("category")}>
                <option value="PERMANENT">Permanen</option>
                <option value="LIMITED">Limited</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <Select id="status" {...form.register("status")}>
                <option value="ACTIVE">Aktif</option>
                <option value="ARCHIVED">Diarsipkan</option>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Gambar</Label>
            <div className="flex flex-wrap items-center gap-2">
              <label className="bg-card hover:bg-muted inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold">
                <Upload className="size-4" aria-hidden />
                {uploading ? "Mengunggah…" : "Unggah PNG/JPEG/WebP (maks 2 MB)"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  disabled={uploading}
                  onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
                />
              </label>
              <span className="text-muted-foreground text-xs">atau pilih dari pustaka:</span>
            </div>
            <div
              className="grid max-h-56 grid-cols-6 gap-2 overflow-y-auto rounded-md border p-2 sm:grid-cols-8"
              role="radiogroup"
              aria-label="Pustaka gambar"
            >
              {library.map((src) => (
                <button
                  type="button"
                  key={src}
                  role="radio"
                  aria-checked={v.imageUrl === src}
                  aria-label={src}
                  onClick={() => form.setValue("imageUrl", src, { shouldValidate: true })}
                  className={cn(
                    "rounded-md border-2 p-0.5",
                    v.imageUrl === src ? "border-primary" : "border-transparent",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="aspect-square w-full rounded" />
                </button>
              ))}
            </div>
            <Input aria-label="Path gambar" {...form.register("imageUrl")} />
            <FieldError message={errors.imageUrl?.message} />
          </div>
        </CardContent>
      </Card>
      <div className="space-y-4">
        <p className="text-sm font-semibold">Preview</p>
        {v.imageUrl && (
          <CharacterTile
            character={{
              name: v.name || "Nama karakter",
              rarity: Number(v.rarity) || 1,
              imageUrl: v.imageUrl,
            }}
          />
        )}
        {error && <Alert variant="error">{error}</Alert>}
        {saved && <Alert variant="success">Karakter tersimpan.</Alert>}
        <Button
          type="submit"
          className="w-full"
          disabled={form.formState.isSubmitting || uploading}
        >
          {form.formState.isSubmitting ? "Menyimpan…" : "Simpan"}
        </Button>
      </div>
    </form>
  );
}
