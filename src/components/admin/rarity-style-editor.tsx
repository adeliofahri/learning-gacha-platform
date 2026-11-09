
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Paintbrush, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/misc";
import { apiFetch, errorMessage } from "@/lib/api-client";

type BorderType = "PRESET" | "GRADIENT" | "IMAGE";

type RarityStyle = {
  rarity: number;
  borderType: "PRESET" | "GRADIENT" | "IMAGE";
  borderConfig: {
    colors: string[];
    angle: number;
  } | null;
  borderImageUrl: string | null;
};

const DEFAULT_COLORS: Record<number, string[]> = {
  1: ["#CBD5E1", "#94A3B8"],
  2: ["#86EFAC", "#16A34A"],
  3: ["#7DD3FC", "#0284C7"],
  4: ["#C4B5FD", "#9333EA"],
  5: ["#FDE68A", "#F59E0B", "#B45309"],
  6: ["#A855F7", "#E11D48", "#FACC15"],
};

const PRESET_CLASSES: Record<number, string> = {
  1: "from-slate-200 to-slate-400",
  2: "from-green-200 to-green-500",
  3: "from-sky-200 to-sky-500",
  4: "from-purple-200 to-purple-500",
  5: "from-amber-200 via-yellow-400 to-amber-600",
  6: "from-purple-500 via-rose-500 to-yellow-400",
};

