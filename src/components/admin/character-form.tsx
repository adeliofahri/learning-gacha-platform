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
  initial?: FormIn & { id: string };
  lockRarity?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const form = useForm<FormIn, unknown, CharacterInput>({
    resolver: zodResolver(characterSchema),
    defaultValues: initial
    ? {
        name: initial.name,
        description: initial.description,
        rarity: initial.rarity,
        imageUrl: initial.imageUrl,
        category: initial.category,
        status: initial.status,
        limitedBorderType: initial.limitedBorderType ?? "PRESET",
        limitedBorderConfig: initial.limitedBorderConfig ?? {
          colors: ["#A855F7", "#E11D48"],
          angle: 0,
        },
        limitedBorderImageUrl: initial.limitedBorderImageUrl ?? null,
      }
    : {
        name: "",
        description: "",
        rarity: 3,
        imageUrl: library[0] ?? "",
        category: "PERMANENT",
        status: "ACTIVE",
        limitedBorderType: "PRESET",
        limitedBorderConfig: {
          colors: ["#A855F7", "#E11D48"],
          angle: 0,
        },
        limitedBorderImageUrl: null,
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
      onSubmit={form.handleSubmit(
        async (values) => {
          setError(null);
          setSaved(false);

          try {
            if (initial) {
              await apiFetch(`/api/admin/characters/${initial.id}`, {
                method: "PUT",
                body: values,
              });
              setSaved(true);
              router.refresh();
            } else {
              await apiFetch("/api/admin/characters", {
                body: values,
              });
              router.push("/admin/characters");
              router.refresh();
            }
          } catch (e) {
            setError(errorMessage(e));
            console.error("Character save failed:", e);
          }
        },
        (errors) => {
          console.error("Character form validation failed:", errors);

          const firstError = Object.values(errors).find(
            (error) => error?.message,
          );

          setError(
            firstError?.message?.toString() ??
              "Data karakter tidak valid. Periksa kembali seluruh kolom.",
          );
        },
      )}
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
          {v.category === "LIMITED" && (
            <div className="space-y-4 rounded-lg border p-4">
              <div>
                <p className="font-semibold">Border karakter LIMITED</p>
                <p className="text-muted-foreground text-sm">
                  Setiap karakter LIMITED memiliki desain border tersendiri.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="limitedBorderType">Tipe border</Label>
                <Select
                  id="limitedBorderType"
                  value={v.limitedBorderType ?? "PRESET"}
                  onChange={(e) => {
                    const type = e.target.value as
                      | "PRESET"
                      | "GRADIENT"
                      | "IMAGE";

                    form.setValue("limitedBorderType", type, {
                      shouldValidate: true,
                    });

                    if (type === "GRADIENT" && !v.limitedBorderConfig) {
                      form.setValue(
                        "limitedBorderConfig",
                        { colors: ["#A855F7", "#E11D48"], angle: 0 },
                        { shouldValidate: true },
                      );
                    }
                  }}
                >
                  <option value="PRESET">Preset</option>
                  <option value="GRADIENT">Gradient</option>
                  <option value="IMAGE">Gambar border</option>
                </Select>
              </div>

              {v.limitedBorderType === "GRADIENT" && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Warna gradient</p>

                  {[0, 1, 2, 3, 4].map((index) => {
                    const colors =
                      v.limitedBorderConfig?.colors ?? [
                        "#A855F7",
                        "#E11D48",
                      ];

                    return (
                      <div key={index} className="flex items-center gap-3">
                        <input
                          type="color"
                          aria-label={`Warna gradient ${index + 1}`}
                          value={colors[index] ?? "#A855F7"}
                          onChange={(e) => {
                            const nextColors = [...colors];
                            nextColors[index] = e.target.value;

                            form.setValue(
                              "limitedBorderConfig",
                              {
                                colors: nextColors.slice(0, Math.max(2, colors.length)),
                                angle: v.limitedBorderConfig?.angle ?? 0,
                              },
                              { shouldValidate: true },
                            );
                          }}
                          className="size-10 cursor-pointer rounded border p-1"
                        />

                        <span className="text-sm">
                          Warna {index + 1}
                        </span>

                        {index >= 2 && index === colors.length - 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (colors.length <= 2) return;

                              form.setValue(
                                "limitedBorderConfig",
                                {
                                  colors: colors.slice(0, -1),
                                  angle: v.limitedBorderConfig?.angle ?? 0,
                                },
                                { shouldValidate: true },
                              );
                            }}
                          >
                            Hapus
                          </Button>
                        )}
                      </div>
                    );
                  })}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={
                      (v.limitedBorderConfig?.colors?.length ?? 2) >= 5
                    }
                    onClick={() => {
                      const colors =
                        v.limitedBorderConfig?.colors ?? [
                          "#A855F7",
                          "#E11D48",
                        ];

                      form.setValue(
                        "limitedBorderConfig",
                        {
                          colors: [...colors, "#FACC15"],
                          angle: v.limitedBorderConfig?.angle ?? 0,
                        },
                        { shouldValidate: true },
                      );
                    }}
                  >
                    Tambah warna
                  </Button>

                  <div className="space-y-1.5">
                    <Label htmlFor="limitedBorderAngle">
                      Sudut gradient (0–360°)
                    </Label>
                    <Input
                      id="limitedBorderAngle"
                      type="number"
                      min={0}
                      max={360}
                      value={v.limitedBorderConfig?.angle ?? 0}
                      onChange={(e) => {
                        const angle = Number(e.target.value);
                        const colors =
                          v.limitedBorderConfig?.colors ?? [
                            "#A855F7",
                            "#E11D48",
                          ];

                        form.setValue(
                          "limitedBorderConfig",
                          { colors, angle },
                          { shouldValidate: true },
                        );
                      }}
                    />
                  </div>

                  <FieldError
                    message={errors.limitedBorderConfig?.message as string | undefined}
                  />
                </div>
              )}

              {v.limitedBorderType === "IMAGE" && (
                <div className="space-y-2">
                  <Label htmlFor="limitedBorderImage">
                    Unggah gambar border
                  </Label>

                  <Input
                    id="limitedBorderImage"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      if (file.size > 2 * 1024 * 1024) {
                        setError("Ukuran gambar border maksimal 2 MB");
                        return;
                      }

                      if (
                        !["image/png", "image/jpeg", "image/webp"].includes(file.type)
                      ) {
                        setError("Format gambar harus PNG, JPEG, atau WebP");
                        return;
                      }

                      setError(null);
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

                        if (!res.ok) {
                          throw new Error(
                            data?.error?.message ?? "Upload border gagal",
                          );
                        }

                        form.setValue("limitedBorderImageUrl", data.url, {
                          shouldValidate: true,
                        });
                      } catch (e) {
                        setError(
                          e instanceof Error ? e.message : "Upload border gagal",
                        );
                      } finally {
                        setUploading(false);
                      }
                    }}
                  />

                  {v.limitedBorderImageUrl && (
                    <div className="space-y-2">
                      <p className="text-muted-foreground text-xs">
                        Gambar border saat ini:
                      </p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={v.limitedBorderImageUrl}
                        alt="Preview border"
                        className="size-24 rounded-lg border object-contain"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          form.setValue("limitedBorderImageUrl", null, {
                            shouldValidate: true,
                          })
                        }
                      >
                        Hapus gambar border
                      </Button>
                    </div>
                  )}

                  <FieldError message={errors.limitedBorderImageUrl?.message} />
                </div>
              )}
            </div>
          )}
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
              category: v.category,
              limitedBorderType: v.limitedBorderType,
              limitedBorderConfig: v.limitedBorderConfig,
              limitedBorderImageUrl: v.limitedBorderImageUrl,
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
