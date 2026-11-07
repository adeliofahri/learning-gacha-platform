import { Star } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";

export const RARITY_STYLE: Record<number, string> = {
  1: "from-slate-200 to-slate-400 ring-slate-300",
  2: "from-green-200 to-green-500 ring-green-300",
  3: "from-sky-200 to-sky-500 ring-sky-300",
  4: "from-purple-200 to-purple-500 ring-purple-300",
  5: "from-amber-200 to-amber-500 ring-amber-300",
  6: "from-rose-200 via-fuchsia-300 to-amber-300 ring-rose-400",
};

export function RarityStars({ rarity, className }: { rarity: number; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      aria-label={`${rarity} bintang`}
      title={`${rarity}★`}
    >
      {Array.from({ length: rarity }, (_, i) => (
        <Star key={i} className="size-3.5 fill-amber-400 text-amber-500" aria-hidden />
      ))}
    </span>
  );
}

export function CharacterImage({
  src,
  name,
  size = 96,
  className,
}: {
  src: string;
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src={src}
      alt={name}
      width={size}
      height={size}
      unoptimized
      className={cn("rounded-xl object-cover", className)}
    />
  );
}

export function CharacterTile({
  character,
  footer,
  className,
}: {
  character: { name: string; rarity: number; imageUrl: string };
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-card flex flex-col items-center gap-2 rounded-lg border p-3 text-center shadow-sm",
        className,
      )}
    >
      <div
        className={cn("rounded-xl bg-gradient-to-br p-1 ring-2", RARITY_STYLE[character.rarity])}
      >
        <CharacterImage src={character.imageUrl} name={character.name} size={96} />
      </div>
      <p className="line-clamp-2 text-sm leading-tight font-semibold">{character.name}</p>
      <RarityStars rarity={character.rarity} />
      {footer}
    </div>
  );
}

export function Avatar({
  src,
  name,
  size = 36,
}: {
  src?: string | null;
  name: string;
  size?: number;
}) {
  if (src)
    return (
      <CharacterImage src={src} name={`Avatar ${name}`} size={size} className="rounded-full" />
    );
  return (
    <span
      aria-hidden
      className="bg-secondary text-secondary-foreground inline-flex items-center justify-center rounded-full font-bold"
      style={{ width: size, height: size, fontSize: size / 2.4 }}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
