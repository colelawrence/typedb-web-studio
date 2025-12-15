/**
 * Learn page component for TypeDB Studio.
 *
 * Interactive TypeQL learning environment with sidebar navigation
 * and document viewer.
 */

import type { LearnPageVM } from "@/vm/pages/learn/learn-page.vm";
import { LearnSidebar } from "../learn/LearnSidebar";
import { DocumentViewer } from "../learn/DocumentViewer";

export interface LearnPageProps {
  vm: LearnPageVM;
}

export function LearnPage({ vm }: LearnPageProps) {
  return (
    <div className="flex h-full">
      {/* Sidebar - Learn navigation */}
      <LearnSidebar vm={vm.sidebar} />

      {/* Document Viewer - Main content */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <DocumentViewer vm={vm.viewer} />
      </div>
    </div>
  );
}
