
"use client";

import * as React from "react";
import { useState } from "react";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

type Snippet = {
  label: string;
  value: string;
  cursorBack?: number;
};

const snippets: { title: string; items: Snippet[] }[] = [
  {
    title: "Dasar",
    items: [
      { label: "Pecahan", value: "\\frac{}{}", cursorBack: 3 },
      { label: "Akar", value: "\\sqrt{}", cursorBack: 1 },
      { label: "Pangkat", value: "^{}", cursorBack: 1 },
      { label: "Indeks", value: "_{}", cursorBack: 1 },
      { label: "Kurung", value: "\\left(\\right)", cursorBack: 7 },
      { label: "Nilai mutlak", value: "\\left|\\right|", cursorBack: 7 },
    ],
  },
  {
    title: "Aljabar & Kalkulus",
    items: [
      { label: "Jumlah", value: "\\sum_{i=1}^{n}", cursorBack: 0 },
      { label: "Produk", value: "\\prod_{i=1}^{n}", cursorBack: 0 },
      { label: "Integral", value: "\\int_{}^{}", cursorBack: 3 },
      { label: "Limit", value: "\\lim_{x\\to}", cursorBack: 0 },
      { label: "Turunan", value: "\\frac{d}{dx}", cursorBack: 0 },
      { label: "Tak hingga", value: "\\infty", cursorBack: 0 },
    ],
  },
  {
    title: "Simbol Yunani",
    items: [
      { label: "α", value: "\\alpha " },
      { label: "β", value: "\\beta " },
      { label: "θ", value: "\\theta " },
      { label: "π", value: "\\pi " },
      { label: "λ", value: "\\lambda " },
      { label: "μ", value: "\\mu " },
      { label: "σ", value: "\\sigma " },
      { label: "Δ", value: "\\Delta " },
      { label: "Ω", value: "\\Omega " },
    ],
  },
  {
    title: "Sains & Matriks",
    items: [
      { label: "Vektor", value: "\\vec{} ", cursorBack: 2 },
      { label: "Matriks", value: "\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}" },
      { label: "Pangkat 10", value: "10^{}", cursorBack: 1 },
      { label: "Perkalian", value: "\\times " },
      { label: "Derajat", value: "^\\circ " },
      { label: "Subskrip", value: "_{} ", cursorBack: 2 },
      { label: "Peluang", value: "\\mathbb{P} " },
      { label: "Himpunan", value: "\\in " },
    ],
  },
];

type CommonProps = {
  className?: string;
};

function MathToolbar({
  insert,
}: {
  insert: (snippet: Snippet) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        fx {open ? "Tutup toolbar" : "Sisipkan rumus"}
      </Button>

      {open && (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
          <p className="text-xs text-muted-foreground">
            Pilih simbol atau struktur rumus untuk menyisipkannya di posisi kursor.
          </p>

          {snippets.map((group) => (
            <div key={group.title} className="space-y-1.5">
              <p className="text-xs font-semibold">{group.title}</p>
              <div className="flex flex-wrap gap-1.5">
                {group.items.map((snippet) => (
                  <Button
                    key={snippet.label}
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => insert(snippet)}
                    title={snippet.value}
                  >
                    {snippet.label}
                  </Button>
                ))}
              </div>
            </div>
          ))}

          <p className="text-xs text-muted-foreground">
            Rumus inline: $...$ · Rumus terpisah: $$...$$
          </p>
        </div>
      )}
    </div>
  );
}


function insertIntoField<T extends HTMLInputElement | HTMLTextAreaElement>(
  element: T,
  snippet: Snippet,
  onChange: (event: React.ChangeEvent<T>) => void,
) {
  const start = element.selectionStart ?? element.value.length;
  const end = element.selectionEnd ?? start;

  const before = element.value.slice(0, start);
  const after = element.value.slice(end);
  const nextValue = before + snippet.value + after;

  element.value = nextValue;

  onChange({
    target: element,
    currentTarget: element,
    type: "change",
  } as React.ChangeEvent<T>);

  const cursor = start + snippet.value.length - (snippet.cursorBack ?? 0);

  requestAnimationFrame(() => {
    element.focus();
    element.setSelectionRange(cursor, cursor);
  });
}

type MathInputProps = CommonProps &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "className">;

export const MathInput = React.forwardRef<HTMLInputElement, MathInputProps>(
  ({ className, onChange, ...props }, ref) => {
    const internalRef = React.useRef<HTMLInputElement | null>(null);

    const setRef = (element: HTMLInputElement | null) => {
      internalRef.current = element;

      if (typeof ref === "function") ref(element);
      else if (ref) ref.current = element;
    };

    const handleInsert = (snippet: Snippet) => {
      if (internalRef.current && onChange) {
        insertIntoField(internalRef.current, snippet, onChange);
      }
    };

    return (
      <div className="space-y-2">
        <Input
          {...props}
          ref={setRef}
          className={cn(className)}
          onChange={onChange}
        />
        <MathToolbar insert={handleInsert} />
      </div>
    );
  },
);

MathInput.displayName = "MathInput";

type MathTextareaProps = CommonProps &
  Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "className">;

export const MathTextarea = React.forwardRef<
  HTMLTextAreaElement,
  MathTextareaProps
>(({ className, onChange, ...props }, ref) => {
  const internalRef = React.useRef<HTMLTextAreaElement | null>(null);

  const setRef = (element: HTMLTextAreaElement | null) => {
    internalRef.current = element;

    if (typeof ref === "function") ref(element);
    else if (ref) ref.current = element;
  };

  const handleInsert = (snippet: Snippet) => {
    if (internalRef.current && onChange) {
      insertIntoField(internalRef.current, snippet, onChange);
    }
  };

  return (
    <div className="space-y-2">
      <Textarea
        {...props}
        ref={setRef}
        className={cn(className)}
        onChange={onChange}
      />
      <MathToolbar insert={handleInsert} />
    </div>
  );
});

MathTextarea.displayName = "MathTextarea";
