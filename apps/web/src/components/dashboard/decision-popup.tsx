"use client";

import { type DecisionPrompt } from "@/store/ui-store";

interface DecisionPopupProps {
  decision: DecisionPrompt;
  onSubmit: (optionId: string) => void;
}

export function DecisionPopup({ decision, onSubmit }: DecisionPopupProps) {
  return (
    <div className="border-t border-zinc-200 bg-white/95 p-4 backdrop-blur">
      <h3 className="mb-1 text-sm font-semibold text-orange-600">Decision Required</h3>
      <p className="mb-1 text-sm text-zinc-900">{decision.title}</p>
      {decision.description && (
        <p className="mb-3 text-xs text-zinc-500">{decision.description}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {decision.options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onSubmit(opt.id)}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500"
            title={opt.description}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
