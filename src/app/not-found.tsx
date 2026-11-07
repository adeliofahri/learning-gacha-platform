import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 p-6 text-center"
    >
      <p className="text-primary text-5xl font-black">404</p>
      <h1 className="text-xl font-bold">Halaman tidak ditemukan</h1>
      <p className="text-muted-foreground text-sm">
        Halaman atau data yang kamu cari tidak ada atau tidak dapat diakses.
      </p>
      <Button asChild>
        <Link href="/">Kembali ke beranda</Link>
      </Button>
    </main>
  );
}
