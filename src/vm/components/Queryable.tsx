/**
 * Queryable component for rendering reactive values from LiveStore.
 *
 * This component bridges LiveStore's Queryable values to React.
 * It subscribes to changes and re-renders when the value updates.
 *
 * @example
 * ```tsx
 * // Render as text directly
 * <Queryable query={vm.displayName$} />
 *
 * // Render with custom rendering
 * <Queryable query={vm.isEnabled$}>
 *   {(value) => <div>{value ? "Enabled" : "Disabled"}</div>}
 * </Queryable>
 *
 * // Use hooks inside the render function
 * <Queryable query={vm.items$}>
 *   {(items) => {
 *     const sorted = useMemo(() => items.sort(), [items]);
 *     return <ItemList items={sorted} />;
 *   }}
 * </Queryable>
 * ```
 */

import type { Queryable as QueryableType } from "@livestore/livestore";
import { useQuery } from "@livestore/react";
import { CatchBoundary } from "@tanstack/react-router";

/**
 * Renders a Queryable value directly as text (when the value is ReactNode-compatible).
 */
export function Queryable<T extends React.ReactNode>(props: {
	query: QueryableType<T>;
	children?: (value: T) => React.ReactNode;
}): React.ReactNode;

/**
 * Renders a Queryable value using a render function.
 * The render function can use hooks like useMemo, useCallback, etc.
 */
export function Queryable<T>(props: {
	query: QueryableType<T>;
	children: (value: T) => React.ReactNode;
}): React.ReactNode;

/**
 * Implementation that handles both overloads.
 */
export function Queryable(props: {
	query: QueryableType<unknown>;
	children?: (value: unknown) => React.ReactNode;
}) {
	const value = useQuery(props.query);

	return (
		<>
			{typeof props.children === "function" ? (
				<CatchBoundary
					getResetKey={() =>
						String(props.query) + String((props.query as any).label)
					}
					onCatch={() => {
						// Development-time assertion: catch SSR/LiveStore misconfigurations early
						// If useQuery returns null when it shouldn't, we're likely rendering outside LiveStoreProvider
						// or during SSR (where LiveStore's browser APIs aren't available)
						if (import.meta.env.DEV && value === null && props.query !== null) {
							console.error(
								"Queryable received null from useQuery. This usually means:\n" +
									"1. Component is rendering during SSR (add `ssr: false` to route)\n" +
									"2. Component is outside LiveStoreProvider\n" +
									"Query:",
								props.query,
								"Value:",
								value,
							);
						}
					}}
				>
					{/* biome-ignore lint/correctness/noChildrenProp: <explanation> */}
					<RenderFn value={value} children={props.children} />
				</CatchBoundary>
			) : (
				(value as React.ReactNode)
			)}
		</>
	);
}

function RenderFn<T>(props: {
	value: T;
	children: (value: T) => React.ReactNode;
}) {
	return <>{props.children(props.value)}</>;
}
