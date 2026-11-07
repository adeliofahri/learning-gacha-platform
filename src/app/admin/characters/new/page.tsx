import { PageHeader } from "@/components/ui/misc";
import { CharacterForm } from "@/components/admin/character-form";
import { libraryImages } from "@/server/services/upload.service";

export const metadata = { title: "Karakter baru" };

export default async function NewCharacterPage() {
  return (
    <div>
      <PageHeader title="Karakter baru" />
      <CharacterForm library={await libraryImages()} />
    </div>
  );
}
