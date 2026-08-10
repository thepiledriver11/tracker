import type { SectionId } from "@/lib/store";

type IconProps = { className?: string };

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

export function HomeIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}

export function CareerIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="7.5" width="18" height="13" rx="2" />
      <path d="M9 7.5V5.5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M3 12.5h18" />
    </svg>
  );
}

export function FitnessIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="2" y="9.5" width="3" height="5" rx="1" />
      <rect x="19" y="9.5" width="3" height="5" rx="1" />
      <rect x="6" y="7.5" width="3" height="9" rx="1" />
      <rect x="15" y="7.5" width="3" height="9" rx="1" />
      <path d="M9 12h6" />
    </svg>
  );
}

export function NutritionIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 8c-4 0-6.5 2.5-6.5 6 0 3.5 2.5 7 4.5 7 1 0 1.3-.5 2-.5s1 .5 2 .5c2 0 4.5-3.5 4.5-7 0-3.5-2.5-6-6.5-6Z" />
      <path d="M12 8c0-2.5 1.5-4 3.5-4.5" />
    </svg>
  );
}

export function FinanceIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M15 8.5c-.6-.8-1.7-1.3-3-1.3-1.8 0-3 1-3 2.3 0 3 6 1.7 6 4.7 0 1.4-1.3 2.3-3 2.3-1.3 0-2.4-.5-3-1.3" />
      <path d="M12 5.5v13" />
    </svg>
  );
}

export function TodoIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="m3.5 6 1.5 1.5L8 4.5" />
      <path d="M11 6.5h9.5" />
      <path d="m3.5 13 1.5 1.5L8 11.5" />
      <path d="M11 13.5h9.5" />
      <rect x="3.5" y="18" width="4" height="4" rx="1" />
      <path d="M11 20.5h9.5" />
    </svg>
  );
}

export function ChevronLeftIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="m14.5 5.5-6.5 6.5 6.5 6.5" />
    </svg>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.8-3.8" />
    </svg>
  );
}

export function GridIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="8" cy="8" r="2.2" />
      <circle cx="16" cy="8" r="2.2" />
      <circle cx="8" cy="16" r="2.2" />
      <circle cx="16" cy="16" r="2.2" />
    </svg>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function XIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

export function SectionIcon({
  section,
  className,
}: {
  section: SectionId;
  className?: string;
}) {
  switch (section) {
    case "career":
      return <CareerIcon className={className} />;
    case "fitness":
      return <FitnessIcon className={className} />;
    case "nutrition":
      return <NutritionIcon className={className} />;
    case "finance":
      return <FinanceIcon className={className} />;
    case "todo":
      return <TodoIcon className={className} />;
  }
}
