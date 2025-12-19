---
id: inf-reasoning
title: Graph Traversal Patterns
context: S1
requires: [inf-rule-patterns]
---

# Graph Traversal Patterns

Complex graph queries combine multiple patterns to discover relationships.

## Following Chains

Find all people connected through a chain of friendships:

```typeql:example[id=inf-chain-2hop, expect=results, min=1]
match
  $start isa person, has name "Alice";
  (friend: $start, friend: $hop1) isa friendship;
  (friend: $hop1, friend: $hop2) isa friendship;
  not { $hop2 is $start; };
  $hop2 has name $name;
```

## Finding Mutual Connections

Find friends that two people have in common:

```typeql:example[id=inf-mutual-friends, expect=results, min=1]
match
  $alice isa person, has name "Alice";
  $carol isa person, has name "Carol";
  (friend: $alice, friend: $mutual) isa friendship;
  (friend: $carol, friend: $mutual) isa friendship;
  $mutual has name $name;
```

## Cross-Relationship Queries

Combine different relationship types:

```typeql:example[id=inf-friend-employers, expect=results, min=1]
match
  $person isa person, has name $person-name;
  $company isa company, has name $company-name;
  (friend: $person, friend: $friend) isa friendship;
  (employee: $friend, employer: $company) isa employment;
```

This finds which companies your friends work for.

## Negation for Exclusion

Find people who are NOT friends:

```typeql:example[id=inf-not-friends, expect=results, min=1]
match
  $p1 isa person, has name "Alice";
  $p2 isa person, has name $other-name;
  not { (friend: $p1, friend: $p2) isa friendship; };
  not { $p1 is $p2; };
```

## Optional Patterns with try

Include data that might not exist:

```typeql:example[id=inf-optional-data, expect=results, min=4]
match
  $p isa person, has name $name;
  try { $p has age $age; };
```

Returns all people, with age when available.

## Counting Relationships

Count how many friends each person has:

```typeql:example[id=inf-count-friends, expect=results, min=2]
match
  $p isa person, has name $name;
  (friend: $p, friend: $f) isa friendship;
reduce $friend-count = count groupby $p, $name;
```

## Best Practices

1. **Start with specific matches** - Anchor your query with known entities
2. **Use `not { $a is $b; }`** - Exclude self-matches in symmetric relations
3. **Connect variables** - Every variable should connect to the pattern
4. **Test incrementally** - Build complex queries step by step
