import Link from "next/link";
import type { StudyZone } from "@/lib/daily-study/types";

type LearningZoneTabsProps = Readonly<{
  zone: StudyZone;
  reviewHref: string;
  newLearningHref: string;
  label: string;
}>;

const learningZones = [
  { value: "review", label: "Review" },
  { value: "new", label: "New Learning" },
] as const;

export function LearningZoneTabs({
  zone,
  reviewHref,
  newLearningHref,
  label,
}: LearningZoneTabsProps) {
  return (
    <nav
      aria-label={label}
      className="grid grid-cols-2 rounded-md border border-[var(--mimi-border)] bg-[var(--mimi-surface-muted)] p-1"
    >
      {learningZones.map((item) => {
        const active = zone === item.value;
        const href = item.value === "review" ? reviewHref : newLearningHref;

        return (
          <Link
            key={item.value}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`mimi-focus-ring flex min-h-11 items-center justify-center rounded px-3 text-sm font-semibold transition-colors ${
              active
                ? "bg-[var(--mimi-surface-strong)] text-[var(--mimi-primary-deep)] shadow-sm"
                : "text-[var(--mimi-text-soft)] hover:text-[var(--mimi-primary-deep)]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
