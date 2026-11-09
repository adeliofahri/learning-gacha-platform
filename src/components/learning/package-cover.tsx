import {
  Atom,
  BookOpen,
  Calculator,
  Code2,
  Dna,
  FlaskConical,
  Globe,
  Landmark,
} from "lucide-react";

const SUBJECT_STYLES = [
  {
    keywords: ["matematika", "math"],
    icon: Calculator,
    background: "from-blue-600 via-indigo-600 to-violet-700",
    decoration: "MATH",
  },
  {
    keywords: ["fisika", "physics"],
    icon: Atom,
    background: "from-cyan-600 via-blue-700 to-indigo-800",
    decoration: "PHYSICS",
  },
  {
    keywords: ["kimia", "chemistry"],
    icon: FlaskConical,
    background: "from-emerald-600 via-teal-700 to-cyan-800",
    decoration: "CHEMISTRY",
  },
  {
    keywords: ["informatika", "komputer", "programming"],
    icon: Code2,
    background: "from-slate-700 via-blue-800 to-indigo-950",
    decoration: "CODING",
  },
  {
    keywords: ["biologi", "biology"],
    icon: Dna,
    background: "from-green-600 via-emerald-700 to-teal-900",
    decoration: "BIOLOGY",
  },
  {
    keywords: ["sejarah", "history"],
    icon: Landmark,
    background: "from-amber-600 via-orange-700 to-red-900",
    decoration: "HISTORY",
  },
  {
    keywords: ["geografi", "geography"],
    icon: Globe,
    background: "from-sky-600 via-cyan-700 to-blue-900",
    decoration: "GEOGRAPHY",
  },
];

export function PackageCover({
  imageUrl,
  subject,
  title,
  className = "",
}: {
  imageUrl?: string | null;
  subject?: string | null;
  title?: string;
  className?: string;
}) {
  const normalized = subject?.toLowerCase() ?? "";

  const style =
    SUBJECT_STYLES.find((item) =>
      item.keywords.some((keyword) => normalized.includes(keyword)),
    ) ?? {
      icon: BookOpen,
      background: "from-violet-600 via-purple-700 to-indigo-900",
      decoration: "LEARNING",
    };

  const Icon = style.icon;

  return (
    <div
      className={`relative isolate aspect-video overflow-hidden bg-gradient-to-br ${style.background} ${className}`}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={title ? `Cover ${title}` : "Cover paket"}
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <>
          <div className="absolute -right-10 -top-16 size-64 rounded-full border border-white/15" />
          <div className="absolute -right-2 -top-8 size-44 rounded-full border border-white/15" />
          <div className="absolute -bottom-20 -left-10 size-56 rounded-full bg-white/10 blur-2xl" />

          <div className="absolute inset-0 flex items-center justify-between px-7">
            <div className="space-y-2">
              <p className="text-xs font-bold tracking-[0.3em] text-white/60">
                {style.decoration}
              </p>
              <p className="max-w-48 text-xl font-black text-white">
                {title ?? subject ?? "Learning"}
              </p>
            </div>

            <Icon className="size-20 text-white/85" strokeWidth={1.3} />
          </div>
        </>
      )}
    </div>
  );
}