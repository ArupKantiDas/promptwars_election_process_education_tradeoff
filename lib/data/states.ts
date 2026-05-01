export type Constituency = {
  id: string;
  label: string;
};

export type IndianState = {
  code: string;
  label: string;
  constituencies: readonly Constituency[];
};

// v1 demo locale: only West Bengal / Bhabanipur is wired up. Other states are
// architectural extension points; the corpus and journey content are calibrated
// only for Bhabanipur AC #159 in this iteration.
export const STATES: readonly IndianState[] = [
  {
    code: "WB",
    label: "West Bengal",
    constituencies: [
      { id: "bhabanipur", label: "Bhabanipur (AC #159)" }
    ]
  }
] as const;

export const DEFAULT_STATE_CODE = "WB";
export const DEFAULT_CONSTITUENCY_ID = "bhabanipur";
