import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState, PageHeader, Progress } from "@/components/ui/misc";
import { Select } from "@/components/ui/input";
import { requireStudentPage } from "@/lib/auth/current-user";
import { listPackagesForStudent } from "@/server/services/learning.service";
import { prisma } from "@/lib/db";
import { DIFFICULTY_LABEL } from "@/lib/constants";
import { firstParam } from "@/lib/utils";
import { PackageCover } from "@/components/learning/package-cover";

export const metadata = { title: "Belajar" };

const DIFFS = ["EASY", "MEDIUM", "HARD", "EXPERT"] as const;

export default async function LearnPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireStudentPage();
  const sp = await searchParams;
  const subjectId = firstParam(sp.subject);
  const diffRaw = firstParam(sp.difficulty);
  const difficulty = DIFFS.find((d) => d === diffRaw);
  const [subjects, packages] = await Promise.all([
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
    listPackagesForStudent(user.id, { subjectId, difficulty }),
  ]);

  return (
    <div>
      <PageHeader
        title="Paket soal"
        description="Pilih paket mana saja. Progres tersimpan otomatis — kamu bisa berhenti dan melanjutkan kapan saja."
      />
      <form
        className="bg-card mb-6 grid gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_1fr_auto]"
        method="get"
        aria-label="Filter paket"
      >
        <label className="space-y-1 text-sm font-medium">
          Mata pelajaran
          <Select name="subject" defaultValue={subjectId ?? ""}>
            <option value="">Semua</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="space-y-1 text-sm font-medium">
          Tingkat kesulitan
          <Select name="difficulty" defaultValue={difficulty ?? ""}>
            <option value="">Semua</option>
            {DIFFS.map((d) => (
              <option key={d} value={d}>
                {DIFFICULTY_LABEL[d]}
              </option>
            ))}
          </Select>
        </label>
        <div className="flex items-end gap-2">
          <Button type="submit">Terapkan</Button>
          <Button asChild variant="ghost">
            <Link href="/learn">Reset</Link>
          </Button>
        </div>
      </form>

      {packages.length === 0 ? (
        <EmptyState
          title="Tidak ada paket yang cocok"
          description="Coba ubah filter atau kembali lagi nanti."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((p) => (
            <Card key={p.id} className="flex flex-col overflow-hidden" data-testid="package-card">
              <PackageCover
                imageUrl={p.coverImageUrl}
                subject={p.subject}
                title={p.title}
                className="rounded-t-lg"
              />

              <CardHeader>
                <div className="flex flex-wrap gap-1">
                  {p.subject && <Badge>{p.subject}</Badge>}
                  {p.difficulties.map((d) => (
                    <Badge key={d} variant="secondary">
                      {DIFFICULTY_LABEL[d]}
                    </Badge>
                  ))}
                </div>
                <CardTitle>{p.title}</CardTitle>
                {p.description && <CardDescription>{p.description}</CardDescription>}
              </CardHeader>
              <CardContent className="mt-auto space-y-1">
                <Progress value={p.progress.percent} label={`Progress ${p.title}`} />
                <p className="text-muted-foreground text-xs">
                  {p.progress.solved}/{p.progress.total} soal selesai
                </p>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href={`/packages/${p.id}`}>
                    {p.progress.solved > 0 ? "Lanjutkan" : "Mulai"}
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
