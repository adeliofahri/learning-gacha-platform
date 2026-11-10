
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { CheckCircle2, Clock, XCircle, Unlock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { CoinAmount, ShardAmount } from "@/components/shared/currency";
import { MathContent } from "@/components/shared/math-content";
import { apiFetch, errorMessage, newIdempotencyKey } from "@/lib/api-client";
import { emitWalletUpdate } from "@/lib/wallet-events";
import {
  DIFFICULTY_LABEL,
  QUESTION_PROGRESS_LABEL,
  QUESTION_TYPE_LABEL,
} from "@/lib/constants";
import type { StudentQuestionView } from "@/server/services/learning.service";
import { cn } from "@/lib/utils/cn";

type AttemptResult = {
  status: "CORRECT" | "INCORRECT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  isPractice: boolean;
  bountyAwarded: number;
  correctOptionId: string | null;
  correctOptionIds: string[];
  correctTrueFalseAnswers: {
    optionId: string;
    value: boolean;
  }[];
  explanation: string | null;
  acceptedAnswers: string[];
  coins: number;
  cooldownUntil: string | null;
};

type FormValues = {
  optionId: string;
  answerText: string;
};

const STATUS_VARIANT = {
  UNSOLVED: "secondary",
  ATTEMPTED: "destructive",
  PENDING_REVIEW: "warning",
  SOLVED: "success",
} as const;

export function QuestionCard({
  question,
  packageId,
}: {
  question: StudentQuestionView;
  packageId: string;
}) {
  const router = useRouter();

  const [result, setResult] = useState<AttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [trueFalseAnswers, setTrueFalseAnswers] = useState<
    Record<string, boolean>
  >({});

  const cooldownUntil = unlocked
    ? null
    : result
      ? result.cooldownUntil
      : question.cooldownUntil;

  useEffect(() => {
    setNow(Date.now());

    if (!cooldownUntil) return;

    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  const remainingSeconds =
    now !== null && cooldownUntil
      ? Math.max(
          0,
          Math.ceil((Date.parse(cooldownUntil) - now) / 1000),
        )
      : 0;

  const cooldownActive = remainingSeconds > 0;

  const cooldownLabel = `${Math.floor(remainingSeconds / 60)
    .toString()
    .padStart(2, "0")}:${(remainingSeconds % 60)
    .toString()
    .padStart(2, "0")}`;

  const form = useForm<FormValues>({
    defaultValues: {
      optionId: "",
      answerText: "",
    },
  });

  const { isSubmitting } = form.formState;

  const status: StudentQuestionView["status"] = !result
    ? question.status
    : result.status === "CORRECT" || result.status === "APPROVED"
      ? "SOLVED"
      : result.status === "PENDING_REVIEW"
        ? "PENDING_REVIEW"
        : question.status === "SOLVED"
          ? "SOLVED"
          : "ATTEMPTED";

  const solved = status === "SOLVED";
  const pending = status === "PENDING_REVIEW";

  const correctOptionId =
    result?.correctOptionId ?? question.correctOptionId;

  const correctOptionIds =
    result?.correctOptionIds?.length
      ? result.correctOptionIds
      : question.correctOptionIds ?? [];

  const correctTrueFalseAnswers =
    result?.correctTrueFalseAnswers?.length
      ? result.correctTrueFalseAnswers
      : question.correctTrueFalseAnswers ?? [];

  const explanation = result?.explanation ?? question.explanation;

  const accepted =
    result?.acceptedAnswers?.length
      ? result.acceptedAnswers
      : question.acceptedAnswers ?? [];

  const selected = form.watch("optionId");

  function toggleOption(optionId: string) {
    setSelectedOptionIds((current) =>
      current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId],
    );
  }

  async function handleUnlock() {
    setError(null);
    setIsUnlocking(true);

    try {
      const r = await apiFetch<{
        unlocked: boolean;
        charged: number;
        shards: number;
      }>(`/api/questions/${question.id}/unlock`, {
        method: "POST",
      });

      setUnlocked(true);
      emitWalletUpdate({ shards: r.shards });
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setIsUnlocking(false);
    }
  }

  async function handleSubmit(values: FormValues) {
    setError(null);

    let body:
      | { packageId: string; optionId: string }
      | { packageId: string; optionIds: string[] }
      | {
          packageId: string;
          trueFalseAnswers: { optionId: string; value: boolean }[];
        }
      | { packageId: string; answerText: string };

    if (question.type === "MULTIPLE_CHOICE") {
      if (!values.optionId) {
        setError("Pilih salah satu jawaban.");
        return;
      }

      body = {
        packageId,
        optionId: values.optionId,
      };
    } else if (question.type === "MULTIPLE_SELECT") {
      if (selectedOptionIds.length < 2) {
        setError("Pilih minimal dua jawaban.");
        return;
      }

      body = {
        packageId,
        optionIds: selectedOptionIds,
      };
    } else if (question.type === "TRUE_FALSE") {
      const answers = question.options.map((option) => {
        const value = trueFalseAnswers[option.id];

        return {
          optionId: option.id,
          value,
        };
      });

      if (answers.some((answer) => answer.value === undefined)) {
        setError("Tentukan Benar atau Salah untuk setiap pernyataan.");
        return;
      }

      body = {
        packageId,
        trueFalseAnswers: answers as {
          optionId: string;
          value: boolean;
        }[],
      };
    } else {
      if (!values.answerText.trim()) {
        setError("Tulis jawabanmu terlebih dahulu.");
        return;
      }

      body = {
        packageId,
        answerText: values.answerText.trim(),
      };
    }

    try {
      const r = await apiFetch<AttemptResult>(
        `/api/questions/${question.id}/attempts`,
        {
          body,
          idempotencyKey: newIdempotencyKey(),
        },
      );

      setUnlocked(false);
      setResult(r);
      emitWalletUpdate({ coins: r.coins });
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <Card data-testid={`question-${question.order}`}>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-sm font-bold">
            Soal {question.order}
          </span>

          <Badge variant={STATUS_VARIANT[status]} data-testid="question-status">
            {QUESTION_PROGRESS_LABEL[status]}
          </Badge>

          <Badge variant="secondary">
            {QUESTION_TYPE_LABEL[question.type]}
          </Badge>

          <Badge variant="secondary">
            {DIFFICULTY_LABEL[question.difficulty]}
          </Badge>

          <span className="ml-auto text-sm">
            Bounty <CoinAmount value={question.bounty} />
          </span>
        </div>

          <h2 className="text-lg font-bold">
            <MathContent content={question.title} />
          </h2>

          {/* GAMBAR SOAL */}
          {question.imageUrl && (
            <div className="my-3 overflow-hidden rounded-lg border">
              <img
                src={question.imageUrl}
                alt={`Gambar untuk soal ${question.order}`}
                className="h-auto max-h-[500px] w-full object-contain"
                loading="lazy"
              />
            </div>
          )}

          {/* DESKRIPSI SOAL */}
          <p className="whitespace-pre-wrap text-justify">
            <MathContent content={question.content} />
          </p>

      </CardHeader>

      <CardContent>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(handleSubmit)}
        >
          {/* PILIHAN GANDA */}
          {question.type === "MULTIPLE_CHOICE" && (
            <fieldset className="space-y-2" disabled={cooldownActive}>
              <legend className="sr-only">Pilihan jawaban</legend>

              {question.options.map((option, index) => (
                <label
                  key={option.id}
                  className={cn(
                    "hover:bg-muted/60 has-[:checked]:border-primary has-[:checked]:bg-primary/5 flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors",
                    solved &&
                      correctOptionId === option.id &&
                      "border-success bg-success/10",
                    result?.status === "INCORRECT" &&
                      selected === option.id &&
                      "border-destructive bg-destructive/5",
                  )}
                >
                  <input
                    type="radio"
                    value={option.id}
                    className="accent-primary size-4"
                    {...form.register("optionId")}
                  />

                  <span className="text-muted-foreground font-semibold">
                    {String.fromCharCode(65 + index)}.
                  </span>

                  <span>
                    <MathContent content={option.text} />
                  </span>
                </label>
              ))}
            </fieldset>
          )}

          {/* PILIHAN GANDA KOMPLEKS */}
          {question.type === "MULTIPLE_SELECT" && (
            <fieldset className="space-y-2" disabled={cooldownActive}>
              <legend className="mb-2 text-sm text-muted-foreground">
                Pilih semua jawaban yang benar. Minimal dua pilihan.
              </legend>

              {question.options.map((option, index) => {
                const isCorrect = correctOptionIds.includes(option.id);
                const isSelected = selectedOptionIds.includes(option.id);

                return (
                  <label
                    key={option.id}
                    className={cn(
                      "hover:bg-muted/60 has-[:checked]:border-primary has-[:checked]:bg-primary/5 flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors",
                      solved && isCorrect && "border-success bg-success/10",
                      result?.status === "INCORRECT" &&
                        isSelected &&
                        "border-destructive bg-destructive/5",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOption(option.id)}
                      className="accent-primary size-4"
                    />

                    <span className="text-muted-foreground font-semibold">
                      {String.fromCharCode(65 + index)}.
                    </span>

                    <span>
                      <MathContent content={option.text} />
                    </span>

                    {solved && isCorrect && (
                      <CheckCircle2 className="text-success ml-auto size-4" />
                    )}
                  </label>
                );
              })}

              <p className="text-xs text-muted-foreground">
                Dipilih: {selectedOptionIds.length} dari {question.options.length}
              </p>
            </fieldset>
          )}

          {/* BENAR-SALAH */}
          {question.type === "TRUE_FALSE" && (
            <fieldset className="space-y-3" disabled={cooldownActive}>
              <legend className="mb-2 text-sm text-muted-foreground">
                Tentukan apakah setiap pernyataan berikut benar atau salah.
              </legend>

              {question.options.map((option, index) => {
                const correctAnswer = correctTrueFalseAnswers.find(
                  (answer) => answer.optionId === option.id,
                );

                const selectedAnswer = trueFalseAnswers[option.id];

                const isCorrect =
                  solved &&
                  correctAnswer !== undefined &&
                  selectedAnswer === correctAnswer.value;

                return (
                  <div
                    key={option.id}
                    className={cn(
                      "space-y-3 rounded-md border p-3",
                      solved && isCorrect && "border-success bg-success/5",
                      solved &&
                        !isCorrect &&
                        "border-destructive bg-destructive/5",
                    )}
                  >
                    <p className="font-medium">
                      {index + 1}. <MathContent content={option.text} />
                    </p>

                    <div className="flex flex-wrap gap-4">
                      {[true, false].map((value) => (
                        <label
                          key={String(value)}
                          className="flex cursor-pointer items-center gap-2 text-sm"
                        >
                          <input
                            type="radio"
                            name={`true-false-${question.id}-${option.id}`}
                            checked={selectedAnswer === value}
                            onChange={() =>
                              setTrueFalseAnswers((current) => ({
                                ...current,
                                [option.id]: value,
                              }))
                            }
                            className="accent-primary size-4"
                          />

                          {value ? "Benar" : "Salah"}
                        </label>
                      ))}
                    </div>

                    {solved && correctAnswer && (
                      <p className="text-sm font-medium text-success">
                        Jawaban benar: {correctAnswer.value ? "Benar" : "Salah"}
                      </p>
                    )}
                  </div>
                );
              })}
            </fieldset>
          )}

          {/* ISIAN SINGKAT */}
          {question.type === "SHORT_ANSWER" && (
            <div className="space-y-1.5">
              <label
                htmlFor={`answer-${question.id}`}
                className="text-sm font-medium"
              >
                Jawabanmu
              </label>

              <Textarea
                id={`answer-${question.id}`}
                maxLength={2000}
                disabled={pending || cooldownActive}
                {...form.register("answerText")}
              />

              {question.lastReview?.status === "REJECTED" && !result && (
                <Alert variant="warning" title="Jawaban sebelumnya ditolak">
                  {question.lastReview.feedback ??
                    "Silakan coba kirim jawaban baru."}
                </Alert>
              )}

              {pending && !result && (
                <Alert variant="info" title="Menunggu review admin">
                  Jawaban &quot;{question.lastReview?.answerText}&quot; sedang
                  diperiksa. Kamu akan menerima bounty jika disetujui.
                </Alert>
              )}
            </div>
          )}

          {error && <Alert variant="error">{error}</Alert>}

          {result && <ResultBanner result={result} />}

          {cooldownActive && (
            <Alert variant="warning" title="Cooldown aktif">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="size-4" aria-hidden />

                  <span>
                    Kamu bisa mencoba soal ini kembali dalam{" "}
                    <strong
                      className="font-mono tabular-nums"
                      data-testid="question-cooldown"
                    >
                      {cooldownLabel}
                    </strong>.
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleUnlock}
                    disabled={isUnlocking || isSubmitting}
                  >
                    <Unlock className="mr-2 size-4" />

                    {isUnlocking
                      ? "Membuka..."
                      : question.unlockCost === 0
                        ? "Buka gratis"
                        : "Buka dengan SHARD"}
                  </Button>

                  {question.unlockCost > 0 ? (
                    <span className="text-sm">
                      Biaya: <ShardAmount value={question.unlockCost} />
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Tidak dikenakan biaya
                    </span>
                  )}
                </div>
              </div>
            </Alert>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              disabled={isSubmitting || pending || cooldownActive}
            >
              {isSubmitting
                ? "Mengirim..."
                : solved
                  ? "Latihan lagi"
                  : "Kirim jawaban"}
            </Button>

            {solved && (
              <span className="text-muted-foreground text-xs">
                Soal sudah selesai. Latihan ulang tidak memberi bounty lagi.
              </span>
            )}
          </div>

          {(explanation || accepted.length > 0) && (
            <div className="border-primary/20 bg-primary/5 rounded-md border p-3 text-sm">
              {explanation && (
                <>
                  <p className="font-semibold">Pembahasan</p>
                  <p className="whitespace-pre-wrap">
                    <MathContent content={explanation} />
                  </p>
                </>
              )}

              {accepted.length > 0 && (
                <p className="text-muted-foreground mt-2">
                  Jawaban acuan:{" "}
                  <MathContent content={accepted.join(" · ")} />
                </p>
              )}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

function ResultBanner({ result }: { result: AttemptResult }) {
  if (result.status === "PENDING_REVIEW") {
    return (
      <Alert variant="info" title="Jawaban terkirim">
        <span className="inline-flex items-center gap-1">
          <Clock className="size-4" aria-hidden />
          Menunggu review admin.
        </span>
      </Alert>
    );
  }

  if (result.status === "CORRECT" || result.status === "APPROVED") {
    return (
      <Alert
        variant="success"
        title={result.isPractice ? "Benar! (latihan)" : "Benar!"}
      >
        <span className="inline-flex items-center gap-1" data-testid="attempt-result">
          <CheckCircle2 className="size-4" aria-hidden />

          {result.bountyAwarded > 0 ? (
            <>Kamu mendapat +{result.bountyAwarded} koin.</>
          ) : (
            <>Tidak ada bounty tambahan untuk latihan ulang.</>
          )}
        </span>
      </Alert>
    );
  }

  return (
    <Alert variant="error" title="Belum tepat">
      <span className="inline-flex items-center gap-1" data-testid="attempt-result">
        <XCircle className="size-4" aria-hidden />
        Coba lagi. Kamu masih bisa mendapatkan bounty.
      </span>
    </Alert>
  );
}
