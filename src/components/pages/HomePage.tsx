/**
 * Home page component for TypeDB Studio.
 *
 * Welcome page with navigation cards.
 * Updated with Dense-Core tokens (Phase 6: Task 6.1)
 */

import type { HomePageVM } from "@/vm";
import { Queryable } from "@/vm/components";

export function HomePage({ vm }: { vm: HomePageVM }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-12 px-6">
      <div className="max-w-4xl w-full space-y-8">
        {/* Header - Task 6.1: text-3xl heading, mb-2 + mb-8 */}
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-dense-3xl font-semibold text-foreground">
            Welcome to TypeDB Studio
          </h1>
          <Queryable query={vm.connectionSummary$}>
            {(summary) => (
              <p className="text-dense-base text-muted-foreground">{summary}</p>
            )}
          </Queryable>
        </div>

        {/* Navigation Cards - Task 6.1: gap-6, rounded-xl cards */}
        <Queryable query={vm.cards$}>
          {(cards) => (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cards.map((card) => (
                <NavigationCard key={card.key} vm={card} />
              ))}
            </div>
          )}
        </Queryable>
      </div>
    </div>
  );
}

function NavigationCard({ vm }: { vm: import("@/vm").HomeNavigationCardVM }) {
  const Icon = vm.icon;

  return (
    <Queryable query={vm.disabled$}>
      {(disabled) => (
        <button
          onClick={disabled === null ? vm.click : undefined}
          disabled={disabled !== null}
          className={`
            flex flex-col items-start p-6 rounded-xl border border-border
            bg-card text-card-foreground text-left
            transition-all duration-200
            ${disabled === null
              ? "hover:border-primary/50 hover:bg-accent/50 cursor-pointer"
              : "opacity-50 cursor-not-allowed"
            }
          `}
          title={disabled?.displayReason}
        >
          {/* Icon - Task 6.1: size-10, mb-4 */}
          <div className="flex items-center justify-center size-10 rounded-lg bg-accent mb-4">
            <Icon className="size-5 text-accent-foreground" />
          </div>
          {/* Title - Task 6.1: text-lg, mb-2 */}
          <h3 className="text-dense-lg font-medium mb-2">{vm.title}</h3>
          {/* Description - Task 6.1: text-dense-sm */}
          <p className="text-dense-sm text-muted-foreground">{vm.description}</p>
        </button>
      )}
    </Queryable>
  );
}
