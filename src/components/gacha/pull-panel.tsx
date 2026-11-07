"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert } from "@/components/ui/misc";
import { CoinAmount, ShardAmount } from "@/components/shared/currency";
import { CharacterTile } from "@/components/shared/rarity";
import { apiFetch, errorMessage, newIdempotencyKey } from "@/lib/api-client";
import { PULL_TYPE_LABEL } from "@/lib/constants";
import { emitWalletUpdate } from "@/lib/wallet-events";
import { cn } from "@/lib/utils/cn";

type PullType = "SINGLE" | "TEN_PULL" | "STEP_UP";
type Stage = { stage: number; price: number; pullCount: number };
type PullResponse = {
  price: number;
  stepNumber: number | null;
  coins: number;
  shards: number;
  results: {
    id: string;
    rarity: number;
    isNew: boolean;
    isGuaranteed: boolean;
    isFeatured: boolean;
    shardsAwarded: number;
    character: { id: string; name: string; rarity: number; imageUrl: string };
  }[];
};

export function PullPanel(props: {
  bannerId: string;
  active: boolean;
  coins: number;
  singlePrice: number;
  tenPullPrice: number;
  stepUp: {
    currentStage: number;
    cyclesCompleted: number;
    stages: Stage[];
    guaranteeFeatured: boolean;
  } | null;
}) {
  const router = useRouter();
  const [confirm, setConfirm] = useState<{ type: PullType; price: number; count: number } | null>(
    null,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PullResponse | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");
  // Saldo & tahap step-up lokal diperbarui dari respons server (tidak menunggu router.refresh).
  const [coins, setCoins] = useState(props.coins);
  const [stage, setStage] = useState(props.stepUp?.currentStage ?? 1);
  const [cycles, setCycles] = useState(props.stepUp?.cyclesCompleted ?? 0);
  const currentStage = props.stepUp?.stages.find((s) => s.stage === stage);

  const ask = (type: PullType, price: number, count: number) => {
    setError(null);
    setIdempotencyKey(newIdempotencyKey()); // satu key per konfirmasi → retry jaringan aman
    setConfirm({ type, price, count });
  };

  const doPull = async () => {
    if (!confirm) return;
    setPending(true);
    setError(null);
    try {
      const r = await apiFetch<PullResponse>(`/api/gacha/${props.bannerId}/pull`, {
        body: { type: confirm.type },
        idempotencyKey,
      });
      setResult(r);
      setCoins(r.coins);
      if (r.stepNumber) {
        setStage(r.stepNumber >= 5 ? 1 : r.stepNumber + 1);
        if (r.stepNumber >= 5) setCycles((c) => c + 1);
      }
      emitWalletUpdate({ coins: r.coins, shards: r.shards });
      setConfirm(null);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  };

  const options: { type: PullType; label: string; price: number; count: number; note?: string }[] =
    [
      { type: "SINGLE", label: "Single pull", price: props.singlePrice, count: 1 },
      {
        type: "TEN_PULL",
        label: "10× pull",
        price: props.tenPullPrice,
        count: 10,
        note: "Harga 9× single",
      },
    ];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="text-primary size-5" aria-hidden /> Pull
          </CardTitle>
          <p className="text-sm">
            Saldo kamu: <CoinAmount value={coins} />
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {options.map((o) => (
            <Button
              key={o.type}
              className="h-auto w-full justify-between py-3"
              variant={o.type === "TEN_PULL" ? "accent" : "default"}
              disabled={!props.active || coins < o.price}
              onClick={() => ask(o.type, o.price, o.count)}
              data-testid={`pull-${o.type}`}
            >
              <span className="text-left">
                {o.label}
                {o.note && <span className="block text-xs font-normal opacity-80">{o.note}</span>}
              </span>
              <CoinAmount value={o.price} />
            </Button>
          ))}

          {props.stepUp && (
            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold">Step-Up</p>
                <span className="text-muted-foreground text-xs">Siklus selesai: {cycles}</span>
              </div>
              <ol className="grid grid-cols-5 gap-1" aria-label="Tahap step-up">
                {props.stepUp.stages.map((s) => (
                  <li
                    key={s.stage}
                    aria-current={s.stage === stage ? "step" : undefined}
                    className={cn(
                      "rounded-md border p-1.5 text-center text-xs",
                      s.stage < stage && "bg-muted text-muted-foreground line-through",
                      s.stage === stage && "border-primary bg-primary/10 text-primary font-bold",
                    )}
                  >
                    <span className="block">Tahap {s.stage}</span>
                    <span className="block tabular-nums">{s.price}</span>
                  </li>
                ))}
              </ol>
              <p className="text-muted-foreground text-xs">
                Tahap 5 menjamin minimal satu karakter 6★
                {props.stepUp.guaranteeFeatured ? " featured" : " (tidak otomatis featured)"}.
                Setelah tahap 5, kembali ke tahap 1.
              </p>
              {currentStage && (
                <Button
                  className="w-full justify-between"
                  variant="secondary"
                  disabled={!props.active || coins < currentStage.price}
                  onClick={() => ask("STEP_UP", currentStage.price, currentStage.pullCount)}
                  data-testid="pull-STEP_UP"
                >
                  <span>Step-Up tahap {currentStage.stage}</span>
                  <CoinAmount value={currentStage.price} />
                </Button>
              )}
            </div>
          )}
          {!props.active && (
            <p className="text-muted-foreground text-sm">Pull tidak tersedia untuk banner ini.</p>
          )}
          {error && !confirm && <Alert variant="error">{error}</Alert>}
        </CardContent>
      </Card>

      <Dialog open={!!confirm} onOpenChange={(o) => !o && !pending && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi pull</DialogTitle>
            <DialogDescription>
              {confirm && (
                <>
                  {PULL_TYPE_LABEL[confirm.type]}
                  {confirm.type === "STEP_UP" && ` tahap ${stage}`} — {confirm.count} hasil.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {confirm && (
            <div className="bg-muted space-y-2 rounded-md p-3 text-sm">
              <p className="flex justify-between">
                Biaya <CoinAmount value={confirm.price} />
              </p>
              <p className="flex justify-between">
                Saldo setelah pull <CoinAmount value={coins - confirm.price} />
              </p>
            </div>
          )}
          {error && (
            <Alert variant="error" className="mt-3">
              {error}
            </Alert>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)} disabled={pending}>
              Batal
            </Button>
            <Button onClick={doPull} disabled={pending} data-testid="confirm-pull">
              {pending ? "Memproses…" : "Ya, gunakan koin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!result} onOpenChange={(o) => !o && setResult(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Hasil pull{result?.stepNumber ? ` — Step-Up tahap ${result.stepNumber}` : ""}
            </DialogTitle>
            <DialogDescription>
              {result && (
                <>
                  Koin terpakai {result.price}. Saldo sekarang: {result.coins} koin, {result.shards}{" "}
                  shard.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5"
            data-testid="pull-results"
          >
            {result?.results.map((r, i) => (
              <div key={r.id} className="animate-pop-in" style={{ animationDelay: `${i * 60}ms` }}>
                <CharacterTile
                  character={r.character}
                  className={cn(r.rarity >= 6 && "ring-2 ring-rose-400")}
                  footer={
                    <div className="flex flex-wrap justify-center gap-1">
                      {r.isNew ? (
                        <Badge variant="success">Baru!</Badge>
                      ) : (
                        <ShardAmount value={r.shardsAwarded} className="text-xs" />
                      )}
                      {r.isFeatured && <Badge variant="warning">Featured</Badge>}
                      {r.isGuaranteed && <Badge>Jaminan 6★</Badge>}
                    </div>
                  }
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setResult(null)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
