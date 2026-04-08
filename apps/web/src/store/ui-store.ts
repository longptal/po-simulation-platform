import { create } from "zustand";

export interface ChatMessage {
  id: string;
  agentType: "system" | "ba-agent" | "stakeholder-agent" | "orchestrator";
  content: string;
  timestamp: number;
}

export interface MetricValue {
  label: string;
  value: number;
  max: number;
  trend: "up" | "down" | "stable";
  category: "prioritization" | "communication" | "analytics" | "stakeholder-management";
}

export interface DecisionPrompt {
  id: string;
  title: string;
  description: string;
  options: { id: string; label: string; description?: string }[];
}

export interface DocumentSpec {
  id: string;
  title: string;
  type: string;
  content: string;
}

export interface UiState {
  // Session
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
  sessionStarted: boolean;
  setSessionStarted: (started: boolean) => void;
  currentSprint: number;
  setCurrentSprint: (sprint: number) => void;

  // Chat
  messages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;

  // Decision
  activeDecision: DecisionPrompt | null;
  setActiveDecision: (decision: DecisionPrompt | null) => void;
  /** Set decision from API sync (only if not already set) */
  setActiveDecisionFromApi: (decision: DecisionPrompt | null) => void;
  submitDecision: (decisionId: string, optionId: string) => void;

  // Metrics
  metrics: MetricValue[];
  setMetrics: (metrics: MetricValue[]) => void;

  // Documents
  documents: DocumentSpec[];
  setDocuments: (documents: DocumentSpec[]) => void;
  selectedDocumentId: string | null;
  setSelectedDocumentId: (id: string | null) => void;

  // Connection status
  wsConnected: boolean;
  setWsConnected: (connected: boolean) => void;

  // Demo mode
  isDemoMode: boolean;
  setIsDemoMode: (demo: boolean) => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  // Session
  sessionId: null,
  setSessionId: (id) => set({ sessionId: id }),
  sessionStarted: false,
  setSessionStarted: (started) => set({ sessionStarted: started }),
  currentSprint: 1,
  setCurrentSprint: (sprint) => set({ currentSprint: sprint }),

  // Chat
  messages: [],
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  clearMessages: () => set({ messages: [] }),

  // Decision
  activeDecision: null,
  setActiveDecision: (decision) => set({ activeDecision: decision }),
  setActiveDecisionFromApi: (decision) => {
    const current = get().activeDecision;
    if (!current || current.id !== decision?.id) {
      set({ activeDecision: decision });
    }
  },
  submitDecision: (_decisionId, _optionId) => {
    set({ activeDecision: null });
  },

  // Metrics
  metrics: [
    { label: "Prioritization", value: 0, max: 100, trend: "stable", category: "prioritization" },
    { label: "Communication", value: 0, max: 100, trend: "stable", category: "communication" },
    { label: "Analytics Thinking", value: 0, max: 100, trend: "stable", category: "analytics" },
    {
      label: "Stakeholder Management",
      value: 0,
      max: 100,
      trend: "stable",
      category: "stakeholder-management",
    },
  ],
  setMetrics: (metrics) => set({ metrics }),

  // Documents
  documents: [],
  setDocuments: (documents) => set({ documents }),
  selectedDocumentId: null,
  setSelectedDocumentId: (id) => set({ selectedDocumentId: id }),

  // Connection status
  wsConnected: false,
  setWsConnected: (connected) => set({ wsConnected: connected }),

  // Demo mode
  isDemoMode: process.env.NEXT_PUBLIC_DEMO_MODE === "true",
  setIsDemoMode: (demo) => set({ isDemoMode: demo }),
}));

/** Convenience selector for the currently selected document */
export function useSelectedDocument() {
  return useUiStore((state) => state.documents.find((d) => d.id === state.selectedDocumentId));
}
