"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, EmptyState } from "@/components/ui/misc";
import { Avatar, CharacterImage, RarityStars } from "@/components/shared/rarity";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { cn } from "@/lib/utils/cn";

type Owned = { id: string; name: string; rarity: number; imageUrl: string };

export function ProfileForm(props: {
  username: string;
  totalStars: number;
  isPublic: boolean;
  avatarCharacterId: string | null;
  owned: Owned[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const form = useForm<{ isPublic: boolean; avatarCharacterId: string }>({
    defaultValues: { isPublic: props.isPublic, avatarCharacterId: props.avatarCharacterId ?? "" },
  });
  const avatarId = form.watch("avatarCharacterId");
  const avatar = props.owned.find((o) => o.id === avatarId);

  return (
    <form
      className="grid gap-6 md:grid-cols-[280px_1fr]"
      onSubmit={form.handleSubmit(async (v) => {
        setMessage(null);
        try {
          await apiFetch("/api/profile", {
            method: "PATCH",
            body: { isPublic: v.isPublic, avatarCharacterId: v.avatarCharacterId || null },
          });
          setMessage({ type: "success", text: "Profil tersimpan." });
          router.refresh();
        } catch (e) {
          setMessage({ type: "error", text: errorMessage(e) });
        }
      })}
    >
      <Card className="h-fit">
        <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
          <Avatar src={avatar?.imageUrl} name={props.username} size={112} />
          <p className="text-xl font-black">{props.username}</p>
          <p className="font-black text-amber-600">{props.totalStars} ★ total</p>
          <label className="flex w-full items-start gap-3 rounded-md border p-3 text-left text-sm">
            <input
              type="checkbox"
              className="accent-primary mt-0.5 size-4"
              {...form.register("isPublic")}
              data-testid="toggle-public"
            />
            <span>
              <span className="block font-semibold">Profil publik</span>
              <span className="text-muted-foreground">
                Izinkan orang lain melihat koleksi karaktermu. Username, avatar, dan total bintang
                selalu terlihat di leaderboard.
              </span>
            </span>
          </label>
          {message && <Alert variant={message.type}>{message.text}</Alert>}
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Menyimpan…" : "Simpan profil"}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Pilih avatar</CardTitle>
          <p className="text-muted-foreground text-sm">
            Avatar hanya bisa dipilih dari karakter yang kamu miliki.
          </p>
        </CardHeader>
        <CardContent>
          {props.owned.length === 0 ? (
            <EmptyState
              title="Belum ada karakter"
              description="Dapatkan karakter dari gacha untuk dijadikan avatar."
            />
          ) : (
            <fieldset className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
              <legend className="sr-only">Karakter milikmu</legend>
              <label
                className={cn(
                  "has-[:checked]:border-primary has-[:checked]:bg-primary/10 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border p-2 text-xs",
                )}
              >
                <input
                  type="radio"
                  value=""
                  className="sr-only"
                  {...form.register("avatarCharacterId")}
                />
                <Avatar name={props.username} size={64} />
                Tanpa avatar
              </label>
              {props.owned.map((o) => (
                <label
                  key={o.id}
                  className="has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:focus-visible]:ring-ring flex cursor-pointer flex-col items-center gap-1 rounded-lg border p-2 text-center text-xs has-[:focus-visible]:ring-2"
                >
                  <input
                    type="radio"
                    value={o.id}
                    className="sr-only"
                    aria-label={o.name}
                    {...form.register("avatarCharacterId")}
                  />
                  <CharacterImage src={o.imageUrl} name={o.name} size={64} />
                  <span className="line-clamp-1 font-medium">{o.name}</span>
                  <RarityStars rarity={o.rarity} />
                </label>
              ))}
            </fieldset>
          )}
        </CardContent>
      </Card>
    </form>
  );
}
