"use client";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 p-6 text-center"
    >
      <h1 className="text-xl font-bold">Terjadi kesalahan</h1>
      <p className="text-muted-foreground text-sm">
        Maaf, halaman ini gagal dimuat. Silakan coba lagi.
      </p>
      <Button onClick={reset}>Coba lagi</Button>
    </main>
  );
}
