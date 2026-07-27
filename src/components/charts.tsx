"use client";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
  ComposedChart,
} from "recharts";

const AXIS = { fontSize: 9, fill: "#93A9BF", fontWeight: 700 } as const;
const GRID = "rgba(147,169,191,.16)";

function Frame({ children, h = 150 }: { children: React.ReactElement; h?: number }) {
  return (
    <div style={{ width: "100%", height: h }}>
      <ResponsiveContainer>{children}</ResponsiveContainer>
    </div>
  );
}

export function ExerciseProgressChart({
  data,
}: {
  data: { date: string; r1Weight: number | null; e1rm: number }[];
}) {
  return (
    <Frame h={170}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tick={AXIS} tickFormatter={(d) => d.slice(5)} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={34} />
        <Tooltip contentStyle={tooltip} />
        <Line type="monotone" dataKey="e1rm" name="e1RM" stroke="#93A9BF" strokeDasharray="4 3" strokeWidth={1.6} dot={false} />
        <Line type="monotone" dataKey="r1Weight" name="R1 kg" stroke="#17BA84" strokeWidth={2.4} dot={{ r: 2.6, fill: "#fff", stroke: "#17BA84", strokeWidth: 2 }} />
      </ComposedChart>
    </Frame>
  );
}

export function TonnageChart({
  data,
}: {
  data: { week: number; heavy: number; volume: number }[];
}) {
  return (
    <Frame>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="week" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={40} />
        <Tooltip contentStyle={tooltip} />
        <Bar dataKey="heavy" stackId="a" fill="#17BA84" radius={[0, 0, 0, 0]} />
        <Bar dataKey="volume" stackId="a" fill="#8FD8F0" radius={[4, 4, 0, 0]} />
      </BarChart>
    </Frame>
  );
}

export function E1rmIndexChart({
  data,
}: {
  data: { week: number; index: number | null }[];
}) {
  return (
    <Frame>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="week" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={34} domain={["dataMin - 5", "dataMax + 5"]} />
        <Tooltip contentStyle={tooltip} />
        <ReferenceLine y={100} stroke="#93A9BF" strokeDasharray="3 3" />
        <Line type="monotone" dataKey="index" stroke="#17BA84" strokeWidth={2.4} connectNulls dot={{ r: 2.4, fill: "#fff", stroke: "#17BA84", strokeWidth: 2 }} />
      </LineChart>
    </Frame>
  );
}

export function BwCalsChart({
  data,
}: {
  data: { iso: string; bw: number | null; cals: number | null }[];
}) {
  return (
    <Frame h={200}>
      <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -20 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="iso" tick={AXIS} tickFormatter={(d) => d.slice(5)} axisLine={false} tickLine={false} />
        <YAxis yAxisId="bw" tick={AXIS} axisLine={false} tickLine={false} width={34} domain={["dataMin - 1", "dataMax + 1"]} />
        <YAxis yAxisId="cal" orientation="right" tick={AXIS} axisLine={false} tickLine={false} width={38} />
        <Tooltip contentStyle={tooltip} />
        <Bar yAxisId="cal" dataKey="cals" name="kcal" fill="#8FD8F0" opacity={0.5} radius={[3, 3, 0, 0]} />
        <Line yAxisId="bw" type="monotone" dataKey="bw" name="kg" stroke="#17BA84" strokeWidth={2.6} connectNulls dot={false} />
      </ComposedChart>
    </Frame>
  );
}

export function WalkChart({
  data,
  target,
}: {
  data: { week: number; minutes: number }[];
  target: number;
}) {
  return (
    <Frame>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="week" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={34} />
        <Tooltip contentStyle={tooltip} />
        <ReferenceLine y={target} stroke="#FFB067" strokeDasharray="4 3" />
        <Bar dataKey="minutes" fill="#43DFA2" radius={[4, 4, 0, 0]} />
      </BarChart>
    </Frame>
  );
}

export function WeeklyCaloriesChart({
  data,
  target,
}: {
  data: { day: string; calories: number }[];
  target: number;
}) {
  return (
    <Frame>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="day" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={40} />
        <Tooltip contentStyle={tooltip} />
        {target > 0 && <ReferenceLine y={target} stroke="#FFB067" strokeDasharray="4 3" />}
        <Bar dataKey="calories" fill="#43DFA2" radius={[4, 4, 0, 0]} />
      </BarChart>
    </Frame>
  );
}

export function TrendLine({
  data,
  dataKey,
}: {
  data: Record<string, number | string | null>[];
  dataKey: string;
}) {
  return (
    <Frame h={110}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
        <XAxis dataKey="iso" tick={AXIS} tickFormatter={(d: string) => d.slice(5)} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={32} domain={["dataMin - 1", "dataMax + 1"]} />
        <Tooltip contentStyle={tooltip} />
        <Line type="monotone" dataKey={dataKey} stroke="#17BA84" strokeWidth={2.4} connectNulls dot={false} />
      </LineChart>
    </Frame>
  );
}

const tooltip: React.CSSProperties = {
  borderRadius: 12,
  border: "none",
  boxShadow: "0 10px 24px -12px rgba(28,62,96,.5)",
  fontSize: 11,
  fontWeight: 600,
};
