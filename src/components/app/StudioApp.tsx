/**
 * Main TypeDB Studio App component.
 *
 * Sets up LiveStore provider and composes the app shell.
 */

import { useMemo, Suspense, lazy } from "react";
import { unstable_batchedUpdates as batchUpdates } from "react-dom";
import { LiveStoreProvider, useStore } from "@livestore/react";
import { makePersistedAdapter } from "@livestore/adapter-web";
import { StudioVMContext, createStudioScope } from "@/vm";
import { schema } from "@/livestore";
import { TopBar } from "./TopBar";
import { Snackbar } from "./Snackbar";
import { Dialogs } from "./Dialogs";
import { Queryable } from "@/vm/components";

// Import workers using Vite's worker query syntax
import LiveStoreWorker from "../../livestore/worker.ts?worker";
import LiveStoreSharedWorker from "@livestore/adapter-web/shared-worker?sharedworker";

// Lazy load pages
const HomePage = lazy(() => import("../pages/HomePage").then(m => ({ default: m.HomePage })));
const ConnectPage = lazy(() => import("../pages/ConnectPage").then(m => ({ default: m.ConnectPage })));
const LearnPage = lazy(() => import("../pages/LearnPage").then(m => ({ default: m.LearnPage })));
const QueryPage = lazy(() => import("../pages/QueryPage").then(m => ({ default: m.QueryPage })));
const UsersPage = lazy(() => import("../pages/UsersPage").then(m => ({ default: m.UsersPage })));

// Create LiveStore adapter for web worker
const adapter = makePersistedAdapter({
  storage: { type: "opfs" },
  worker: LiveStoreWorker,
  sharedWorker: LiveStoreSharedWorker,
});

/**
 * Root component that provides LiveStore context.
 */
export function StudioAppProvider({ children }: { children?: React.ReactNode }) {
  "use client";
  return (
    <LiveStoreProvider
      schema={schema}
      adapter={adapter}
      batchUpdates={batchUpdates}
      renderLoading={() => <StudioLoadingScreen />}
    >
      <StudioAppContent />
      {children}
    </LiveStoreProvider>
  );
}

/**
 * Loading screen shown while LiveStore initializes.
 */
function StudioLoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground text-dense-sm">Loading TypeDB Studio...</p>
      </div>
    </div>
  );
}

/**
 * App content that has access to LiveStore.
 */
function StudioAppContent() {
  const { store } = useStore();

  // Create VM tree - memoized to prevent recreation
  const vm = useMemo(() => {
    // Navigation function - for now just log, will be connected to router later
    const navigate = (path: string) => {
      console.log("Navigate to:", path);
      // TODO: Connect to TanStack Router
    };

    const { vm } = createStudioScope(store, navigate);
    return vm;
  }, [store]);

  return (
    <StudioVMContext.Provider value={vm}>
      <div className="flex flex-col h-screen bg-background text-foreground">
        {/* Top Bar */}
        <TopBar vm={vm.topBar} />

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          <Suspense fallback={<PageLoadingFallback />}>
            <Queryable query={vm.currentPage$}>
              {(pageState) => {
                switch (pageState.page) {
                  case "home":
                    return <HomePage vm={pageState.vm} />;
                  case "connect":
                    return <ConnectPage vm={pageState.vm} />;
                  case "learn":
                    return <LearnPage vm={pageState.vm} />;
                  case "query":
                    return <QueryPage vm={pageState.vm} />;
                  case "users":
                    return <UsersPage vm={pageState.vm} />;
                }
              }}
            </Queryable>
          </Suspense>
        </main>

        {/* Snackbar */}
        <Snackbar vm={vm.snackbar} />

        {/* Modal Dialogs */}
        <Dialogs vm={vm.dialogs} />
      </div>
    </StudioVMContext.Provider>
  );
}

/**
 * Fallback shown while lazy-loading pages.
 */
function PageLoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="size-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );
}

export default StudioAppProvider;