export function RarityStyleEditor({
  initial,
}: {
  initial: RarityStyle[];
}) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  const [styles, setStyles] = useState(initial);
  const [selected, setSelected] = useState(1);
  const [colors, setColors] = useState<string[]>(
    initial.find((s) => s.rarity === 1)?.borderConfig?.colors ??
        DEFAULT_COLORS[1]!,
    );
  const [angle, setAngle] = useState(135);
  const [brushColor, setBrushColor] = useState("#F59E0B");
  const [brushSize, setBrushSize] = useState(12);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const current = styles.find((s) => s.rarity === selected)!;

  function updateCurrent(patch: Partial<RarityStyle>) {
    setStyles((previous) =>
      previous.map((style) =>
        style.rarity === selected ? { ...style, ...patch } : style,
      ),
    );
  }

  function selectRarity(rarity: number) {
    setSelected(rarity);

    const style = styles.find((s) => s.rarity === rarity);

    setColors(
        style?.borderConfig?.colors ??
        DEFAULT_COLORS[rarity] ??
        DEFAULT_COLORS[1]!,
    );

    setAngle(style?.borderConfig?.angle ?? 135);
    setMessage(null);
  }

  async function uploadFile(file: File) {
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: "error", text: "Ukuran file maksimal 2 MB." });
      return null;
    }

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setMessage({
        type: "error",
        text: "Format file harus PNG, JPEG, atau WebP.",
      });
      return null;
    }

    setUploading(true);
    setMessage(null);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const response = await fetch("/api/admin/uploads", {
        method: "POST",
        body: fd,
        credentials: "same-origin",
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message ?? "Upload gagal.");
      }

      return data.url as string;
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Upload gagal.",
      });
      return null;
    } finally {
      setUploading(false);
    }
  }

  async function handleUpload(file: File) {
    const url = await uploadFile(file);
    if (!url) return;

    updateCurrent({
      borderType: "IMAGE",
      borderImageUrl: url,
    });
  }

  function pointFromEvent(
    event: React.PointerEvent<HTMLCanvasElement>,
  ) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();

    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function startDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    canvas.setPointerCapture(event.pointerId);
    drawing.current = true;
    lastPoint.current = pointFromEvent(event);

    context.beginPath();
    context.arc(
      lastPoint.current.x,
      lastPoint.current.y,
      brushSize / 2,
      0,
      Math.PI * 2,
    );
    context.fillStyle = brushColor;
    context.fill();
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || !lastPoint.current) return;

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const point = pointFromEvent(event);

    context.beginPath();
    context.moveTo(lastPoint.current.x, lastPoint.current.y);
    context.lineTo(point.x, point.y);
    context.strokeStyle = brushColor;
    context.lineWidth = brushSize;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.stroke();

    lastPoint.current = point;
  }

  function stopDrawing() {
    drawing.current = false;
    lastPoint.current = null;
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  async function saveDrawing() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );

    if (!blob) {
      setMessage({ type: "error", text: "Gagal membuat gambar PNG." });
      return;
    }

    const file = new File([blob], `rarity-${selected}-border.png`, {
      type: "image/png",
    });

    await handleUpload(file);
  }

  async function saveStyle() {
    setSaving(true);
    setMessage(null);

    try {
      const payload = {
        ...current,
        borderConfig:
          current.borderType === "GRADIENT"
            ? { colors, angle }
            : current.borderConfig,
        borderImageUrl:
          current.borderType === "IMAGE"
            ? current.borderImageUrl
            : null,
      };

      await apiFetch("/api/admin/rarity-styles", {
        method: "PUT",
        body: payload,
      });

      setMessage({ type: "success", text: "Border rarity berhasil disimpan." });
      router.refresh();
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  }

  const gradient = `linear-gradient(${angle}deg, ${colors.join(", ")})`;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {[1, 2, 3, 4, 5, 6].map((rarity) => (
          <button
            key={rarity}
            type="button"
            onClick={() => selectRarity(rarity)}
            className={`rounded-lg border p-3 font-semibold ${
              selected === rarity
                ? "border-primary bg-primary/10"
                : "bg-card"
            }`}
          >
            {rarity}★
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pengaturan border {selected}★</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-3 gap-2">
              {(["PRESET", "GRADIENT", "IMAGE"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => updateCurrent({ borderType: type })}
                  className={`rounded-md border p-2 text-sm font-semibold ${
                    current.borderType === type
                      ? "border-primary bg-primary/10"
                      : ""
                  }`}
                >
                  {type === "PRESET"
                    ? "Preset"
                    : type === "GRADIENT"
                      ? "Gradient"
                      : "Gambar"}
                </button>
              ))}
            </div>

            {current.borderType === "PRESET" && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Pilih preset border bawaan.
                </p>
                <div
                  className={`h-20 rounded-xl bg-gradient-to-br ${
                    PRESET_CLASSES[selected]
                  }`}
                />
              </div>
            )}

            {current.borderType === "GRADIENT" && (
              <div className="space-y-4">
                <div
                  className="h-20 rounded-xl"
                  style={{ background: gradient }}
                />

                {colors.map((color, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-3"
                  >
                    <label className="text-sm">
                      Warna {index + 1}
                    </label>
                    <input
                      type="color"
                      value={color}
                      onChange={(event) => {
                        const next = [...colors];
                        next[index] = event.target.value;
                        setColors(next);
                      }}
                    />
                  </div>
                ))}

                <button
                  type="button"
                  className="text-sm underline"
                  onClick={() =>
                    setColors([...colors, "#FFFFFF"].slice(0, 5))
                  }
                  disabled={colors.length >= 5}
                >
                  Tambah warna
                </button>

                <button
                  type="button"
                  className="text-sm underline"
                  onClick={() =>
                    setColors(colors.length > 2 ? colors.slice(0, -1) : colors)
                  }
                  disabled={colors.length <= 2}
                >
                  Hapus warna terakhir
                </button>

                <label className="block space-y-2 text-sm">
                  Arah gradient: {angle}°
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={angle}
                    onChange={(event) => setAngle(Number(event.target.value))}
                    className="w-full"
                  />
                </label>
              </div>
            )}

            {current.borderType === "IMAGE" && (
              <div className="space-y-3">
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-sm hover:bg-muted">
                  <Upload className="size-4" />
                  {uploading ? "Mengunggah..." : "Pilih gambar border"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    disabled={uploading}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void handleUpload(file);
                      event.target.value = "";
                    }}
                  />
                </label>

                {current.borderImageUrl && (
                  <p className="break-all text-xs text-muted-foreground">
                    {current.borderImageUrl}
                  </p>
                )}
              </div>
            )}

            <Button
              type="button"
              className="w-full"
              onClick={saveStyle}
              disabled={saving || uploading}
            >
              <Save className="mr-2 size-4" />
              {saving ? "Menyimpan..." : "Simpan border"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preview karakter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="mx-auto flex size-48 items-center justify-center rounded-2xl bg-muted">
              <div
                className="size-36 rounded-xl p-1"
                style={{
                  background:
                    current.borderType === "IMAGE"
                      ? "transparent"
                      : current.borderType === "GRADIENT"
                        ? gradient
                        : undefined,
                }}
              >
                {current.borderType === "IMAGE" && current.borderImageUrl ? (
                  <div className="relative size-full">
                    <div className="absolute inset-2 rounded-lg bg-gradient-to-br from-slate-300 to-slate-500" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={current.borderImageUrl}
                      alt="Preview border"
                      className="absolute inset-0 size-full object-fill"
                    />
                  </div>
                ) : (
                  <div
                    className={`flex size-full items-center justify-center rounded-lg bg-gradient-to-br ${
                      current.borderType === "PRESET"
                        ? PRESET_CLASSES[selected]
                        : ""
                    }`}
                  >
                    <span className="text-4xl">✦</span>
                  </div>
                )}
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              Preview sementara. Border akan diterapkan pada gambar karakter
              setelah integrasi komponen selesai.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paintbrush className="size-5" />
            Gambar border sendiri
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Gambar pada kanvas transparan. Sisakan bagian tengah agar gambar
            karakter dapat terlihat.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              Warna
              <input
                type="color"
                value={brushColor}
                onChange={(event) => setBrushColor(event.target.value)}
              />
            </label>

            <label className="flex items-center gap-2 text-sm">
              Ukuran kuas
              <input
                type="range"
                min={2}
                max={40}
                value={brushSize}
                onChange={(event) => setBrushSize(Number(event.target.value))}
              />
              {brushSize}px
            </label>

            <Button type="button" variant="outline" onClick={clearCanvas}>
              <RotateCcw className="mr-2 size-4" />
              Hapus gambar
            </Button>
          </div>

          <div className="max-w-md overflow-hidden rounded-lg border bg-[linear-gradient(45deg,#ddd_25%,transparent_25%),linear-gradient(-45deg,#ddd_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#ddd_75%),linear-gradient(-45deg,transparent_75%,#ddd_75%)] bg-[size:20px_20px]">
            <canvas
              ref={canvasRef}
              width={320}
              height={320}
              className="block aspect-square w-full touch-none"
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerCancel={stopDrawing}
              onPointerLeave={stopDrawing}
            />
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={saveDrawing}
            disabled={uploading}
          >
            Simpan hasil gambar sebagai border
          </Button>
        </CardContent>
      </Card>

      {message && <Alert variant={message.type}>{message.text}</Alert>}
    </div>
  );
}
