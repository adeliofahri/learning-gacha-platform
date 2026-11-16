
"use client";

import { useState } from "react";
import Image from "next/image";
import { BookOpen, Info } from "lucide-react";

import {
  Avatar,
  CharacterImage,
  CharacterTile,
  RarityStars,
} from "@/components/shared/rarity";
import { MathContent } from "@/components/shared/math-content";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { formatDate } from "@/lib/utils";

type Character = {
  id: string;
  name: string;
  description?: string;
  rarity: number;
  imageUrl: string;
  category: "PERMANENT" | "LIMITED";
  limitedBorderType: "PRESET" | "GRADIENT" | "IMAGE";
  limitedBorderConfig: unknown;
  limitedBorderImageUrl: string | null;
  status?: string;
};

type Question = {
  id: string;
  title: string;
  content: string;
  imageUrl: string | null;
  type: string;
  difficulty: string;
  createdAt: Date;
  subject: { name: string };
  options: { text: string; order: number }[];
};

type PublicProfile = {
  username: string;
  bio: string | null;
  avatar: {
    imageUrl: string;
  } | null;
  totalStars: number;
  contributionPoints: number;
  memberSince: Date;
  collection: Character[];
  questions: Question[];
  characters: Character[];
};

const difficultyLabels: Record<string, string> = {
  EASY: "Mudah",
  MEDIUM: "Menengah",
  HARD: "Sulit",
  EXPERT: "Expert",
};

const questionTypeLabels: Record<string, string> = {
  MULTIPLE_CHOICE: "Pilihan Ganda",
  MULTIPLE_SELECT: "Pilihan Ganda Kompleks",
  TRUE_FALSE: "Benar atau Salah",
  SHORT_ANSWER: "Isian Singkat",
};

