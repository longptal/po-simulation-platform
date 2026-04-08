"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useUiStore, useSelectedDocument } from "@/store/ui-store";

export function DocumentPanel() {
  const { documents, selectedDocumentId, setSelectedDocumentId } = useUiStore();
  const selected = useSelectedDocument();

  return (
    <div className="flex w-80 shrink-0 flex-col border-r border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Documents
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {documents.length === 0 && (
          <div className="p-4 text-sm text-zinc-400">
            No documents yet. BA specs will appear here.
          </div>
        )}

        <ul className="divide-y divide-zinc-200">
          {documents.map((doc) => (
            <li key={doc.id}>
              <button
                onClick={() => setSelectedDocumentId(doc.id)}
                className={`w-full px-4 py-3 text-left transition-colors ${
                  doc.id === selectedDocumentId
                    ? "bg-zinc-100 text-zinc-900"
                    : "text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                <div className="text-sm font-medium">{doc.title}</div>
                <div className="text-xs text-zinc-400">{doc.type}</div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {selected && (
        <div className="border-t border-zinc-200 p-4 overflow-y-auto scrollbar-thin" style={{ maxHeight: "40%" }}>
          <h3 className="mb-2 text-sm font-semibold text-zinc-900">{selected.title}</h3>
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{selected.content}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
