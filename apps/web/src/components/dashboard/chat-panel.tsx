"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useUiStore } from "@/store/ui-store";
import { useSessionSync } from "@/hooks/use-session-sync";
import { useDemoData } from "@/hooks/use-demo-data";
import { DecisionPopup } from "./decision-popup";
import { SessionSetup } from "./session-setup";

function agentColor(agentType: string): string {
  switch (agentType) {
    case "system":
      return "text-gray-400";
    case "ba-agent":
      return "text-blue-400";
    case "stakeholder-agent":
      return "text-amber-400";
    case "orchestrator":
      return "text-purple-400";
    default:
      return "text-gray-400";
  }
}

function agentLabel(agentType: string): string {
  switch (agentType) {
    case "system":
      return "System";
    case "ba-agent":
      return "BA Agent";
    case "stakeholder-agent":
      return "Stakeholder Agent";
    case "orchestrator":
      return "Orchestrator";
    default:
      return agentType;
  }
}

export function ChatPanel() {
  const { sessionId, messages, activeDecision, isDemoMode, currentSprint, sessionStarted, wsConnected } =
    useUiStore();
  const { submitDecisionViaApi } = useSessionSync();

  // Demo mode: inject synthetic data instead of polling API
  useDemoData();

  const handleDecisionSubmit = (optionId: string) => {
    if (activeDecision) {
      if (isDemoMode) {
        // In demo mode, just clear the decision and show a feedback message
        useUiStore.getState().addMessage({
          id: crypto.randomUUID(),
          agentType: "orchestrator",
          content: `Decision recorded: **${activeDecision.options.find((o) => o.id === optionId)?.label ?? optionId}**. See metrics update on the right.`,
          timestamp: Date.now(),
        });
        useUiStore.getState().setActiveDecision(null);
      } else {
        submitDecisionViaApi(activeDecision.id, optionId);
      }
    }
  };

  return (
    <div className="flex flex-1 flex-col bg-gray-950">
      {/* Sprint header */}
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-100">PO Simulation Platform</h1>
          {sessionStarted && (
            <span className="text-xs text-gray-500">Sprint {currentSprint}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className={`h-2 w-2 rounded-full ${wsConnected ? "bg-green-500" : "bg-red-500"}`} />
            <span className="text-[10px] text-gray-500">{wsConnected ? "Connected" : "Offline"}</span>
          </div>
        </div>
      </div>

      {/* Session setup (if no session) */}
      {!sessionId && <SessionSetup />}

      {/* Chat messages */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4 scrollbar-thin">
        {messages.length === 0 && sessionId && !sessionStarted && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-gray-500">Waiting for simulation to start...</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="flex flex-col">
            <div className="mb-1 flex items-baseline gap-2">
              <span className={`text-xs font-semibold ${agentColor(msg.agentType)}`}>
                {agentLabel(msg.agentType)}
              </span>
              <span className="text-[10px] text-gray-600">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <div className="prose prose-sm prose-invert max-w-none rounded-lg bg-gray-900 px-4 py-3">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
            </div>
          </div>
        ))}
      </div>

      {/* Decision popup */}
      {activeDecision && (
        <DecisionPopup decision={activeDecision} onSubmit={handleDecisionSubmit} />
      )}
    </div>
  );
}
