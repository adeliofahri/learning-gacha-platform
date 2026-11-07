import Link from "next/link";
import { Sparkles } from "lucide-react";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-extrabold tracking-tight">
      <span className="from-primary inline-flex size-8 items-center justify-center rounded-lg bg-gradient-to-br to-fuchsia-500 text-white shadow">
        <Sparkles className="size-4" aria-hidden />
      </span>
      <span className="text-lg">
        Learning<span className="text-primary">Gacha</span>
      </span>
    </Link>
  );
}
