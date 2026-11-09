import { getRarityStyles } from "@/server/services/admin.service";
import {
  RarityStyleProvider,
  type RarityStyleConfig,
} from "@/components/shared/rarity-style-provider";

export async function RarityStyleBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  const styles = await getRarityStyles();

  return (
    <RarityStyleProvider
      styles={styles as unknown as RarityStyleConfig[]}
    >
      {children}
    </RarityStyleProvider>
  );
}