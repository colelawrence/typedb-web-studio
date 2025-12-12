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
      {typeof props.children === "function"
        ? props.children(value)
        : (value as React.ReactNode)}
    </>
  );
}
