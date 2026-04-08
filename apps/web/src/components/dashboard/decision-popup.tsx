"use client";

import { type DecisionPrompt } from "@/store/ui-store";

interface DecisionPopupProps {
  decision: DecisionPrompt;
  onSubmit: (optionId: string) => void;
}

export function DecisionPopup({ decision, onSubmit }: DecisionPopupProps) {
  return (
    <div className="border-t border-gray-800 bg-gray-900/95 p-4 backdrop-blur">
      <h3 className="mb-1 text-sm font-semibold text-amber-400">Decision Required</h3>
      <p className="mb-1 text-sm text-gray-200">{decision.title}</p>
      {decision.description && (
        <p className="mb-3 text-xs text-gray-400">{decision.description}</p>
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
