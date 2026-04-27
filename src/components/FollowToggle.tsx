import { Star } from "lucide-react";

export function FollowToggle({
  label,
  eyebrow,
  active,
  onClick
}: {
  label: string;
  eyebrow: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`follow-toggle ${active ? "is-active" : ""}`} type="button" onClick={onClick}>
      <Star size={18} fill={active ? "currentColor" : "none"} aria-hidden="true" />
      <span>{eyebrow}</span>
      <strong>{label}</strong>
    </button>
  );
}
