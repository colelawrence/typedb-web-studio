/**
 * Home page component for TypeDB Studio.
 *
 * Welcome page with navigation cards.
 */

import type { HomePageVM } from "@/vm";
import { Queryable } from "@/vm/components";

export function HomePage({ vm }: { vm: HomePageVM }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div className="max-w-4xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome to TypeDB Studio
          </h1>
          <Queryable query={vm.connectionSummary$}>
            {(summary) => (
              <p className="text-muted-foreground">{summary}</p>
            )}
          </Queryable>
        </div>

        {/* Navigation Cards */}
        <Queryable query={vm.cards$}>
          {(cards) => (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cards?.map((card) => (
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
            flex flex-col items-start p-6 rounded-lg border border-border
            bg-card text-card-foreground text-left
            transition-all duration-200
            ${disabled === null
              ? "hover:border-primary hover:shadow-lg cursor-pointer"
              : "opacity-60 cursor-not-allowed"
            }
          `}
          title={disabled?.displayReason}
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-accent mb-4">
            <Icon className="w-6 h-6 text-accent-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">{vm.title}</h3>
          <p className="text-sm text-muted-foreground">{vm.description}</p>
        </button>
      )}
    </Queryable>
  );
}
