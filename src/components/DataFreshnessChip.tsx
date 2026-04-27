import { Database, Radio, Wand2 } from "lucide-react";

export type DataQuality = "live" | "cached" | "estimated" | "partial" | "unavailable";

const DATA_QUALITY_LABELS: Record<DataQuality, string> = {
  live: "Live data",
  cached: "Loaded from cache",
  estimated: "Estimated inputs",
  partial: "Partial live data",
  unavailable: "Data unavailable"
};

export function DataFreshnessChip({ quality }: { quality: DataQuality }) {
  const Icon = quality === "live" ? Radio : quality === "cached" ? Database : Wand2;

  return (
    <span className={`data-chip ${quality}`}>
      <Icon size={14} aria-hidden="true" />
      {DATA_QUALITY_LABELS[quality]}
    </span>
  );
}
