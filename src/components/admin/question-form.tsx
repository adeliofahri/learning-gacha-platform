"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Eye, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/misc";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { CONTENT_STATUS_LABEL, DIFFICULTY_LABEL, QUESTION_TYPE_LABEL } from "@/lib/constants";

type Difficulty = "EASY" | "MEDIUM" | "HARD" | "EXPERT";
type FormValues = {
  id?: string;
  subjectId: string;
  topicId: string;
  title: string;
  content: string;
  imageUrl?: string | null;
  type: "MULTIPLE_CHOICE" | "MULTIPLE_SELECT" | "TRUE_FALSE" | "SHORT_ANSWER";
  difficulty: Difficulty;
  bounty: number;
  explanation: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  options: { text: string; isCorrect: boolean }[];
  acceptedAnswers: { text: string }[];
};

export function QuestionForm({
  subjects,
  bounties,
  initial,
  lockType = false,
}: {
  subjects: { id: string; name: string; topics: { id: string; name: string }[] }[];
  bounties: Record<Difficulty, number>;
  initial?: FormValues;
  lockType?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [preview, setPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const form = useForm<FormValues>({
    defaultValues: initial ?? {
      subjectId: subjects[0]?.id ?? "",
      topicId: "",
      title: "",
      content: "",
      imageUrl: null,
      type: "MULTIPLE_CHOICE",
      difficulty: "EASY",
      bounty: bounties.EASY,
      explanation: "",
      status: "DRAFT",
      options: [
        { text: "", isCorrect: true },
        { text: "", isCorrect: false },
      ],
      acceptedAnswers: [],
    },
  });
  const options = useFieldArray({ control: form.control, name: "options" });
  const answers = useFieldArray({ control: form.control, name: "acceptedAnswers" });
  const v = form.watch();
  const topics = subjects.find((s) => s.id === v.subjectId)?.topics ?? [];

  const changeQuestionType = (type: FormValues["type"]) => {
    form.setValue("type", type);

    if (type === "MULTIPLE_CHOICE") {
      options.replace([
        { text: "", isCorrect: true },
        { text: "", isCorrect: false },
      ]);
    } else if (type === "MULTIPLE_SELECT") {
      options.replace([
        { text: "", isCorrect: true },
        { text: "", isCorrect: true },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
      ]);
    } else if (type === "TRUE_FALSE") {
      options.replace([
        { text: "", isCorrect: true },
        { text: "", isCorrect: false },
        { text: "", isCorrect: true },
      ]);
    } else {
      answers.replace([{ text: "" }]);
    }
  };

  if (subjects.length === 0) {
    return (
      <Alert variant="warning">
        Buat mata pelajaran terlebih dahulu di menu &quot;Mapel &amp; topik&quot;.
      </Alert>
    );
  }

  return (
    <form
      className="grid gap-6 lg:grid-cols-[1fr_360px]"
      onSubmit={form.handleSubmit(async (values) => {
        setError(null);
        setSaved(false);
        const base = {
          subjectId: values.subjectId,
          topicId: values.topicId || null,
          title: values.title,
          content: values.content,
          imageUrl: values.imageUrl || null,
          difficulty: values.difficulty,
          bounty: Number(values.bounty),
          explanation: values.explanation || null,
          status: values.status,
        };
        const body =
          values.type === "SHORT_ANSWER"
            ? {
                ...base,
                type: values.type,
                acceptedAnswers: values.acceptedAnswers
                  .map((a) => a.text.trim())
                  .filter(Boolean),
              }
            : {
                ...base,
                type: values.type,
                options: values.options.map((o) => ({
                  text: o.text.trim(),
                  isCorrect: o.isCorrect,
                })),
              };
        try {
          if (initial?.id) {
            await apiFetch(`/api/admin/questions/${initial.id}`, { method: "PUT", body });
            setSaved(true);
            router.refresh();
          } else {
            const { question } = await apiFetch<{ question: { id: string } }>(
              "/api/admin/questions",
              { body },
            );
            router.push(`/admin/questions/${question.id}`);
            router.refresh();
          }
        } catch (e) {
          setError(errorMessage(e));
        }
      })}
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Konten soal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="subjectId">Mata pelajaran</Label>
                <Select
                  id="subjectId"
                  {...form.register("subjectId", {
                    required: true,
                    onChange: () => form.setValue("topicId", ""),
                  })}
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="topicId">Topik (opsional)</Label>
                <Select id="topicId" {...form.register("topicId")}>
                  <option value="">— Tanpa topik —</option>
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="title">Judul</Label>
              <Input
                id="title"
                required
                minLength={3}
                maxLength={200}
                {...form.register("title", { required: true })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="content">Pertanyaan</Label>
              <Textarea
                id="content"
                required
                rows={5}
                maxLength={5000}
                {...form.register("content", { required: true })}
              />
              <p className="text-muted-foreground text-xs">
                Teks biasa. HTML tidak dirender (aman dari XSS).
              </p>
              <div className="space-y-2">
                <Label htmlFor="questionImage">Gambar soal (opsional)</Label>

                <input
                  id="questionImage"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={uploading}
                  className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    setUploadError(null);

                    if (file.size > 2 * 1024 * 1024) {
                      setUploadError("Ukuran gambar maksimal 2 MB.");
                      e.target.value = "";
                      return;
                    }

                    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
                      setUploadError("Format gambar harus PNG, JPEG, atau WebP.");
                      e.target.value = "";
                      return;
                    }

                    const formData = new FormData();
                    formData.append("file", file);

                    try {
                      setUploading(true);

                      
                    const response = await fetch("/api/admin/question-images", {
                      method: "POST",
                      body: formData,
                      credentials: "same-origin",
                    });

                    const responseText = await response.text();

                    let data: { url?: string; message?: string } = {};

                    try {
                      data = responseText ? JSON.parse(responseText) : {};
                    } catch {
                      throw new Error(
                        `Server mengembalikan respons bukan JSON. HTTP ${response.status}. Respons: ${responseText.slice(0, 300) || "(kosong)"}`
                      );
                    }

                    if (!response.ok) {
                      throw new Error(
                        data.message || `Upload gagal. HTTP ${response.status}`
                      );
                    }

                    if (!data.url) {
                      throw new Error("Upload berhasil diproses, tetapi URL gambar tidak ditemukan.");
                    }

                    form.setValue("imageUrl", data.url, {
                      shouldDirty: true,
                    });

                    } catch (err) {
                      setUploadError(
                        err instanceof Error ? err.message : "Gagal mengunggah gambar."
                      );
                    } finally {
                      setUploading(false);
                      e.target.value = "";
                    }
                  }}
                />

                <p className="text-muted-foreground text-xs">
                  Format PNG, JPEG, atau WebP. Maksimal 2 MB.
                </p>

                {uploading && (
                  <p className="text-sm text-muted-foreground">Mengunggah gambar...</p>
                )}

                {uploadError && (
                  <Alert variant="error">{uploadError}</Alert>
                )}

                {v.imageUrl && (
                  <div className="space-y-2">
                    <img
                      src={v.imageUrl}
                      alt="Preview gambar soal"
                      className="max-h-64 w-full rounded-lg border object-contain"
                    />

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        form.setValue("imageUrl", null, { shouldDirty: true });
                        setUploadError(null);
                      }}
                    >
                      <Trash2 /> Hapus gambar
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="explanation">Pembahasan (opsional)</Label>
              <Textarea
                id="explanation"
                rows={3}
                maxLength={5000}
                {...form.register("explanation")}
              />
              <p className="text-muted-foreground text-xs">
                Ditampilkan ke siswa setelah soal solved.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {v.type === "MULTIPLE_CHOICE"
                ? "Pilihan jawaban"
                : v.type === "MULTIPLE_SELECT"
                  ? "Pilihan jawaban kompleks"
                  : v.type === "TRUE_FALSE"
                    ? "Pernyataan benar-salah"
                    : "Variasi jawaban acuan (untuk reviewer)"}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {v.type === "MULTIPLE_CHOICE" && (
              <>
                <p className="text-muted-foreground text-xs">
                  Tandai tepat satu jawaban benar. Minimal 2 dan maksimal 5 pilihan.
                </p>

                {options.fields.map((f, i) => (
                  <div key={f.id} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correct-option"
                      aria-label={`Jawaban benar: pilihan ${i + 1}`}
                      className="size-4 accent-primary"
                      checked={v.options[i]?.isCorrect ?? false}
                      onChange={() =>
                        v.options.forEach((_, j) =>
                          form.setValue(`options.${j}.isCorrect`, j === i),
                        )
                      }
                    />

                    <Input
                      placeholder={`Pilihan ${String.fromCharCode(65 + i)}`}
                      aria-label={`Teks pilihan ${i + 1}`}
                      {...form.register(`options.${i}.text`, { required: true })}
                    />

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Hapus pilihan"
                      disabled={options.fields.length <= 2}
                      onClick={() => options.remove(i)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={options.fields.length >= 5}
                  onClick={() => options.append({ text: "", isCorrect: false })}
                >
                  <Plus /> Tambah pilihan
                </Button>
              </>
            )}

            {v.type === "MULTIPLE_SELECT" && (
              <>
                <p className="text-muted-foreground text-xs">
                  Centang semua jawaban yang benar. Minimal 4, maksimal 5 pilihan,
                  dan setidaknya 2 jawaban benar.
                </p>

                {options.fields.map((f, i) => (
                  <div key={f.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      aria-label={`Tandai pilihan ${i + 1} sebagai benar`}
                      className="size-4 accent-primary"
                      checked={v.options[i]?.isCorrect ?? false}
                      onChange={(e) =>
                        form.setValue(
                          `options.${i}.isCorrect`,
                          e.target.checked,
                        )
                      }
                    />

                    <Input
                      placeholder={`Pilihan ${String.fromCharCode(65 + i)}`}
                      aria-label={`Teks pilihan ${i + 1}`}
                      {...form.register(`options.${i}.text`, { required: true })}
                    />

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Hapus pilihan"
                      disabled={options.fields.length <= 4}
                      onClick={() => options.remove(i)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={options.fields.length >= 5}
                  onClick={() => options.append({ text: "", isCorrect: false })}
                >
                  <Plus /> Tambah pilihan
                </Button>
              </>
            )}

            {v.type === "TRUE_FALSE" && (
              <>
                <p className="text-muted-foreground text-xs">
                  Masukkan 3–4 pernyataan. Tentukan apakah setiap pernyataan
                  merupakan pernyataan benar atau salah.
                </p>

                {options.fields.map((f, i) => (
                  <div key={f.id} className="space-y-2 rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <Label>Pernyataan {i + 1}</Label>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Hapus pernyataan"
                        disabled={options.fields.length <= 3}
                        onClick={() => options.remove(i)}
                      >
                        <Trash2 />
                      </Button>
                    </div>

                    <Textarea
                      placeholder={`Tulis pernyataan ${i + 1}`}
                      rows={2}
                      {...form.register(`options.${i}.text`, { required: true })}
                    />

                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name={`truth-${f.id}`}
                          checked={v.options[i]?.isCorrect === true}
                          onChange={() =>
                            form.setValue(`options.${i}.isCorrect`, true)
                          }
                        />
                        Benar
                      </label>

                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name={`truth-${f.id}`}
                          checked={v.options[i]?.isCorrect === false}
                          onChange={() =>
                            form.setValue(`options.${i}.isCorrect`, false)
                          }
                        />
                        Salah
                      </label>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={options.fields.length >= 4}
                  onClick={() => options.append({ text: "", isCorrect: false })}
                >
                  <Plus /> Tambah pernyataan
                </Button>
              </>
            )}

            {v.type === "SHORT_ANSWER" && (
              <>
                <p className="text-muted-foreground text-xs">
                  Jawaban isian diperiksa admin. Variasi jawaban acuan hanya
                  terlihat oleh admin sampai soal diputuskan.
                </p>

                {answers.fields.map((f, i) => (
                  <div key={f.id} className="flex items-center gap-2">
                    <Input
                      placeholder={`Jawaban acuan ${i + 1}`}
                      aria-label={`Jawaban acuan ${i + 1}`}
                      {...form.register(`acceptedAnswers.${i}.text`)}
                    />

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Hapus jawaban acuan"
                      disabled={answers.fields.length <= 1}
                      onClick={() => answers.remove(i)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={answers.fields.length >= 10}
                  onClick={() => answers.append({ text: "" })}
                >
                  <Plus /> Tambah variasi jawaban
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Pengaturan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="type">Tipe</Label>
              <Select
                id="type"
                disabled={lockType}
                value={v.type}
                onChange={(e) =>
                  changeQuestionType(e.target.value as FormValues["type"])
                }
              >
                {Object.entries(QUESTION_TYPE_LABEL).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="difficulty">Tingkat kesulitan</Label>
              <Select
                id="difficulty"
                {...form.register("difficulty", {
                  onChange: (e) => form.setValue("bounty", bounties[e.target.value as Difficulty]),
                })}
              >
                {Object.entries(DIFFICULTY_LABEL).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l} (default {bounties[k as Difficulty]} koin)
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bounty">Bounty (koin)</Label>
              <Input
                id="bounty"
                type="number"
                min={0}
                max={10000}
                {...form.register("bounty", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <Select id="status" {...form.register("status")}>
                {Object.entries(CONTENT_STATUS_LABEL).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
            {error && <Alert variant="error">{error}</Alert>}
            {saved && <Alert variant="success">Soal tersimpan.</Alert>}
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Menyimpan…" : "Simpan"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPreview((p) => !p)}
                aria-expanded={preview}
              >
                <Eye /> Preview
              </Button>
            </div>
          </CardContent>
        </Card>
        {preview && (
          <Card aria-label="Preview soal">
            <CardHeader>
              <div className="flex flex-wrap gap-1">
                <Badge variant="secondary">{QUESTION_TYPE_LABEL[v.type]}</Badge>
                <Badge variant="secondary">{DIFFICULTY_LABEL[v.difficulty]}</Badge>
                <Badge>{v.bounty} koin</Badge>
              </div>
              <CardTitle>{v.title || "(judul)"}</CardTitle>
              <p className="text-sm whitespace-pre-wrap">{v.content || "(pertanyaan)"}</p>
              {v.imageUrl && 
              (
                <img
                  src={v.imageUrl}
                  alt="Preview gambar soal"
                  className="max-h-64 w-full rounded-lg border object-contain"
                />
              )
              }
            </CardHeader>
            <CardContent className="space-y-2">
              {v.type === "MULTIPLE_CHOICE" &&
                v.options.map((o, i) => (
                  <div key={i} className="rounded-md border p-2 text-sm">
                    {String.fromCharCode(65 + i)}. {o.text || "…"}{" "}
                    {o.isCorrect && <Badge variant="success">Benar</Badge>}
                  </div>
                ))}

              {v.type === "MULTIPLE_SELECT" &&
                v.options.map((o, i) => (
                  <div key={i} className="rounded-md border p-2 text-sm">
                    <span className="mr-2">{o.isCorrect ? "☑" : "☐"}</span>
                    {String.fromCharCode(65 + i)}. {o.text || "…"}
                    {o.isCorrect && <Badge variant="success">Benar</Badge>}
                  </div>
                ))}

              {v.type === "TRUE_FALSE" &&
                v.options.map((o, i) => (
                  <div key={i} className="rounded-md border p-3 text-sm">
                    <p>{i + 1}. {o.text || "…"}</p>
                    <Badge variant="secondary">
                      {o.isCorrect ? "Benar" : "Salah"}
                    </Badge>
                  </div>
                ))}

              {v.type === "SHORT_ANSWER" && (
                <div className="text-muted-foreground rounded-md border p-2 text-sm">
                  [kotak jawaban isian]
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </form>
  );
}
