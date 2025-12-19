---
id: patterns-edges
title: Edges in the Graph
context: S1
requires: [patterns-nodes]
---

# Edges in the Graph

**Relations are edges**—they connect nodes together. Every edge has a type and connects specific roles.

```
    (Alice)────[friendship]────(Bob)
       ●─────────────────────────●
    friend                    friend
```

## Anatomy of an Edge

An edge in TypeQL has three parts:

1. **Nodes** - The entities being connected
2. **Roles** - What role each node plays
3. **Type** - What kind of connection this is

```
    ($person)────[employment]────($company)
         ●───────────────────────────●
      employee                    employer
```

## Finding Edges

To find all friendship edges:

```typeql:example[id=patterns-edges-friendships, expect=results, min=4]
match (friend: $a, friend: $b) isa friendship;
```

Notice both ends play the same role (`friend`)—friendships are symmetric.

## Edges with Different Roles

Employment edges connect different roles—an employee and an employer:

```
    (Alice)                     (Acme Corp)
       ●───────[employment]─────────●
    employee                     employer
```

```typeql:example[id=patterns-edges-employment, expect=results, min=4]
match (employee: $person, employer: $company) isa employment;
```

## Following an Edge from a Node

Start at a specific node and follow its edges:

```
                    ┌──[employment]──(Acme Corp)
    (Alice)─────────┤
                    └──[friendship]──(Bob)
                    └──[friendship]──(Carol)
```

Find who Alice is friends with:

```typeql:example[id=patterns-edges-alice-friends, expect=results, min=2]
match
  $alice isa person, has name "Alice";
  (friend: $alice, friend: $other) isa friendship;
```

## Edges Can Have Attributes

Edges aren't just connections—they can carry data too:

```
    (Alice)────[employment]────(Acme Corp)
                    │
               start-date
              2020-01-15
```

```typeql:example[id=patterns-edges-with-attrs, expect=results, min=4]
match
  (employee: $p, employer: $c) isa employment, has start-date $date;
  $p has name $name;
  $c has name $company;
```

## Edge Direction

Some edges have inherent direction through their roles:

- `employment`: employee → employer (asymmetric)
- `friendship`: friend ↔ friend (symmetric)

In TypeQL, you specify roles explicitly, making direction clear.

## Thinking in Edges

When modeling data, ask:

1. What **relationships** exist between your nodes?
2. Are they **symmetric** (friendship) or **directed** (employment)?
3. What **data** belongs on the edge itself?

Next, we'll combine nodes and edges to traverse paths through the graph.
