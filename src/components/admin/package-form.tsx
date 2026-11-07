"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/misc";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { CONTENT_STATUS_LABEL, DIFFICULTY_LABEL } from "@/lib/constants";

type Q = {
  id: string;
  title: string;
  subject: string;
  status: string;
  difficulty: keyof typeof DIFFICULTY_LABEL;
};
type Values = {
  id?: string;
  title: string;
  description: string;
  subjectId: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  questionIds: string[];
};

export function PackageForm({
  subjects,
  questions,
  initial,
}: {
  subjects: { id: string; name: string }[];
  questions: Q[];
  initial?: Values;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<string[]>(initial?.questionIds ?? []);
  const form = useForm<Omit<Values, "questionIds">>({
    defaultValues: {
      title: initial?.title ?? "",
      description: initial?.description ?? "",
      subjectId: initial?.subjectId ?? "",
      status: initial?.status ?? "DRAFT",
    },
  });
  const byId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);
  const available = questions.filter(
    (q) =>
      !items.includes(q.id) &&
      q.status !== "ARCHIVED" &&
      (q.title.toLowerCase().includes(search.toLowerCase()) ||
        q.subject.toLowerCase().includes(search.toLowerCase())),
  );
  const move = (i: number, d: -1 | 1) =>
    setItems((list) => {
      const next = [...list];
      const j = i + d;
      if (j < 0 || j >= next.length) return list;
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });

  return (
    <form
      className="grid gap-6 lg:grid-cols-2"
      onSubmit={form.handleSubmit(async (values) => {
        setError(null);
        setSaved(false);
        const body = {
          ...values,
          subjectId: values.subjectId || null,
          description: values.description || null,
          questionIds: items,
        };
        try {
          if (initial?.id) {
            await apiFetch(`/api/admin/packages/${initial.id}`, { method: "PUT", body });
            setSaved(true);
            router.refresh();
          } else {
            const { package: p } = await apiFetch<{ package: { id: string } }>(
              "/api/admin/packages",
              { body },
            );
            router.push(`/admin/packages/${p.id}`);
            router.refresh();
          }
        } catch (e) {
          setError(errorMessage(e));
        }
      })}
    >
      <Card>
        <CardHeader>
          <CardTitle>Detail paket</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Judul</Label>
            <Input
              id="title"
              required
              minLength={3}
              {...form.register("title", { required: true })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea id="description" rows={3} {...form.register("description")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="subjectId">Mata pelajaran</Label>
              <Select id="subjectId" {...form.register("subjectId")}>
                <option value="">Campuran</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
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
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Urutan soal ({items.length})</p>
            {items.length === 0 ? (
              <p className="text-muted-foreground rounded-md border border-dashed p-4 text-center text-sm">
                Tambahkan soal dari daftar.
              </p>
            ) : (
              <ol className="space-y-2">
                {items.map((id, i) => {
                  const q = byId.get(id);
                  return (
                    <li key={id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                      <span className="text-muted-foreground w-6 text-center font-bold">
                        {i + 1}
                      </span>
                      <span className="flex-1">
                        {q?.title ?? id}
                        {q && q.status !== "PUBLISHED" && (
                          <Badge variant="secondary" className="ml-1">
                            {CONTENT_STATUS_LABEL[q.status as keyof typeof CONTENT_STATUS_LABEL]}
                          </Badge>
                        )}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Naikkan"
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Turunkan"
                        onClick={() => move(i, 1)}
                        disabled={i === items.length - 1}
                      >
                        <ArrowDown />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Keluarkan dari paket"
                        onClick={() => setItems((l) => l.filter((x) => x !== id))}
                      >
                        <X />
                      </Button>
                    </li>
                  );
                })}
              </ol>
            )}
            <p className="text-muted-foreground mt-2 text-xs">
              Hanya soal berstatus Dipublikasikan yang terlihat siswa. Soal yang sama tidak bisa
              dimasukkan dua kali.
            </p>
          </div>
          {error && <Alert variant="error">{error}</Alert>}
          {saved && <Alert variant="success">Paket tersimpan.</Alert>}
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Menyimpan…" : "Simpan paket"}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Bank soal</CardTitle>
          <Input
            placeholder="Cari soal…"
            aria-label="Cari soal"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </CardHeader>
        <CardContent>
          <ul className="max-h-[480px] space-y-2 overflow-y-auto">
            {available.map((q) => (
              <li key={q.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                <span className="flex-1">
                  <span className="font-medium">{q.title}</span>
                  <span className="text-muted-foreground block text-xs">
                    {q.subject} · {DIFFICULTY_LABEL[q.difficulty]} ·{" "}
                    {CONTENT_STATUS_LABEL[q.status as keyof typeof CONTENT_STATUS_LABEL]}
                  </span>
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setItems((l) => [...l, q.id])}
                  aria-label={`Tambahkan ${q.title}`}
                >
                  <Plus /> Tambah
                </Button>
              </li>
            ))}
            {available.length === 0 && (
              <li className="text-muted-foreground text-sm">Tidak ada soal lain.</li>
            )}
          </ul>
        </CardContent>
      </Card>
    </form>
  );
}
