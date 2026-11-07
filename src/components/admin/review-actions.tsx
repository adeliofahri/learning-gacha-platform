"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { apiFetch, errorMessage } from "@/lib/api-client";

/**
 * Membungkus satu item review. Setelah server mengonfirmasi keputusan, item langsung disembunyikan
 * (tidak bergantung pada router.refresh yang bisa tertimpa prefetch lama).
 */
export function ReviewItem({
  attemptId,
  children,
}: {
  attemptId: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [decided, setDecided] = useState(false);
  const [pending, setPending] = useState(false);
  const form = useForm<{ feedback: string }>({ defaultValues: { feedback: "" } });

  if (decided) return null;

  const decide = (decision: "APPROVE" | "REJECT") =>
    form.handleSubmit(async ({ feedback }) => {
      setPending(true);
      setError(null);
      try {
        await apiFetch(`/api/admin/reviews/${attemptId}`, {
          body: { decision, feedback: feedback || null },
        });
        setDecided(true);
        router.refresh();
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setPending(false);
      }
    })();

  return (
    <div data-testid="review-item">
      {children}
      <div className="space-y-2 px-5 pb-5">
        <label className="text-sm font-medium" htmlFor={`fb-${attemptId}`}>
          Feedback (opsional)
        </label>
        <Textarea id={`fb-${attemptId}`} rows={2} maxLength={1000} {...form.register("feedback")} />
        {error && <Alert variant="error">{error}</Alert>}
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={() => decide("APPROVE")}
            disabled={pending}
            data-testid="approve"
          >
            <Check /> Approve
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => decide("REJECT")}
            disabled={pending}
          >
            <X /> Reject
          </Button>
        </div>
      </div>
    </div>
  );
}
