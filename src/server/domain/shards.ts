export type ShardConfig = Record<number, number>;

/** Jumlah shard untuk satu duplikat berdasarkan rarity. */
export function shardsForDuplicate(rarity: number, config: ShardConfig): number {
  if (!Number.isInteger(rarity) || rarity < 1 || rarity > 6) throw new Error("Rarity harus 1-6");
  const value = config[rarity];
  if (value === undefined || !Number.isInteger(value) || value < 0) {
    throw new Error(`Konfigurasi shard untuk ${rarity}★ tidak ada`);
  }
  return value;
}

/** Hasil penerimaan karakter: baru masuk inventory, atau duplikat dikonversi menjadi shard. */
export function resolveAcquisition(params: {
  alreadyOwned: boolean;
  rarity: number;
  config: ShardConfig;
}): { isNew: boolean; shards: number } {
  if (!params.alreadyOwned) return { isNew: true, shards: 0 };
  return { isNew: false, shards: shardsForDuplicate(params.rarity, params.config) };
}
