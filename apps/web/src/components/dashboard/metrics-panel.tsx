"use client";

import { useUiStore } from "@/store/ui-store";

function trendIcon(trend: string): string {
  switch (trend) {
    case "up":
      return "↑";
    case "down":
      return "↓";
    default:
      return "→";
  }
}

function trendColor(trend: string): string {
  switch (trend) {
    case "up":
      return "text-green-600";
    case "down":
      return "text-red-600";
    default:
      return "text-zinc-400";
  }
}

export function MetricsPanel() {
  const { metrics } = useUiStore();

  return (
    <div className="flex w-72 shrink-0 flex-col border-l border-gray-800 bg-gray-900">
      <div className="border-b border-gray-800 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          Metrics
        </h2>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4 scrollbar-thin">
        {metrics.map((m) => {
          const pct = Math.round((m.value / m.max) * 100);
          return (
            <div key={m.category}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm text-gray-300">{m.label}</span>
                <span className={`text-xs font-mono ${trendColor(m.trend)}`}>
                  {trendIcon(m.trend)} {m.value}/{m.max}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-800">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
