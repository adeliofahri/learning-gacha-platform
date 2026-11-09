import { PageHeader } from "@/components/ui/misc";
import { SettingsForm } from "@/components/admin/settings-form";
import {
  getDifficultyConfig,
  getQuestionUnlockCost,
} from "@/server/services/learning.service";
import { getShardConfig } from "@/server/services/gacha.service";

export const metadata = { title: "Pengaturan" };

export default async function SettingsPage() {
  const [bounties, shards, unlockShardCost] = await Promise.all([
    getDifficultyConfig(),
    getShardConfig(),
    getQuestionUnlockCost(),
  ]);
  return (
    <div>
      <PageHeader
        title="Pengaturan ekonomi"
        description="Pengaturan bounty per tingkat kesulitan yang berlaku untuk seluruh soal, serta konversi duplikat menjadi shard. Nilai seed adalah konfigurasi DEMO.."
      />
      <SettingsForm
        initial={{
          unlockShardCost,
          bounties,
          shards: Object.fromEntries(
            [1, 2, 3, 4, 5, 6].map((r) => [String(r), shards[r] ?? 0]),
          ) as Record<"1" | "2" | "3" | "4" | "5" | "6", number>,
        }}
      />
    </div>
  );
}

