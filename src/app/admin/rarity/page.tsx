import { PageHeader } from "@/components/ui/misc";
import { RarityStyleEditor } from "@/components/admin/rarity-style-editor";
import { getRarityStyles } from "@/server/services/admin.service";

export const metadata = {
  title: "Rarity Border",
};

export default async function RaritySettingsPage() {
  const rawStyles = await getRarityStyles();

  const styles = rawStyles.map((style) => {
    const config = style.borderConfig;

    const borderConfig =
      config !== null &&
      typeof config === "object" &&
      !Array.isArray(config) &&
      "colors" in config &&
      "angle" in config &&
      Array.isArray(config.colors) &&
      config.colors.every((color) => typeof color === "string") &&
      typeof config.angle === "number"
        ? {
            colors: config.colors.map((color) => color as string),
            angle: config.angle,
        }
        : null;

    return {
      rarity: style.rarity,
      borderType: style.borderType,
      borderConfig,
      borderImageUrl: style.borderImageUrl,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rarity Border"
        description="Atur tampilan border untuk setiap tingkat rarity karakter."
      />
      <RarityStyleEditor initial={styles} />
    </div>
  );
}