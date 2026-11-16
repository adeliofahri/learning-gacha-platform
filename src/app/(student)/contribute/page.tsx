import { PageHeader } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { ContributionForm } from "@/components/contribution/contribution-form";
import { requireStudentPage } from "@/lib/auth/current-user";
import { getContributionDashboard } from "@/server/services/contribution.service";
import { getDifficultyConfig } from "@/server/services/learning.service";
import { BUILT_IN_CHARACTER_IMAGES } from "@/lib/constants/character-art";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kontribusi" };

export default async function ContributionPage() {
  const user = await requireStudentPage();
  const [dashboard, bounties, subjects] = await Promise.all([
    getContributionDashboard(user.id),
    getDifficultyConfig(),
    prisma.subject.findMany({
      include: { topics: { orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="Kontribusi komunitas" description="Bagikan soal dan karakter buatanmu. Kontribusi akan ditinjau admin sebelum dipublikasikan." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Card><CardContent className="p-4"><p className="text-muted-foreground text-sm">Kuota soal minggu ini</p><p className="text-2xl font-black">{dashboard.quotas.QUESTION.used}/{dashboard.quotas.QUESTION.limit}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-muted-foreground text-sm">Kuota karakter minggu ini</p><p className="text-2xl font-black">{dashboard.quotas.CHARACTER.used}/{dashboard.quotas.CHARACTER.limit}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-muted-foreground text-sm">Menunggu review</p><p className="text-2xl font-black">{dashboard.pending}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-muted-foreground text-sm">Contribution Points</p><p className="text-2xl font-black">{dashboard.contributionPoints}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-muted-foreground text-sm">Soal dipublikasikan</p><p className="text-2xl font-black">{dashboard.publishedQuestions}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-muted-foreground text-sm">Karakter kontribusi</p><p className="text-2xl font-black">{dashboard.publishedCharacters}</p></CardContent></Card>
      </div>
      <p className="text-muted-foreground text-sm">Kuota direset setiap Senin pukul 00.00 WIB. Pengiriman yang ditolak tetap dihitung dalam kuota minggu tersebut.</p>
      <ContributionForm subjects={subjects} bounties={bounties} characterLibrary={[...BUILT_IN_CHARACTER_IMAGES]} />
    </div>
  );
}
