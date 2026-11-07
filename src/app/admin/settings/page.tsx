import { PageHeader } from "@/components/ui/misc";
import { SettingsForm } from "@/components/admin/settings-form";
import { getDifficultyConfig } from "@/server/services/learning.service";
import { getShardConfig } from "@/server/services/gacha.service";

export const metadata = { title: "Pengaturan" };

export default async function SettingsPage() {
  const [bounties, shards] = await Promise.all([getDifficultyConfig(), getShardConfig()]);
  return (
    <div>
      <PageHeader
        title="Pengaturan ekonomi"
        description="Nilai default bounty per tingkat kesulitan (untuk soal baru) dan konversi duplikat menjadi shard. Nilai seed adalah konfigurasi DEMO."
      />
      <SettingsForm
        initial={{
          bounties,
          shards: Object.fromEntries(
            [1, 2, 3, 4, 5, 6].map((r) => [String(r), shards[r] ?? 0]),
          ) as Record<"1" | "2" | "3" | "4" | "5" | "6", number>,
        }}
      />
    </div>
  );
}
