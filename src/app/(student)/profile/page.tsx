import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/misc";
import { ProfileForm } from "@/components/shared/profile-form";
import { ChangePasswordForm } from "@/components/shared/change-password-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStudentPage } from "@/lib/auth/current-user";
import { getProfileSummary, listInventory } from "@/server/services/collection.service";

export const metadata = { title: "Profil" };

export default async function ProfilePage() {
  const user = await requireStudentPage();
  const [profile, inventory] = await Promise.all([
    getProfileSummary(user.id),
    listInventory(user.id),
  ]);
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Profil"
        description="Atur avatar dan visibilitas profil publikmu. Email tidak pernah ditampilkan ke publik."
        actions={
          <Button asChild variant="outline">
            <Link href={`/students/${profile.username}`}>
              <ExternalLink /> Lihat profil publik
            </Link>
          </Button>
        }
      />
      <ProfileForm
        username={profile.username}
        totalStars={profile.totalStars}
        isPublic={profile.isPublic}
        avatarCharacterId={profile.avatarCharacterId}
        owned={inventory.map((i) => ({
          id: i.characterId,
          name: i.character.name,
          rarity: i.character.rarity,
          imageUrl: i.character.imageUrl,
        }))}
      />
      <Card className="mt-6 max-w-md">
        <CardHeader>
          <CardTitle>Keamanan akun</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
