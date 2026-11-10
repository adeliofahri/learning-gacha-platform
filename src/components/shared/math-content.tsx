
import katex from "katex";

type MathContentProps = {
  content: string | null | undefined;
  className?: string;
};

type Segment = {
  type: "text" | "math";
  value: string;
  display?: boolean;
};

function parseMath(content: string): Segment[] {
  const segments: Segment[] = [];

  const delimiterPattern =
    /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\$([^\$\n]+?)\$|\\\(([\s\S]+?)\\\)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = delimiterPattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        value: content.slice(lastIndex, match.index),
      });
    }

    const display = match[1] !== undefined || match[2] !== undefined;
    const value = match[1] ?? match[2] ?? match[3] ?? match[4] ?? "";

    segments.push({
      type: "math",
      value,
      display,
    });

    lastIndex = delimiterPattern.lastIndex;
  }

  if (lastIndex < content.length) {
    segments.push({
      type: "text",
      value: content.slice(lastIndex),
    });
  }

  return segments;
}

function renderMath(value: string, display: boolean): string {
  try {
    return katex.renderToString(value, {
      displayMode: display,
      throwOnError: false,
      strict: "warn",
      trust: false,
      output: "htmlAndMathml",
    });
  } catch {
    return value;
  }
}

export function MathContent({
  content,
  className,
}: MathContentProps) {
  const segments = parseMath(content ?? "");

  return (
    <span className={className}>
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          return (
            <span key={index} className="whitespace-pre-wrap">
              {segment.value}
            </span>
          );
        }

        return (
          <span
            key={index}
            className={
              segment.display
                ? "my-2 block overflow-x-auto"
                : "inline-block"
            }
            dangerouslySetInnerHTML={{
              __html: renderMath(segment.value, segment.display ?? false),
            }}
          />
        );
      })}
    </span>
  );
}
