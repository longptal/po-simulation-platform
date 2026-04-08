"use client";

import { DocumentPanel } from "./document-panel";
import { ChatPanel } from "./chat-panel";
import { MetricsPanel } from "./metrics-panel";

export function DashboardLayout() {
  return (
    <div className="flex h-screen w-full bg-gray-950">
      <DocumentPanel />
      <ChatPanel />
      <MetricsPanel />
    </div>
  );
}
