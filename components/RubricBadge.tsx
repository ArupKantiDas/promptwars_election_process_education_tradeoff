import type { RubricScore } from "@/lib/types/scoring";

const SQUARE_INDEXES = [1, 2, 3, 4, 5] as const;

type Tone = {
  fill: string;
  ring: string;
  text: string;
  hollowRing: string;
  pillBg: string;
  pillText: string;
};

function toneForScore(score: RubricScore): Tone {
  switch (score) {
    case 1:
      return {
        fill: "bg-rose-500",
        ring: "ring-rose-300/60",
        text: "text-rose-700",
        hollowRing: "ring-rose-200",
        pillBg: "bg-rose-50",
        pillText: "text-rose-700"
      };
    case 2:
      return {
        fill: "bg-orange-500",
        ring: "ring-orange-300/60",
        text: "text-orange-700",
        hollowRing: "ring-orange-200",
        pillBg: "bg-orange-50",
        pillText: "text-orange-700"
      };
    case 3:
      return {
        fill: "bg-amber-500",
        ring: "ring-amber-300/60",
        text: "text-amber-700",
        hollowRing: "ring-amber-200",
        pillBg: "bg-amber-50",
        pillText: "text-amber-700"
      };
    case 4:
      return {
        fill: "bg-lime-600",
        ring: "ring-lime-300/60",
        text: "text-lime-700",
        hollowRing: "ring-lime-200",
        pillBg: "bg-lime-50",
        pillText: "text-lime-700"
      };
    case 5:
      return {
        fill: "bg-emerald-600",
        ring: "ring-emerald-300/60",
        text: "text-emerald-700",
        hollowRing: "ring-emerald-200",
        pillBg: "bg-emerald-50",
        pillText: "text-emerald-700"
      };
  }
}

type Props = {
  score: RubricScore;
  dimensionLabel: string;
  size?: "sm" | "md";
};

// Triple-encoded score for accessibility:
//   - position: filled-square count (1–5)
//   - shape:    filled vs ringed (hollow) square
//   - colour:   rose → orange → amber → lime → emerald scale
// Plus a tinted pill carrying the numeric "n/5" so the score is readable
// even with squares hidden by user-stylesheet overrides. The pill colour
// matches the tone for at-a-glance scanning.
export function RubricBadge({ score, dimensionLabel, size = "md" }: Props) {
  const dim = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";
  const labelDim = size === "sm" ? "text-[10px]" : "text-[11px]";
  const tone = toneForScore(score);
  return (
    <span
      role="img"
      aria-label={`${dimensionLabel}: ${score} of 5`}
      className="inline-flex items-center gap-1.5"
    >
      <span aria-hidden="true" className="flex gap-[3px]">
        {SQUARE_INDEXES.map((i) => {
          const filled = i <= score;
          return (
            <span
              key={i}
              className={`${dim} rounded-[3px] ring-1 ${
                filled
                  ? `${tone.fill} ${tone.ring} shadow-[inset_0_-1px_0_0_rgb(0_0_0/0.06)]`
                  : `bg-transparent ${tone.hollowRing}`
              }`}
            />
          );
        })}
      </span>
      <span
        aria-hidden="true"
        className={`inline-flex items-center rounded-full px-1.5 font-mono font-semibold tabular-nums ${labelDim} ${tone.pillBg} ${tone.pillText}`}
      >
        {score}/5
      </span>
    </span>
  );
}
