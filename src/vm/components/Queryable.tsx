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
 * Renders multiple Queryable values as a tuple.
 * Useful when you need to combine multiple reactive values.
 *
 * @example
 * ```tsx
 * <Queryable query={[vm.name$, vm.count$]}>
 *   {([name, count]) => <div>{name}: {count}</div>}
 * </Queryable>
 * ```
 */
export function Queryable<
	// biome-ignore lint/suspicious/noExplicitAny: required for tuple type constraint
	T extends [QueryableType<any>, ...QueryableType<any>[]],
>(props: {
	query: T;
	children: (
		value: { [P in keyof T]: T[P] extends QueryableType<infer R> ? R : never },
	) => React.ReactNode;
}): React.ReactNode;

/**
 * Implementation that handles all overloads.
 */
export function Queryable(props: {
	// biome-ignore lint/suspicious/noExplicitAny: implementation signature must accept all overload types
	query: QueryableType<any> | [QueryableType<any>, ...QueryableType<any>[]];
	// biome-ignore lint/suspicious/noExplicitAny: implementation signature must accept all overload types
	children?: (value: any) => React.ReactNode;
}) {
	// Handle tuple case
	if (Array.isArray(props.query)) {
		return (
			<QueryableTuple
				queries={props.query}
				// biome-ignore lint/style/noNonNullAssertion: tuple overload requires children
				// biome-ignore lint/correctness/noChildrenProp: passing children as prop for render function pattern
				children={props.children!}
			/>
		);
	}

	// biome-ignore lint/correctness/useHookAtTopLevel: array case returns early to QueryableTuple component
	const value = useQuery(props.query);

	return (
		<>
			{typeof props.children === "function" ? (
				<CatchBoundary
					getResetKey={() =>
						// biome-ignore lint/suspicious/noExplicitAny: accessing optional label property
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
					{/* biome-ignore lint/correctness/noChildrenProp: passing children as prop for render function pattern */}
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

function QueryableTuple(props: {
	queries: QueryableType<unknown>[];
	children: (values: unknown[]) => React.ReactNode;
}) {
	const values: unknown[] = [];
	for (const q of props.queries) {
		// biome-ignore lint/correctness/useHookAtTopLevel: tuple length is fixed at compile time, so hook order is stable
		values.push(useQuery(q));
	}

	return (
		<CatchBoundary
			getResetKey={() => props.queries.map(String).join(",")}
			onCatch={() => {}}
		>
			{/* biome-ignore lint/correctness/noChildrenProp: passing children as prop for render function pattern */}
			<RenderFn value={values} children={props.children} />
		</CatchBoundary>
	);
}
