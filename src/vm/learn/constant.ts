import { type Queryable, computed } from "@livestore/livestore";

/** Creates a queryable that always returns the same value */
export function constant<T>(value: T, label: string): Queryable<T> {
  const query = computed((): T => value, { label, deps: [getValueHash(value)] });
  // @ts-ignore
  query.constantValue = value; // type hack to expose value directly
  return query;
}
const seenObjects = new WeakMap<any, number>();
let lastWeakObject = 0;
function getValueHash<T>(value: T): string {
  if (!value) return String(value);
  if (typeof value === "function" || typeof value === "object") {
    if (seenObjects.has(value)) {
      return `#${seenObjects.get(value)}`;
    } else {
      seenObjects.set(value, ++lastWeakObject);
      return `#${lastWeakObject}`;
    }
  }
  return `/${value}`;
}
