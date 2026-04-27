export function LogoMark({ src, label, size = "medium" }: { src?: string; label: string; size?: "small" | "medium" | "large" }) {
  return src ? (
    <img className={`logo-mark ${size}`} src={src} alt="" aria-hidden="true" loading="lazy" />
  ) : (
    <span className={`logo-mark fallback ${size}`} aria-hidden="true">
      {getInitials(label)}
    </span>
  );
}

function getInitials(label: string) {
  return label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}
