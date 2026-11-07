import Link from "next/link";
import { BookOpenCheck, Coins, Sparkles, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import { CharacterImage } from "@/components/shared/rarity";
import { leaderboard } from "@/server/services/leaderboard.service";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    icon: BookOpenCheck,
    title: "Kerjakan soal",
    text: "Pilih paket soal sesukamu. Jawaban benar pertama kali memberi bounty koin.",
  },
  {
    icon: Coins,
    title: "Kumpulkan koin",
    text: "Koin virtual hanya didapat dari belajar dan event — tidak bisa dibeli.",
  },
  {
    icon: Sparkles,
    title: "Gacha karakter",
    text: "Pakai koin untuk gacha. Peluang setiap karakter ditampilkan transparan.",
  },
  {
    icon: Trophy,
    title: "Naik peringkat",
    text: "Skor leaderboard = total bintang karakter unik yang kamu miliki.",
  },
];

export default async function LandingPage() {
  const top = await leaderboard("lifetime", undefined, 5);
  return (
    <>
      <section className="bg-hero">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
          <div className="space-y-5">
            <span className="bg-primary/10 text-primary inline-flex rounded-full px-3 py-1 text-xs font-bold">
              Belajar jadi petualangan
            </span>
            <h1 className="text-4xl leading-tight font-black tracking-tight sm:text-5xl">
              Jawab soal, kumpulkan koin, <span className="text-primary">koleksi karakter</span>.
            </h1>
            <p className="text-muted-foreground max-w-lg text-lg">
              Learning Gacha Platform membuat latihan soal lebih seru: setiap jawaban benar memberi
              koin virtual yang bisa ditukar dengan karakter fantasi untuk koleksimu.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/register">Daftar gratis</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">Masuk</Link>
              </Button>
            </div>
          </div>
          <div className="relative mx-auto grid grid-cols-3 gap-3" aria-hidden>
            {[
              "garuda-ilmu",
              "surya-profesor",
              "ratu-aurora",
              "sena-sains",
              "arka-alkemis",
              "bayu-penyihir-bahasa",
            ].map((s, i) => (
              <div key={s} className={i % 2 ? "translate-y-6" : ""}>
                <CharacterImage
                  src={`/characters/${s}.svg`}
                  name=""
                  size={120}
                  className="shadow-lg"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="mb-6 text-2xl font-extrabold">Cara kerja</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <Card key={s.title}>
              <CardHeader>
                <s.icon className="text-primary size-8" aria-hidden />
                <CardTitle>
                  {i + 1}. {s.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">{s.text}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-16">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-2xl font-extrabold">Leaderboard teratas</h2>
          <Link href="/leaderboard" className="text-primary text-sm font-semibold hover:underline">
            Lihat semua
          </Link>
        </div>
        <LeaderboardTable entries={top.entries} compact />
      </section>
    </>
  );
}
