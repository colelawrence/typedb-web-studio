---
id: patterns-paths
title: Paths Through the Graph
context: S1
requires: [patterns-edges]
---

# Paths Through the Graph

A **path** is a sequence of nodes connected by edges. Traversing paths is how you explore relationships in a graph.

```
    (Alice)───[friendship]───(Bob)───[friendship]───(Carol)
       ●──────────────────────●──────────────────────●
       
    Path length: 2 edges
```

## Two-Hop Paths

To traverse two edges, chain patterns together:

```typeql:example[id=patterns-paths-two-hop, expect=results, min=2]
match
  $a isa person, has name "Alice";
  (friend: $a, friend: $middle) isa friendship;
  (friend: $middle, friend: $end) isa friendship;
  $end has name $name;
```

This finds friends-of-friends starting from Alice.

## Crossing Edge Types

Paths can follow different kinds of edges:

```
    (Alice)───[employment]───(Acme Corp)───[employment]───(Bob)
       ●────────────────────────●────────────────────────────●
    employee                 employer                     employee
```

Find people who work at the same company as Alice:

```typeql:example[id=patterns-paths-coworkers, expect=results, min=1]
match
  $alice isa person, has name "Alice";
  (employee: $alice, employer: $company) isa employment;
  (employee: $coworker, employer: $company) isa employment;
  $coworker has name $name;
  not { $coworker is $alice; };
```

## Path Patterns

Common path patterns:

**Direct connection (1 hop):**
```
    A ──── B
```

```typeql:example[id=patterns-paths-direct, expect=results, min=2]
match
  $a isa person, has name "Bob";
  (friend: $a, friend: $b) isa friendship;
  $b has name $name;
```

**Through an intermediary (2 hops):**
```
    A ──── X ──── B
```

```typeql:example[id=patterns-paths-intermediary, expect=results, min=1]
match
  $alice isa person, has name "Alice";
  (friend: $alice, friend: $x) isa friendship;
  (friend: $x, friend: $dan) isa friendship;
  $dan has name "Dan";
  $x has name $middle;
```

## Mixed Path Types

Combine different relationship types in one path:

```
    (Person)───[friendship]───(Person)───[employment]───(Company)
```

Find companies where Alice's friends work:

```typeql:example[id=patterns-paths-mixed, expect=results, min=1]
match
  $alice isa person, has name "Alice";
  (friend: $alice, friend: $friend) isa friendship;
  (employee: $friend, employer: $company) isa employment;
  $company has name $companyName;
```

## Path Length Matters

Longer paths may find more results but are less specific:

- **1 hop**: Direct relationships
- **2 hops**: Through one intermediary  
- **3+ hops**: Increasingly indirect connections

Each hop adds complexity. Start with short paths and extend as needed.

## Thinking in Paths

When querying graphs:

1. Identify your **starting point**
2. Determine what **edges** to follow
3. Specify your **destination** criteria
4. Consider the **path length** that makes sense

Next, we'll explore finding all neighbors of a node—everything connected to it.
