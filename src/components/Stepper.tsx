"use client";
import { useRef } from "react";
import { Fig } from "./ui";

/**
 * Circular ± stepper. Weight steps 2.5kg; long-press either button to step the
 * fine increment (1.25kg). Reps step 1 with no fine step. Never a keyboard.
 */
export function Stepper({
  value,
  onChange,
  step,
  fineStep,
  min = 0,
  max = 999,
  unit,
  label,
  size = "lg",
}: {
  value: number;
  onChange: (v: number) => void;
  step: number;
  fineStep?: number;
  min?: number;
  max?: number;
  unit: string;
  label: string;
  size?: "lg" | "md";
}) {
  const longPressed = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clamp(v: number) {
    return Math.min(max, Math.max(min, Math.round(v * 100) / 100));
  }
  function apply(dir: 1 | -1, fine: boolean) {
    const s = fine && fineStep ? fineStep : step;
    onChange(clamp(value + dir * s));
  }
  function onDown(dir: 1 | -1) {
    longPressed.current = false;
    if (fineStep) {
      timer.current = setTimeout(() => {
        longPressed.current = true;
        apply(dir, true);
      }, 450);
    }
  }
  function onUp(dir: 1 | -1) {
    if (timer.current) clearTimeout(timer.current);
    if (!longPressed.current) apply(dir, false);
  }

  const figSize = size === "lg" ? "text-5xl" : "text-3xl";
  const display = Number.isInteger(value) ? value : value.toFixed(2).replace(/0$/, "");

  return (
    <div className="flex items-center justify-between px-1.5 py-2">
      <SBtn
        aria-label={`Decrease ${label}`}
        onPointerDown={() => onDown(-1)}
        onPointerUp={() => onUp(-1)}
        onPointerLeave={() => timer.current && clearTimeout(timer.current)}
      >
        −
      </SBtn>
      <div className="text-center">
        <Fig className={figSize} value={display} unit={unit} />
        <div className="mt-1 text-[9px] font-bold uppercase tracking-widest text-[var(--muted)]">
          {label}
        </div>
      </div>
      <SBtn
        aria-label={`Increase ${label}`}
        onPointerDown={() => onDown(1)}
        onPointerUp={() => onUp(1)}
        onPointerLeave={() => timer.current && clearTimeout(timer.current)}
      >
        +
      </SBtn>
    </div>
  );
}

function SBtn({
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className="fig grid h-[64px] w-[64px] flex-none place-items-center rounded-full text-2xl active:scale-95"
      style={{
        background: "linear-gradient(150deg,#fff,rgba(255,255,255,.6))",
        color: "var(--ink)",
        boxShadow: "0 10px 20px -12px rgba(28,62,96,.7), var(--inner)",
        touchAction: "manipulation",
        transition: "transform .12s ease",
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
