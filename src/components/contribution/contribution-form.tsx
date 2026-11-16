"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { QuestionForm } from "@/components/admin/question-form";
import { CharacterForm } from "@/components/admin/character-form";
import type { Difficulty } from "@prisma/client";

export function ContributionForm({
  subjects,
  bounties,
  characterLibrary,
}: {
  subjects: {
    id: string;
    name: string;
    topics: { id: string; name: string }[];
  }[];
  bounties: Record<Difficulty, number>;
  characterLibrary: string[];
}) {
  const [kind, setKind] = useState<"QUESTION" | "CHARACTER">("QUESTION");
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant={kind === "QUESTION" ? "default" : "outline"} onClick={() => setKind("QUESTION")}>
          Kontribusi soal
        </Button>
        <Button type="button" variant={kind === "CHARACTER" ? "default" : "outline"} onClick={() => setKind("CHARACTER")}>
          Kontribusi karakter
        </Button>
      </div>
      {kind === "QUESTION" ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Isi soal menggunakan editor matematika dan pratinjau yang sama dengan editor admin. Mata pelajaran, topik, dan tingkat kesulitan akan ditentukan admin.
          </p>
          <QuestionForm subjects={subjects} bounties={bounties} submissionMode />
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Gunakan editor karakter untuk mengatur artwork, rarity, kategori, dan tampilan border. Admin dapat menyunting detail sebelum menyetujui.
          </p>
          <CharacterForm library={characterLibrary} submissionMode />
        </div>
      )}
    </div>
  );
}
