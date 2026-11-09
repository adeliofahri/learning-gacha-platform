
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, Table, Td, Th } from "@/components/ui/misc";
import { RarityStars } from "@/components/shared/rarity";
import { apiFetch, errorMessage } from "@/lib/api-client";

type Char = {
  id: string;
  name: string;
  rarity: number;
  imageUrl: string;
  status: string;
  category: "PERMANENT" | "LIMITED";
};

type Values = {
  id?: string;
  name: string;
  description: string;
  type: "PERMANENT" | "LIMITED";
  imageUrl?: string | null;
  startsAt: string;
  endsAt: string;
  singlePrice: number;
  stepUpEnabled: boolean;
  stepUpGuaranteeFeatured: boolean;
  isDemoRate: boolean;
  entries: {
    characterId: string;
    weight: number;
    isFeatured: boolean;
  }[];
  stages?: {
    price: number;
    pullCount: number;
  }[];
};

const DEFAULT_STAGES = [100, 150, 200, 250, 300].map((price) => ({
  price,
  pullCount: 1,
}));

const pct = (n: number) =>
  `${(n * 100).toFixed(n < 0.01 ? 3 : 2)}%`;

export function BannerForm({
  characters,
  initial,
}: {
  characters: Char[];
  initial?: Values;
}) {
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [toAdd, setToAdd] = useState("");
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");
  const [uploadingImage, setUploadingImage] = useState(false);

  async function handleImageUpload(file: File | undefined) {
    if (!file) return;

    setError(null);

    if (file.size > 2 * 1024 * 1024) {
      setError("Ukuran gambar maksimal 2 MB.");
      return;
    }

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Format gambar harus PNG, JPEG, atau WebP.");
      return;
    }

    setUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/uploads", {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error?.message ?? "Gagal mengunggah gambar.",
        );
      }

      if (!data.url) {
        throw new Error("URL gambar tidak ditemukan.");
      }

      setImageUrl(data.url);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setUploadingImage(false);
    }
  }

  const form = useForm<Values>({
    defaultValues: initial
      ? {
          ...initial,
          stages: initial.stages ?? DEFAULT_STAGES,
        }
      : {
          name: "",
          description: "",
          type: "PERMANENT",
          startsAt: "",
          endsAt: "",
          singlePrice: 100,
          stepUpEnabled: false,
          stepUpGuaranteeFeatured: false,
          isDemoRate: true,
          entries: [],
          stages: DEFAULT_STAGES,
        },
  });

  const entries = useFieldArray({
    control: form.control,
    name: "entries",
  });

  const v = form.watch();
  const byId = new Map(characters.map((c) => [c.id, c]));

  const total = v.entries.reduce(
    (s, e) => s + (Number(e.weight) || 0),
    0,
  );

  const perRarity = [6, 5, 4, 3, 2, 1]
    .map((r) => ({
      r,
      rate: total
        ? v.entries
            .filter(
              (e) => byId.get(e.characterId)?.rarity === r,
            )
            .reduce(
              (s, e) => s + (Number(e.weight) || 0),
              0,
            ) / total
        : 0,
    }))
    .filter((x) => x.rate > 0);

  // Semua karakter aktif dapat dimasukkan ke banner,
  // tanpa membedakan kategori PERMANENT atau LIMITED.
  const available = characters.filter(
    (c) =>
      c.status === "ACTIVE" &&
      !v.entries.some((e) => e.characterId === c.id),
  );

  return (
    <form
      className="space-y-6"
      onSubmit={form.handleSubmit(async (values) => {
        setError(null);
        setSaved(false);

        const stepUp =
          values.type === "LIMITED" && values.stepUpEnabled;

        const body = {
          name: values.name,
          description: values.description,
          imageUrl: imageUrl || null,
          type: values.type,

          startsAt: values.startsAt
            ? new Date(values.startsAt).toISOString()
            : null,

          endsAt:
            values.type === "LIMITED" && values.endsAt
              ? new Date(values.endsAt).toISOString()
              : null,

          singlePrice: Number(values.singlePrice),
          stepUpEnabled: stepUp,
          stepUpGuaranteeFeatured:
            stepUp && values.stepUpGuaranteeFeatured,
          isDemoRate: values.isDemoRate,

          entries: values.entries.map((e) => ({
            characterId: e.characterId,
            weight: Number(e.weight),
            isFeatured: e.isFeatured,
          })),

          stages: stepUp
            ? (values.stages ?? []).map((s, i) => ({
                stage: i + 1,
                price: Number(s.price),
                pullCount: Number(s.pullCount),
              }))
            : [],
        };

        try {
          if (initial?.id) {
            await apiFetch(
              `/api/admin/banners/${initial.id}`,
              {
                method: "PUT",
                body,
              },
            );

            setSaved(true);
            router.refresh();
          } else {
            const { banner } = await apiFetch<{
              banner: { id: string };
            }>("/api/admin/banners", {
              body,
            });

            router.push(`/admin/banners/${banner.id}`);
            router.refresh();
          }
        } catch (e) {
          setError(errorMessage(e));
        }
      })}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informasi banner</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nama</Label>
              <Input
                id="name"
                required
                minLength={3}
                {...form.register("name", {
                  required: true,
                })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                rows={3}
                {...form.register("description")}
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="bannerImage">
                Artwork banner
              </Label>

              {imageUrl ? (
                <div className="relative overflow-hidden rounded-xl border">
                  <img
                    src={imageUrl}
                    alt="Preview artwork banner"
                    className="aspect-video w-full object-cover"
                  />

                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute right-3 top-3"
                    onClick={() => setImageUrl("")}
                  >
                    <Trash2 />
                    Hapus gambar
                  </Button>
                </div>
              ) : (
                <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed bg-muted">
                  <div className="text-center">
                    <p className="font-semibold">
                      Belum ada artwork custom
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Tampilan default akan digunakan.
                    </p>
                  </div>
                </div>
              )}

              <label
                htmlFor="bannerImage"
                className="inline-flex cursor-pointer items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {uploadingImage
                  ? "Mengunggah gambar..."
                  : "Pilih gambar"}
              </label>

              <input
                id="bannerImage"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={uploadingImage}
                className="hidden"
                onChange={(e) => {
                  void handleImageUpload(
                    e.target.files?.[0],
                  );
                  e.currentTarget.value = "";
                }}
              />

              <p className="text-muted-foreground text-xs">
                PNG, JPEG, atau WebP. Maksimal 2 MB.
                Disarankan rasio 16:9.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="type">Tipe banner</Label>

                <Select
                  id="type"
                  {...form.register("type")}
                >
                  <option value="PERMANENT">
                    Permanen (tanpa tanggal akhir)
                  </option>
                  <option value="LIMITED">
                    Limited (periode tertentu)
                  </option>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="singlePrice">
                  Harga single (koin)
                </Label>

                <Input
                  id="singlePrice"
                  type="number"
                  min={1}
                  {...form.register("singlePrice", {
                    valueAsNumber: true,
                  })}
                />

                <p className="text-muted-foreground text-xs">
                  10× pull = 9 × single ={" "}
                  {9 * (Number(v.singlePrice) || 0)} koin
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="startsAt">
                  Mulai{" "}
                  {v.type === "PERMANENT" && "(opsional)"}
                </Label>

                <Input
                  id="startsAt"
                  type="datetime-local"
                  {...form.register("startsAt")}
                />
              </div>

              {v.type === "LIMITED" && (
                <div className="space-y-1.5">
                  <Label htmlFor="endsAt">
                    Berakhir
                  </Label>

                  <Input
                    id="endsAt"
                    type="datetime-local"
                    {...form.register("endsAt")}
                  />
                </div>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="accent-primary size-4"
                {...form.register("isDemoRate")}
              />
              Tandai sebagai DEMO RATE (belum ditinjau untuk production)
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preview peluang</CardTitle>
            <p className="text-muted-foreground text-sm">
              Inilah yang akan ditampilkan ke siswa.
              Total weight: {total}
            </p>
          </CardHeader>

          <CardContent className="space-y-3">
            {perRarity.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Tambahkan karakter untuk melihat peluang.
              </p>
            ) : (
              <ul className="space-y-1 text-sm">
                {perRarity.map((x) => (
                  <li
                    key={x.r}
                    className="flex items-center justify-between rounded-md border px-3 py-1.5"
                  >
                    <RarityStars rarity={x.r} />
                    <b className="tabular-nums">
                      {pct(x.rate)}
                    </b>
                  </li>
                ))}
              </ul>
            )}

            {v.type === "LIMITED" && (
              <div className="space-y-3 rounded-md border p-3">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    className="accent-primary size-4"
                    {...form.register("stepUpEnabled")}
                  />
                  Aktifkan Step-Up 5 tahap
                </label>

                {v.stepUpEnabled && (
                  <>
                    <div className="grid grid-cols-5 gap-2">
                      {(v.stages ?? []).map((_, i) => (
                        <div
                          key={i}
                          className="space-y-1"
                        >
                          <Label
                            htmlFor={`stage-${i}`}
                            className="text-xs"
                          >
                            Tahap {i + 1}
                          </Label>

                          <Input
                            id={`stage-${i}`}
                            type="number"
                            min={1}
                            aria-label={`Harga tahap ${i + 1}`}
                            {...form.register(
                              `stages.${i}.price`,
                              { valueAsNumber: true },
                            )}
                          />

                          <Input
                            type="number"
                            min={1}
                            max={10}
                            aria-label={`Jumlah hasil tahap ${i + 1}`}
                            title="Jumlah hasil"
                            {...form.register(
                              `stages.${i}.pullCount`,
                              { valueAsNumber: true },
                            )}
                          />
                        </div>
                      ))}
                    </div>

                    <p className="text-muted-foreground text-xs">
                      Baris atas: harga. Baris bawah: jumlah
                      hasil per tahap. Tahap 5 menjamin
                      minimal satu 6★.
                    </p>

                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="accent-primary size-4"
                        {...form.register(
                          "stepUpGuaranteeFeatured",
                        )}
                      />
                      Aturan tambahan: jaminan tahap 5
                      harus 6★ <b>featured</b>
                    </label>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Daftar karakter &amp; weight
          </CardTitle>

          <div className="flex gap-2">
            <Select
              value={toAdd}
              onChange={(e) => setToAdd(e.target.value)}
              aria-label="Pilih karakter untuk ditambahkan"
            >
              <option value="">
                — Pilih karakter —
              </option>

              {available.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.rarity}★ {c.name} (
                  {c.category === "LIMITED"
                    ? "Limited"
                    : "Permanent"}
                  )
                </option>
              ))}
            </Select>

            <Button
              type="button"
              variant="secondary"
              disabled={!toAdd}
              onClick={() => {
                entries.append({
                  characterId: toAdd,
                  weight: 100,
                  isFeatured: false,
                });
                setToAdd("");
              }}
            >
              <Plus /> Tambah
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                available.forEach((c) =>
                  entries.append({
                    characterId: c.id,
                    weight: 100,
                    isFeatured: false,
                  }),
                )
              }
              disabled={available.length === 0}
            >
              Tambah semua
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <thead>
              <tr>
                <Th>Karakter</Th>
                <Th>Rarity</Th>
                <Th>Weight</Th>
                <Th className="text-right">Peluang</Th>
                <Th>Featured</Th>
                <Th>
                  <span className="sr-only">Aksi</span>
                </Th>
              </tr>
            </thead>

            <tbody>
              {entries.fields.map((f, i) => {
                const c = byId.get(
                  v.entries[i]?.characterId ?? "",
                );

                return (
                  <tr key={f.id}>
                    <Td className="font-medium">
                      {c?.name}

                      {c?.category === "LIMITED" && (
                        <span className="ml-1 text-xs text-amber-600">
                          (Limited)
                        </span>
                      )}

                      {c?.status === "ARCHIVED" && (
                        <span className="ml-1 text-xs text-destructive">
                          (diarsipkan)
                        </span>
                      )}
                    </Td>

                    <Td>
                      {c && (
                        <RarityStars rarity={c.rarity} />
                      )}
                    </Td>

                    <Td>
                      <Input
                        type="number"
                        min={1}
                        className="h-8 w-28"
                        aria-label={`Weight ${c?.name}`}
                        {...form.register(
                          `entries.${i}.weight`,
                          { valueAsNumber: true },
                        )}
                      />
                    </Td>

                    <Td className="text-right tabular-nums">
                      {total
                        ? pct(
                            (Number(v.entries[i]?.weight) || 0) /
                              total,
                          )
                        : "-"}
                    </Td>

                    <Td>
                      <input
                        type="checkbox"
                        className="accent-primary size-4"
                        aria-label={`Featured ${c?.name}`}
                        {...form.register(
                          `entries.${i}.isFeatured`,
                        )}
                      />
                    </Td>

                    <Td>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Hapus ${c?.name}`}
                        onClick={() => entries.remove(i)}
                      >
                        <Trash2 />
                      </Button>
                    </Td>
                  </tr>
                );
              })}

              {entries.fields.length === 0 && (
                <tr>
                  <Td
                    colSpan={6}
                    className="text-center text-muted-foreground"
                  >
                    Belum ada karakter.
                  </Td>
                </tr>
              )}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="error">{error}</Alert>
      )}

      {saved && (
        <Alert variant="success">
          Banner tersimpan.
        </Alert>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={
          form.formState.isSubmitting || uploadingImage
        }
      >
        {form.formState.isSubmitting
          ? "Menyimpan…"
          : initial?.id
            ? "Simpan perubahan"
            : "Simpan sebagai draft"}
      </Button>
    </form>
  );
}
