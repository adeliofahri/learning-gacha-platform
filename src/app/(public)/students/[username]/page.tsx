import { notFound } from "next/navigation";
import { PublicProfileContent } from "@/components/shared/public-profile-content";
import { getPublicProfile } from "@/server/services/collection.service";
import { AppError } from "@/lib/errors";

export const dynamic = "force-dynamic";

async function load(username: string) {
  try {
    return await getPublicProfile(username);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  return { title: `Profil ${(await params).username}` };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await load(decodeURIComponent(username));

  return <PublicProfileContent profile={profile} />;
}
