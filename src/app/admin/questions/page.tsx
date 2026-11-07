import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { EmptyState, PageHeader, Pagination, Table, Td, Th } from "@/components/ui/misc";
import { listQuestionsAdmin } from "@/server/services/learning.service";
import { prisma } from "@/lib/db";
import { CONTENT_STATUS_LABEL, DIFFICULTY_LABEL, QUESTION_TYPE_LABEL } from "@/lib/constants";
import { clampPage, firstParam, formatDateTime } from "@/lib/utils";

export const metadata = { title: "Soal" };
const PAGE_SIZE = 20;
const pick = <T extends string>(v: string | undefined, allowed: readonly T[]) =>
  allowed.find((a) => a === v);

export default async function AdminQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = {
    search: firstParam(sp.q)?.slice(0, 100),
    subjectId: firstParam(sp.subject),
    status: pick(firstParam(sp.status), ["DRAFT", "PUBLISHED", "ARCHIVED"] as const),
    type: pick(firstParam(sp.type), ["MULTIPLE_CHOICE", "SHORT_ANSWER"] as const),
    difficulty: pick(firstParam(sp.difficulty), ["EASY", "MEDIUM", "HARD", "EXPERT"] as const),
    page: clampPage(sp.page),
    pageSize: PAGE_SIZE,
  };
  const [{ items, total }, subjects] = await Promise.all([
    listQuestionsAdmin(filters),
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Manajemen soal"
        actions={
          <Button asChild>
            <Link href="/admin/questions/new">
              <Plus /> Soal baru
            </Link>
          </Button>
        }
      />
      <form
        method="get"
        className="bg-card mb-4 grid gap-2 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-6"
        aria-label="Filter soal"
      >
        <Input
          name="q"
          placeholder="Cari judul/isi…"
          defaultValue={filters.search}
          className="lg:col-span-2"
          aria-label="Cari"
        />
        <Select name="subject" defaultValue={filters.subjectId ?? ""} aria-label="Mata pelajaran">
          <option value="">Semua mapel</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select name="status" defaultValue={filters.status ?? ""} aria-label="Status">
          <option value="">Semua status</option>
          {Object.entries(CONTENT_STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
        <Select name="type" defaultValue={filters.type ?? ""} aria-label="Tipe">
          <option value="">Semua tipe</option>
          {Object.entries(QUESTION_TYPE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
        <div className="flex gap-2">
          <Select name="difficulty" defaultValue={filters.difficulty ?? ""} aria-label="Kesulitan">
            <option value="">Semua level</option>
            {Object.entries(DIFFICULTY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="secondary">
            Filter
          </Button>
        </div>
      </form>
      {items.length === 0 ? (
        <EmptyState title="Tidak ada soal" description="Ubah filter atau buat soal baru." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Judul</Th>
              <Th>Mapel</Th>
              <Th>Tipe</Th>
              <Th>Level</Th>
              <Th className="text-right">Bounty</Th>
              <Th>Status</Th>
              <Th className="text-right">Attempt / Solved</Th>
              <Th>Diubah</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((q) => (
              <tr key={q.id} className="hover:bg-muted/40">
                <Td>
                  <Link
                    href={`/admin/questions/${q.id}`}
                    className="text-primary font-semibold hover:underline"
                  >
                    {q.title}
                  </Link>
                  <span className="text-muted-foreground ml-1 text-xs">v{q.version}</span>
                </Td>
                <Td>
                  {q.subject.name}
                  {q.topic && (
                    <span className="text-muted-foreground block text-xs">{q.topic.name}</span>
                  )}
                </Td>
                <Td>{QUESTION_TYPE_LABEL[q.type]}</Td>
                <Td>{DIFFICULTY_LABEL[q.difficulty]}</Td>
                <Td className="text-right tabular-nums">{q.bounty}</Td>
                <Td>
                  <Badge
                    variant={
                      q.status === "PUBLISHED"
                        ? "success"
                        : q.status === "DRAFT"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {CONTENT_STATUS_LABEL[q.status]}
                  </Badge>
                </Td>
                <Td className="text-right tabular-nums">
                  {q._count.attempts} / {q._count.solves}
                </Td>
                <Td className="text-xs whitespace-nowrap">{formatDateTime(q.updatedAt)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Pagination
        page={filters.page}
        total={total}
        pageSize={PAGE_SIZE}
        baseHref="/admin/questions"
        params={{
          q: filters.search,
          subject: filters.subjectId,
          status: filters.status,
          type: filters.type,
          difficulty: filters.difficulty,
        }}
      />
    </div>
  );
}
