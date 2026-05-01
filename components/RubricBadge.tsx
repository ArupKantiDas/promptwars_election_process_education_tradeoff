import type { RubricScore } from "@/lib/types/scoring";

const SQUARE_INDEXES = [1, 2, 3, 4, 5] as const;

function colorForScore(score: RubricScore): string {
  switch (score) {
    case 1:
      return "bg-red-500 border-red-600";
    case 2:
      return "bg-orange-400 border-orange-500";
    case 3:
      return "bg-yellow-400 border-yellow-500";
    case 4:
      return "bg-lime-500 border-lime-600";
    case 5:
      return "bg-emerald-600 border-emerald-700";
  }
}

type Props = {
  score: RubricScore;
  dimensionLabel: string;
  size?: "sm" | "md";
};

// Triple-encodes the score for accessibility:
//   - position: count of filled squares (1–5)
//   - shape:    filled (solid square) vs hollow (outlined square)
//   - color:    red → orange → yellow → lime → emerald gradient
// Color-blind users still see the filled/hollow shape distinction and the
// numeric label. Screen readers get an aria-label with the dimension and score.
export function RubricBadge({ score, dimensionLabel, size = "md" }: Props) {
  const dim = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";
  const labelDim = size === "sm" ? "text-[10px]" : "text-xs";
  const filledClass = colorForScore(score);
  return (
    <span
      role="img"
      aria-label={`${dimensionLabel}: ${score} of 5`}
      className="inline-flex items-center gap-1.5"
    >
      <span aria-hidden="true" className="flex gap-0.5">
        {SQUARE_INDEXES.map((i) => {
          const filled = i <= score;
          return (
            <span
              key={i}
              className={`${dim} rounded-sm border ${
                filled ? filledClass : "border-slate-300 bg-transparent"
              }`}
            />
          );
        })}
      </span>
      <span aria-hidden="true" className={`font-mono ${labelDim} text-slate-700`}>
        {score}/5
      </span>
    </span>
  );
}
