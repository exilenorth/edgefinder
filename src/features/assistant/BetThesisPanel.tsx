import { FileText } from "lucide-react";
import { DataFreshnessChip } from "../../components/DataFreshnessChip";
import { Metric } from "../../components/Metric";
import { Panel } from "../../components/Panel";
import { formatPercent } from "../../model/probability";
import type { BetThesis } from "./thesis";

export function BetThesisPanel({ thesis }: { thesis: BetThesis }) {
  return (
    <Panel title="Bet Thesis" icon={<FileText size={18} />} wide>
      <div className="thesis-summary">
        <div>
          <span className={`verdict-badge ${thesis.status}`}>{formatStatus(thesis.status)}</span>
          <h2>{thesis.selection}</h2>
          <p>{thesis.verdict}</p>
        </div>
        <DataFreshnessChip quality={thesis.dataQuality} />
      </div>

      <div className="thesis-metrics">
        <Metric label="Model probability" value={formatPercent(thesis.modelProbability)} />
        <Metric label="Market probability" value={thesis.marketProbability ? formatPercent(thesis.marketProbability) : "n/a"} />
        <Metric label="Current price" value={thesis.currentPrice ? thesis.currentPrice.toFixed(2) : "n/a"} />
        <Metric label="Fair price" value={thesis.fairPrice.toFixed(2)} />
        <Metric label="Estimated edge" value={thesis.edge > 0 ? `+${formatPercent(thesis.edge)}` : formatPercent(thesis.edge)} />
        <Metric label="Confidence" value={thesis.confidence} />
      </div>
    </Panel>
  );
}

function formatStatus(status: BetThesis["status"]) {
  if (status === "playable") return "Playable";
  if (status === "watch") return "Watch";
  return "No edge";
}