function CharacterSection({
  title,
  characters,
  emptyTitle,
  onSelect,
}: {
  title: string;
  characters: Character[];
  emptyTitle: string;
  onSelect: (character: Character) => void;
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-bold">
        {title} ({characters.length})
      </h2>

      {characters.length === 0 ? (
        <EmptyState title={emptyTitle} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {characters.map((character) => (
            <button
              key={character.id}
              type="button"
              onClick={() => onSelect(character)}
              aria-label={`Lihat detail ${character.name}`}
              className="rounded-lg text-left transition hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <CharacterTile character={character} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export function PublicProfileContent({
  profile,
}: {
  profile: PublicProfile;
}) {
  const [selectedCharacter, setSelectedCharacter] =
    useState<Character | null>(null);

  const [selectedQuestion, setSelectedQuestion] =
    useState<Question | null>(null);

  const [showProfileInfo, setShowProfileInfo] = useState(false);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      {/* Header profil */}
    <Card className="relative mb-8">
    <CardContent className="flex flex-col items-center gap-4 p-6 sm:flex-row sm:p-8">
        <Avatar
        src={profile.avatar?.imageUrl}
        name={profile.username}
        size={96}
        />

        <div className="min-w-0 text-center sm:text-left">
        <h1 className="break-words text-2xl font-black sm:text-3xl">
            {profile.username}
        </h1>

        {profile.bio && (
            <p className="mt-2 max-w-2xl whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
            {profile.bio}
            </p>
        )}

        <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
            <span className="rounded-full bg-amber-500/10 px-3 py-1.5 text-sm font-bold text-amber-600">
            {profile.totalStars} Collection Stars
            </span>

            <span className="rounded-full bg-primary/10 px-3 py-1.5 text-sm font-bold text-primary">
            {profile.contributionPoints} Contribution Points
            </span>
        </div>
        </div>

        {/* Tombol informasi */}
        <div className="absolute right-4 top-4">
        <button
            type="button"
            onClick={() => setShowProfileInfo((prev) => !prev)}
            aria-label="Informasi tambahan profil"
            aria-expanded={showProfileInfo}
            className="flex size-9 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
            <Info className="size-5" />
        </button>

        {showProfileInfo && (
            <div
            role="status"
            className="absolute right-0 top-11 z-20 w-56 rounded-lg border bg-card p-3 text-sm shadow-lg"
            >
            <p className="font-semibold">Informasi profil</p>

            <p className="mt-2 text-muted-foreground">
                Bergabung {formatDate(profile.memberSince)}
            </p>
            </div>
        )}
        </div>
    </CardContent>
    </Card>

      {/* Koleksi karakter */}
      <CharacterSection
        title="Koleksi"
        characters={profile.collection}
        emptyTitle="Belum ada karakter di koleksi"
        onSelect={setSelectedCharacter}
      />

      {/* Soal kontribusi */}
      <section className="mb-8">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
          <BookOpen className="size-5" />
          Soal kontribusi ({profile.questions.length})
        </h2>

        {profile.questions.length === 0 ? (
          <EmptyState title="Belum ada soal yang dipublikasikan" />
        ) : (
          <div className="grid gap-4">
            {profile.questions.map((question) => (
              <button
                key={question.id}
                type="button"
                onClick={() => setSelectedQuestion(question)}
                aria-label={`Lihat soal ${question.title}`}
                className="group w-full rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Card className="h-full overflow-hidden transition-all duration-200 group-hover:border-primary/50 group-hover:shadow-md">
                  <CardContent className="space-y-4 p-4 sm:p-5">
                    {/* Metadata soal */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">
                        {question.subject.name}
                      </span>

                      <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">
                        {difficultyLabels[question.difficulty] ??
                          question.difficulty}
                      </span>
                    </div>

                    {/* Judul soal */}
                    <h3 className="text-lg font-bold leading-snug transition-colors group-hover:text-primary sm:text-xl">
                      <MathContent content={question.title} />
                    </h3>

                    {/* Preview gambar */}
                    {question.imageUrl && (
                      <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-secondary/20">
                        <Image
                          src={question.imageUrl}
                          alt="Gambar soal"
                          fill
                          unoptimized
                          className="object-contain"
                          sizes="(max-width: 768px) 95vw, 1200px"
                        />
                      </div>
                    )}

                    {/* Preview deskripsi */}
                    <div className="line-clamp-3 text-sm leading-relaxed text-muted-foreground sm:text-base sm:leading-7">
                      <MathContent content={question.content} />
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between gap-3 border-t pt-3">
                      <span className="text-xs font-medium text-muted-foreground">
                        {questionTypeLabels[question.type] ?? question.type}
                      </span>

                      <span className="text-xs font-bold text-primary transition-transform group-hover:translate-x-1">
                        Lihat soal →
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Karakter kontribusi */}
      <CharacterSection
        title="Karakter kontribusi"
        characters={profile.characters}
        emptyTitle="Belum ada karakter kontribusi"
        onSelect={setSelectedCharacter}
      />

      {/* Modal detail karakter */}
      <Dialog
        open={selectedCharacter !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedCharacter(null);
        }}
      >
        <DialogContent className="w-[calc(100vw-2rem)] max-w-xl">
          {selectedCharacter && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">
                  {selectedCharacter.name}
                </DialogTitle>
                <DialogDescription>
                  Detail karakter
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col items-center gap-5">
                <div className="rounded-2xl bg-secondary/40 p-4">
                  <CharacterImage
                    src={selectedCharacter.imageUrl}
                    name={selectedCharacter.name}
                    size={192}
                    className="max-w-full rounded-xl"
                  />
                </div>

                <div className="flex w-full flex-col items-center gap-3">
                  <RarityStars rarity={selectedCharacter.rarity} />

                  <div className="flex flex-wrap justify-center gap-2">
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold">
                      {selectedCharacter.rarity} Star
                    </span>

                    <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">
                      {selectedCharacter.category === "LIMITED"
                        ? "Limited"
                        : "Permanent"}
                    </span>

                    {selectedCharacter.status && (
                      <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">
                        {selectedCharacter.status}
                      </span>
                    )}
                  </div>
                </div>

                <div className="w-full rounded-xl border bg-secondary/30 p-4 sm:p-5">
                  <h3 className="mb-2 text-sm font-bold">Deskripsi</h3>

                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {selectedCharacter.description ||
                      "Belum ada deskripsi karakter."}
                  </p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal preview soal */}
      <Dialog
        open={selectedQuestion !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedQuestion(null);
        }}
      >
        <DialogContent className="w-[calc(100vw-2rem)] max-w-6xl xl:max-w-[90vw]">
          {selectedQuestion && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-6 text-xl sm:text-2xl">
                  <MathContent content={selectedQuestion.title} />
                </DialogTitle>

                <DialogDescription>
                  {selectedQuestion.subject.name} ·{" "}
                  {difficultyLabels[selectedQuestion.difficulty] ??
                    selectedQuestion.difficulty}{" "}
                  ·{" "}
                  {questionTypeLabels[selectedQuestion.type] ??
                    selectedQuestion.type}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Gambar soal: tepat di bawah judul */}
                {selectedQuestion.imageUrl && (
                  <div className="relative mx-auto aspect-video max-h-[500px] w-full overflow-hidden rounded-xl border bg-background">
                    <Image
                      src={selectedQuestion.imageUrl}
                      alt="Gambar soal"
                      fill
                      unoptimized
                      className="object-contain"
                      sizes="(max-width: 768px) 95vw, 1200px"
                    />
                  </div>
                )}

                {/* Deskripsi soal */}
                <div className="rounded-xl border bg-secondary/20 p-5 sm:p-7">
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                    Pertanyaan
                  </h3>

                  <div className="text-base leading-8 sm:text-lg sm:leading-9">
                    <MathContent content={selectedQuestion.content} />
                  </div>
                </div>

                {/* Pilihan jawaban */}
                {selectedQuestion.options.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold">
                      Pilihan jawaban
                    </h3>

                    <div className="grid gap-3">
                      {selectedQuestion.options.map((option, index) => (
                        <div
                          key={`${selectedQuestion.id}-${option.order}`}
                          className="flex items-start gap-3 rounded-xl border bg-card p-3 sm:p-4"
                        >
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold">
                            {String.fromCharCode(65 + index)}
                          </span>

                          <div className="min-w-0 flex-1 pt-1 text-sm leading-relaxed sm:text-base">
                            <MathContent content={option.text} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-center text-xs text-muted-foreground">
                  Preview soal kontribusi. Kunci jawaban tidak ditampilkan.
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
