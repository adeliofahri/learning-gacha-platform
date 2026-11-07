import { Coins, Gem } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function CoinAmount({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 font-bold tabular-nums", className)}>
      <Coins className="text-coin size-4" aria-hidden />
      {new Intl.NumberFormat("id-ID").format(value)}
      <span className="sr-only">koin</span>
    </span>
  );
}

export function ShardAmount({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 font-bold tabular-nums", className)}>
      <Gem className="text-shard size-4" aria-hidden />
      {new Intl.NumberFormat("id-ID").format(value)}
      <span className="sr-only">shard</span>
    </span>
  );
}
