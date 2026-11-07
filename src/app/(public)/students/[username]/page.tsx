import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { Avatar, CharacterTile } from "@/components/shared/rarity";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { getPublicProfile } from "@/server/services/collection.service";
import { AppError } from "@/lib/errors";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function load(username: string) {
  try {
    return await getPublicProfile(username);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  return { title: `Profil ${(await params).username}` };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await load(decodeURIComponent(username));
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Card className="mb-6">
        <CardContent className="flex flex-col items-center gap-4 p-6 sm:flex-row">
          <Avatar src={profile.avatar?.imageUrl} name={profile.username} size={96} />
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-black">{profile.username}</h1>
            <p className="text-muted-foreground text-sm">
              Bergabung {formatDate(profile.memberSince)}
            </p>
            <p className="mt-2 text-lg font-black text-amber-600">{profile.totalStars} ★ total</p>
          </div>
        </CardContent>
      </Card>
      {profile.collection === null ? (
        <EmptyState
          title="Koleksi bersifat privat"
          description="Siswa ini belum mengaktifkan profil publik."
          action={<Lock className="text-muted-foreground size-6" aria-hidden />}
        />
      ) : profile.collection.length === 0 ? (
        <EmptyState title="Belum ada karakter" />
      ) : (
        <>
          <h2 className="mb-3 text-lg font-bold">Koleksi ({profile.collection.length})</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {profile.collection.map((c) => (
              <CharacterTile key={c.id} character={c} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
