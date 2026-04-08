"use client";

import { useEffect, useRef, useCallback } from "react";
import { useUiStore, type ChatMessage, type DecisionPrompt, type DocumentSpec } from "@/store/ui-store";

/** Synthetic demo data that simulates a running orchestrator */
const DEMO_MESSAGES: ChatMessage[] = [
  {
    id: "demo-1",
    agentType: "orchestrator",
    content: "Welcome to Sprint 1! You are the PO for an e-commerce platform. Let's get started with the first backlog.",
    timestamp: 0,
  },
  {
    id: "demo-2",
    agentType: "ba-agent",
    content: `## Backlog Analysis\n\nI've analyzed the requirements and identified **5 key user stories** for this sprint:\n\n| # | Story | Priority | Estimate |\n|---|-------|----------|----------|\n| 1 | User registration | High | 5 SP |\n| 2 | Product catalog browse | High | 8 SP |\n| 3 | Shopping cart | Medium | 13 SP |\n| 4 | Checkout flow | High | 13 SP |\n| 5 | Order confirmation | Medium | 3 SP |\n\nTotal velocity capacity: 26 SP. I recommend stories 1, 2, 3, 5 for this sprint.`,
    timestamp: 0,
  },
  {
    id: "demo-3",
    agentType: "stakeholder-agent",
    content: "I want to emphasize that **checkout flow is critical** for our Q1 revenue targets. Can we prioritize that over the cart? Without checkout, the cart is useless.",
    timestamp: 0,
  },
];

const DEMO_DECISION: DecisionPrompt = {
  id: "decision-1",
  title: "Sprint 1 Backlog Selection",
  description: "The BA recommends stories 1, 2, 3, 5. The stakeholder wants checkout (story 4) included. How do you decide?",
  options: [
    { id: "opt-ba", label: "Follow BA Recommendation", description: "Stories 1, 2, 3, 5 (29 SP -- over capacity)" },
    { id: "opt-stakeholder", label: "Include Checkout", description: "Stories 1, 2, 4, 5 (34 SP -- significantly over)" },
    { id: "opt-compromise", label: "Compromise: Drop Cart", description: "Stories 1, 2, 4, 5 (21 SP -- within capacity)" },
  ],
};

const DEMO_DOCUMENTS: DocumentSpec[] = [
  {
    id: "spec-1",
    title: "BA Spec: Sprint 1",
    type: "User Stories",
    content: `# Sprint 1 Specification\n\n## User Story: Registration\n**As a** new user\n**I want to** create an account\n**So that** I can save my preferences\n\n### Acceptance Criteria\n- [ ] Email validation\n- [ ] Password strength check\n- [ ] Confirmation email sent\n\n## User Story: Product Catalog\n**As a** shopper\n**I want to** browse products\n**So that** I can find what I need\n\n### Acceptance Criteria\n- [ ] Search by name\n- [ ] Filter by category\n- [ ] Sort by price`,
  },
];

const DEMO_INTERVAL = 3000;

export function useDemoData() {
  const { addMessage, setMetrics, setDocuments, setActiveDecision, setCurrentSprint, setSessionStarted, isDemoMode, sessionId } = useUiStore();
  const stepRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shouldRun = isDemoMode && !!sessionId;

  const advanceDemo = useCallback(() => {
    const step = stepRef.current;

    if (step === 0) {
      // Add first message immediately
      addMessage({ ...DEMO_MESSAGES[0], timestamp: Date.now() });
    } else if (step === 1) {
      addMessage({ ...DEMO_MESSAGES[1], timestamp: Date.now() });
      setDocuments(DEMO_DOCUMENTS);
    } else if (step === 2) {
      addMessage({ ...DEMO_MESSAGES[2], timestamp: Date.now() });
    } else if (step === 3) {
      setActiveDecision(DEMO_DECISION);
    } else if (step === 4) {
      setActiveDecision(null);
      setMetrics([
        { label: "Prioritization", value: 72, max: 100, trend: "up", category: "prioritization" },
        { label: "Communication", value: 65, max: 100, trend: "up", category: "communication" },
        { label: "Analytics Thinking", value: 58, max: 100, trend: "stable", category: "analytics" },
        { label: "Stakeholder Management", value: 70, max: 100, trend: "down", category: "stakeholder-management" },
      ]);
      setCurrentSprint(1);
    } else if (step === 5) {
      addMessage({
        id: `demo-${step}`,
        agentType: "orchestrator",
        content: "**Sprint 1 complete!** Great decision. Your stakeholder management score dropped slightly for ignoring the checkout concern, but your prioritization score improved. Moving to Sprint 2...",
        timestamp: Date.now(),
      });
    }

    stepRef.current = step + 1;
  }, [addMessage, setMetrics, setDocuments, setActiveDecision, setCurrentSprint, setSessionStarted]);

  useEffect(() => {
    // Fire first step immediately
    advanceDemo();
    intervalRef.current = setInterval(advanceDemo, DEMO_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [advanceDemo]);
}
