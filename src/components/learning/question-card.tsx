"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { CoinAmount } from "@/components/shared/currency";
import { apiFetch, errorMessage, newIdempotencyKey } from "@/lib/api-client";
import { emitWalletUpdate } from "@/lib/wallet-events";
import { DIFFICULTY_LABEL, QUESTION_PROGRESS_LABEL, QUESTION_TYPE_LABEL } from "@/lib/constants";
import type { StudentQuestionView } from "@/server/services/learning.service";
import { cn } from "@/lib/utils/cn";

type AttemptResult = {
  status: "CORRECT" | "INCORRECT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  isPractice: boolean;
  bountyAwarded: number;
  correctOptionId: string | null;
  explanation: string | null;
  acceptedAnswers: string[];
  coins: number;
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
  const form = useForm<{ optionId: string; answerText: string }>({
    defaultValues: { optionId: "", answerText: "" },
  });
  const { isSubmitting } = form.formState;
  // Status efektif: hasil yang baru dikonfirmasi server diutamakan atas props (yang di-refresh belakangan).
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
  const correctOptionId = result?.correctOptionId ?? question.correctOptionId;
  const explanation = result?.explanation ?? question.explanation;
  const accepted = result?.acceptedAnswers.length
    ? result.acceptedAnswers
    : question.acceptedAnswers;
  const selected = form.watch("optionId");

  return (
    <Card data-testid={`question-${question.order}`}>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-sm font-bold">Soal {question.order}</span>
          <Badge variant={STATUS_VARIANT[status]} data-testid="question-status">
            {QUESTION_PROGRESS_LABEL[status]}
          </Badge>
          <Badge variant="secondary">{QUESTION_TYPE_LABEL[question.type]}</Badge>
          <Badge variant="secondary">{DIFFICULTY_LABEL[question.difficulty]}</Badge>
          <span className="ml-auto text-sm">
            Bounty <CoinAmount value={question.bounty} />
          </span>
        </div>
        
        <h2 className="text-lg font-bold">{question.title}</h2>

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

        {/* Konten dirender sebagai teks (React meng-escape HTML) → aman dari XSS */}
        <p className="whitespace-pre-wrap">{question.content}</p>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            setError(null);
            if (question.type === "MULTIPLE_CHOICE" && !values.optionId)
              return setError("Pilih salah satu jawaban.");
            if (question.type === "SHORT_ANSWER" && !values.answerText.trim())
              return setError("Tulis jawabanmu terlebih dahulu.");
            try {
              const body =
                question.type === "MULTIPLE_CHOICE"
                  ? { packageId, optionId: values.optionId }
                  : { packageId, answerText: values.answerText.trim() };
              const r = await apiFetch<AttemptResult>(`/api/questions/${question.id}/attempts`, {
                body,
                idempotencyKey: newIdempotencyKey(),
              });
              setResult(r);
              emitWalletUpdate({ coins: r.coins });
              router.refresh();
            } catch (e) {
              setError(errorMessage(e));
            }
          })}
        >
          {question.type === "MULTIPLE_CHOICE" ? (
            <fieldset className="space-y-2">
              <legend className="sr-only">Pilihan jawaban</legend>
              {question.options.map((o, i) => (
                <label
                  key={o.id}
                  className={cn(
                    "hover:bg-muted/60 has-[:checked]:border-primary has-[:checked]:bg-primary/5 flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors",
                    correctOptionId === o.id && "border-success bg-success/10",
                    result?.status === "INCORRECT" &&
                      selected === o.id &&
                      "border-destructive bg-destructive/5",
                  )}
                >
                  <input
                    type="radio"
                    value={o.id}
                    className="accent-primary size-4"
                    {...form.register("optionId")}
                  />
                  <span className="text-muted-foreground font-semibold">
                    {String.fromCharCode(65 + i)}.
                  </span>
                  <span>{o.text}</span>
                </label>
              ))}
            </fieldset>
          ) : (
            <div className="space-y-1.5">
              <label htmlFor={`answer-${question.id}`} className="text-sm font-medium">
                Jawabanmu
              </label>
              <Textarea
                id={`answer-${question.id}`}
                maxLength={2000}
                disabled={pending}
                {...form.register("answerText")}
              />
              {question.lastReview?.status === "REJECTED" && !result && (
                <Alert variant="warning" title="Jawaban sebelumnya ditolak">
                  {question.lastReview.feedback ?? "Silakan coba kirim jawaban baru."}
                </Alert>
              )}
              {pending && !result && (
                <Alert variant="info" title="Menunggu review admin">
                  Jawaban &quot;{question.lastReview?.answerText}&quot; sedang diperiksa. Kamu akan
                  menerima bounty jika disetujui.
                </Alert>
              )}
            </div>
          )}

          {error && <Alert variant="error">{error}</Alert>}
          {result && <ResultBanner result={result} />}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={isSubmitting || pending}>
              {isSubmitting ? "Mengirim…" : solved ? "Latihan lagi" : "Kirim jawaban"}
            </Button>
            {solved && (
              <span className="text-muted-foreground text-xs">
                Soal sudah selesai — latihan ulang tidak memberi bounty lagi.
              </span>
            )}
          </div>

          {(explanation || accepted.length > 0) && (
            <div className="border-primary/20 bg-primary/5 rounded-md border p-3 text-sm">
              {explanation && (
                <>
                  <p className="font-semibold">Pembahasan</p>
                  <p className="whitespace-pre-wrap">{explanation}</p>
                </>
              )}
              {accepted.length > 0 && (
                <p className="text-muted-foreground mt-2">Jawaban acuan: {accepted.join(" · ")}</p>
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
          <Clock className="size-4" aria-hidden /> Menunggu review admin.
        </span>
      </Alert>
    );
  }
  if (result.status === "CORRECT" || result.status === "APPROVED") {
    return (
      <Alert variant="success" title={result.isPractice ? "Benar! (latihan)" : "Benar!"}>
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
        <XCircle className="size-4" aria-hidden /> Coba lagi — kamu masih bisa mendapatkan bounty.
      </span>
    </Alert>
  );
}
