"use client";

import { useEffect, useRef, useCallback } from "react";
import { useUiStore, type ChatMessage, type MetricValue, type DecisionPrompt, type DocumentSpec } from "@/store/ui-store";
import { getSession, submitDecisionApi } from "@/lib/api";

const POLL_INTERVAL = 2000;

/**
 * Polls the orchestrator REST API to sync session state with the UI store.
 * Falls back to HTTP since WebSocket endpoint isn't yet implemented.
 */
export function useSessionSync() {
  const {
    sessionId,
    addMessage,
    setMetrics,
    setDocuments,
    setActiveDecision,
    setSessionStarted,
    setCurrentSprint,
    wsConnected,
    setWsConnected,
    setActiveDecisionFromApi,
  } = useUiStore();

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSnapshotRef = useRef<string>("");

  const pollSession = useCallback(async () => {
    if (!sessionId) return;

    try {
      const data = await getSession(sessionId);
      const snapshot = JSON.stringify(data);

      if (snapshot === lastSnapshotRef.current) return;
      lastSnapshotRef.current = snapshot;

      const ctx = data.context;
      if (!ctx) return;

      setWsConnected(true);

      // Sync messages (only append new ones)
      if (Array.isArray(ctx.messages)) {
        const existingIds = new Set(useUiStore.getState().messages.map((m) => m.id));
        for (const msg of ctx.messages as ChatMessage[]) {
          if (!existingIds.has(msg.id)) {
            addMessage(msg);
          }
        }
      }

      // Sync metrics
      if (Array.isArray(ctx.metrics)) {
        setMetrics(ctx.metrics as MetricValue[]);
      }

      // Sync active decision
      if (ctx.activeDecision) {
        setActiveDecisionFromApi(ctx.activeDecision as DecisionPrompt);
      } else {
        setActiveDecision(null);
      }

      // Sync documents
      if (Array.isArray(ctx.documents)) {
        setDocuments(ctx.documents as DocumentSpec[]);
      }

      // Sync session state
      if (ctx.sessionStarted) {
        setSessionStarted(true);
      }
      if (ctx.currentSprint) {
        setCurrentSprint(ctx.currentSprint as number);
      }
    } catch {
      setWsConnected(false);
    }
  }, [sessionId, addMessage, setMetrics, setDocuments, setActiveDecision, setActiveDecisionFromApi, setSessionStarted, setCurrentSprint, setWsConnected]);

  const submitDecisionViaApi = useCallback(
    async (decisionId: string, optionId: string) => {
      if (!sessionId) return;
      try {
        await submitDecisionApi(sessionId, optionId);
        setActiveDecision(null);
        pollSession();
      } catch (err) {
        console.error("Failed to submit decision:", err);
      }
    },
    [sessionId, setActiveDecision, pollSession]
  );

  useEffect(() => {
    if (!sessionId) return;

    pollSession();
    pollRef.current = setInterval(pollSession, POLL_INTERVAL);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [sessionId, pollSession]);

  return { submitDecisionViaApi, wsConnected };
}
