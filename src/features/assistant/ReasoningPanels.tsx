import { AlertTriangle, CheckCircle2, Scale } from "lucide-react";
import { Panel } from "../../components/Panel";
import type { BetThesis } from "./thesis";

export function ReasonsPanel({ thesis }: { thesis: BetThesis }) {
  return (
    <Panel title="Why This Edge?" icon={<CheckCircle2 size={18} />}>
      <ReasonList items={thesis.reasons} />
    </Panel>
  );
}

export function RiskFlagsPanel({ thesis }: { thesis: BetThesis }) {
  return (
    <Panel title="What Could Kill This Edge?" icon={<AlertTriangle size={18} />}>
      <ReasonList items={thesis.risks} />
    </Panel>
  );
}

export function CounterargumentPanel({ thesis }: { thesis: BetThesis }) {
  return (
    <Panel title="Best Argument Against This Bet" icon={<Scale size={18} />}>
      <ReasonList items={thesis.counterArguments} />
    </Panel>
  );
}

function ReasonList({ items }: { items: string[] }) {
  return (
    <ul className="reason-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
