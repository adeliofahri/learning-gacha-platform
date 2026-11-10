"use client";

import { Star } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import { useRarityStyles } from "@/components/shared/rarity-style-provider";

export const RARITY_STYLE: Record<number, string> = {
  1: "from-slate-200 to-slate-400 ring-slate-300",
  2: "from-green-200 to-green-500 ring-green-300",
  3: "from-sky-200 to-sky-500 ring-sky-300",
  4: "from-purple-200 to-purple-500 ring-purple-300",
  5: "from-amber-200 to-amber-500 ring-amber-300",
  6: "from-rose-200 via-fuchsia-300 to-amber-300 ring-rose-400",
};

type BorderConfig = {
  colors: string[];
  angle: number;
};

type CharacterData = {
  name: string;
  rarity: number;
  imageUrl: string;
  category: "PERMANENT" | "LIMITED";
  limitedBorderType?: "PRESET" | "GRADIENT" | "IMAGE";
  limitedBorderConfig?: unknown;
  limitedBorderImageUrl?: string | null;
};

function isBorderConfig(value: unknown): value is BorderConfig {
  if (!value || typeof value !== "object") return false;

  const config = value as Record<string, unknown>;

  return (
    Array.isArray(config.colors) &&
    config.colors.length >= 2 &&
    config.colors.length <= 5 &&
    config.colors.every(
      (color) =>
        typeof color === "string" &&
        /^#[0-9A-Fa-f]{6}$/.test(color),
    ) &&
    typeof config.angle === "number" &&
    Number.isInteger(config.angle) &&
    config.angle >= 0 &&
    config.angle <= 360
  );
}

export function RarityStars({
  rarity,
  className,
}: {
  rarity: number;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      aria-label={`${rarity} bintang`}
      title={`${rarity}★`}
    >
      {Array.from({ length: rarity }, (_, i) => (
        <Star
          key={i}
          className="size-3.5 fill-amber-400 text-amber-500"
          aria-hidden
        />
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
  character: CharacterData;
  footer?: React.ReactNode;
  className?: string;
}) {
  const styles = useRarityStyles();

  const isLimited = character.category === "LIMITED";
  const isSixStar = character.rarity === 6;

  // PERMANENT memakai konfigurasi global.
  // LIMITED memakai konfigurasi individual karakter.
  const rarityStyle = styles.find(
    (item) => item.rarity === character.rarity,
  );

  const borderType = isLimited
    ? character.limitedBorderType ?? "PRESET"
    : rarityStyle?.borderType ?? "PRESET";

  const rawBorderConfig = isLimited
    ? character.limitedBorderConfig
    : rarityStyle?.borderConfig;

  const borderConfig = isBorderConfig(rawBorderConfig)
    ? rawBorderConfig
    : null;

  const colors =
    borderConfig?.colors ?? ["#A855F7", "#E11D48", "#FACC15"];

  const angle = borderConfig?.angle ?? 0;

  const borderImageUrl =
    borderType === "IMAGE"
      ? isLimited
        ? character.limitedBorderImageUrl
        : rarityStyle?.borderImageUrl
      : null;

  const borderBackground =
    borderType === "GRADIENT"
      ? `linear-gradient(${angle}deg, ${colors.join(", ")})`
      : undefined;

  const animationColors = colors.join(", ");

  return (
    <div
      className={cn(
        "bg-card flex flex-col items-center gap-2 rounded-lg border p-3 text-center shadow-sm",
        className,
      )}
    >
      <div
        className={cn(
          "relative size-[104px] rounded-xl p-1",
          borderType === "PRESET" &&
            cn(
              "bg-gradient-to-br ring-2",
              RARITY_STYLE[character.rarity] ?? RARITY_STYLE[1],
            ),
        )}
        style={
          borderBackground
            ? { background: borderBackground }
            : undefined
        }
      >
        {borderImageUrl ? (
          <>
            <div className="absolute inset-2 overflow-hidden rounded-lg">
              <CharacterImage
                src={character.imageUrl}
                name={character.name}
                size={88}
                className="size-full rounded-lg"
              />
            </div>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={borderImageUrl}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 size-full object-fill"
            />
          </>
        ) : (
          <div className="size-full overflow-hidden rounded-lg">
            <CharacterImage
              src={character.imageUrl}
              name={character.name}
              size={96}
              className="size-full rounded-lg"
            />
          </div>
        )}

        {isSixStar && (
          <span
            aria-hidden="true"
            className="rarity-six-animated pointer-events-none absolute inset-0 z-20 rounded-xl"
            style={
              {
                "--rarity-colors": animationColors,
              } as React.CSSProperties
            }
          />
        )}
      </div>

      <p className="line-clamp-2 text-sm leading-tight font-semibold">
        {character.name}
      </p>

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
      <CharacterImage
        src={src}
        name={`Avatar ${name}`}
        size={size}
        className="rounded-full"
      />
    );

  return (
    <span
      aria-hidden
      className="bg-secondary text-secondary-foreground inline-flex items-center justify-center rounded-full font-bold"
      style={{
        width: size,
        height: size,
        fontSize: size / 2.4,
      }}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}