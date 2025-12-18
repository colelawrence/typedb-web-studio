/**
 * Learn page component for TypeDB Studio.
 *
 * Interactive TypeQL learning environment with sidebar navigation
 * and document viewer.
 */

import type { LearnPageVM } from "@/vm/pages/learn/learn-page.vm";
import { LearnSidebar } from "../learn/LearnSidebar";
import { DocumentViewer } from "../learn/DocumentViewer";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

export interface LearnPageProps {
  vm: LearnPageVM;
}

export function LearnPage({ vm }: LearnPageProps) {
  return (
    <PanelGroup
      direction="horizontal"
      autoSaveId="learn-page-main"
      className="h-full"
    >
      {/* Sidebar Panel */}
      <Panel
        defaultSize={20}
        minSize={15}
        maxSize={40}
        order={1}
        id="learn-sidebar-panel"
      >
        <aside className="h-full border-r border-border bg-card flex flex-col">
          <LearnSidebar vm={vm.sidebar} />
        </aside>
      </Panel>

      <PanelResizeHandle className="w-1 bg-border hover:bg-accent transition-colors cursor-col-resize" />

      {/* Content Panel */}
      <Panel defaultSize={80} minSize={40} order={2} id="learn-content-panel">
        <div className="h-full overflow-hidden">
          <DocumentViewer vm={vm.viewer} />
        </div>
      </Panel>
    </PanelGroup>
  );
}
