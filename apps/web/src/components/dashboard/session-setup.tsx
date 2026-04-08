"use client";

import { useState } from "react";
import { useUiStore } from "@/store/ui-store";
import { createSession, healthCheck } from "@/lib/api";

const DEFAULT_SCENARIOS = [
  { id: "ecommerce-mvp", label: "E-Commerce MVP" },
  { id: "mobile-app-redesign", label: "Mobile App Redesign" },
];

export function SessionSetup() {
  const { setSessionId, setSessionStarted, addMessage, setIsDemoMode, isDemoMode } = useUiStore();
  const [userId, setUserId] = useState("po-user-001");
  const [scenarioId, setScenarioId] = useState(DEFAULT_SCENARIOS[0].id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    setLoading(true);
    setError(null);

    try {
      // If in demo mode, create a synthetic session without backend
      if (isDemoMode) {
        const demoSessionId = `demo-${crypto.randomUUID()}`;
        setSessionId(demoSessionId);
        setSessionStarted(true);
        addMessage({
          id: crypto.randomUUID(),
          agentType: "orchestrator",
          content: "Demo mode active. Synthetic metrics and messages will be generated.",
          timestamp: Date.now(),
        });
        return;
      }

      const data = await createSession(userId, scenarioId);
      setSessionId(data.sessionId);
      setSessionStarted(true);
      addMessage({
        id: crypto.randomUUID(),
        agentType: "system",
        content: `Session created (${data.sessionId}). Scenario: ${scenarioId}`,
        timestamp: Date.now(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
    } finally {
      setLoading(false);
    }
  };

  const handleHealthCheck = async () => {
    try {
      const result = await healthCheck();
      addMessage({
        id: crypto.randomUUID(),
        agentType: "system",
        content: `Backend health: **${result.status}** (service: ${result.service})`,
        timestamp: Date.now(),
      });
    } catch {
      setError("Backend not reachable. Try demo mode or check the orchestrator.");
    }
  };

  return (
    <div className="border-b border-zinc-200 bg-zinc-50 p-4">
      <h2 className="mb-3 text-sm font-semibold text-zinc-900">Start New Session</h2>

      <div className="mb-3 flex flex-col gap-2">
        <label className="text-xs text-zinc-700">User ID</label>
        <input
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="mb-3 flex flex-col gap-2">
        <label className="text-xs text-zinc-700">Scenario</label>
        <select
          value={scenarioId}
          onChange={(e) => setScenarioId(e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none"
        >
          {DEFAULT_SCENARIOS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <input
          type="checkbox"
          id="demo-mode"
          checked={isDemoMode}
          onChange={(e) => setIsDemoMode(e.target.checked)}
          className="h-3.5 w-3.5 accent-blue-500"
        />
        <label htmlFor="demo-mode" className="text-xs text-zinc-700">
          Demo mode (no backend required)
        </label>
      </div>

      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleStart}
          disabled={loading}
          className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
        >
          {loading ? "Starting..." : "Start Session"}
        </button>
        <button
          onClick={handleHealthCheck}
          className="rounded-md border border-zinc-300 px-4 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-100"
        >
          Check Backend
        </button>
      </div>
    </div>
  );
}
