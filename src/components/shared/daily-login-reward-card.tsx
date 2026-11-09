"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CoinAmount } from "@/components/shared/currency";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";

export function DailyLoginRewardCard({
  amount,
  claimedAt,
}: {
  amount: number;
  claimedAt: Date | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const claimed = Boolean(claimedAt);

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={claimed ? "success" : "default"}>
            {claimed ? "Sudah diklaim hari ini" : "Reward harian"}
          </Badge>
          <Badge variant="outline">Setiap hari</Badge>
        </div>

        <CardTitle>Daily Login Reward</CardTitle>
        <CardDescription>
          Login setiap hari dan klaim hadiah koinmu secara manual.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Hadiah hari ini</p>
          <div className="mt-1 text-xl font-semibold">
            <CoinAmount value={amount} />
          </div>

          {claimedAt && (
            <p className="mt-1 text-xs text-muted-foreground">
              Diklaim pada {formatDateTime(claimedAt)}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-1">
          <Button
            disabled={claimed || pending}
            onClick={async () => {
              setPending(true);
              setError(null);

              try {
                await apiFetch("/api/events/daily-login/claim", {
                  body: {},
                });

                router.refresh();
              } catch (e) {
                setError(errorMessage(e));
              } finally {
                setPending(false);
              }
            }}
          >
            {claimed
              ? "Sudah Diklaim"
              : pending
                ? "Mengklaim…"
                : "Klaim 100 Coin"}
          </Button>

          {error && (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}