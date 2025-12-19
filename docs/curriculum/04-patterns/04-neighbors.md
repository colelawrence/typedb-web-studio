---
id: patterns-neighbors
title: Finding Neighbors
context: S1
requires: [patterns-paths]
---

# Finding Neighbors

**Neighbors** are nodes directly connected to a given node by one edge. Finding neighbors is fundamental to graph exploration.

```
                    (Bob)
                      │
              ┌───────┼───────┐
              │       │       │
          (Alice) (Carol) (Acme Corp)
          
    Bob's neighbors: Alice, Carol, Acme Corp
```

## Direct Neighbors via Friendship

Find all friends of a specific person:

```typeql:example[id=patterns-neighbors-friends, expect=results, min=2]
match
  $person isa person, has name "Bob";
  (friend: $person, friend: $neighbor) isa friendship;
  $neighbor has name $name;
```

## Neighbors via Any Relation Role

A node's neighbors include connections through any relation:

```
    (Carol)
       │
    ┌──┴──────────────────┐
    │                     │
    [friendship]     [employment]
    │                     │
    ├─(Alice)        (Globex Inc)
    ├─(Bob)
    └─(Dan)
```

Find Carol's employment connections:

```typeql:example[id=patterns-neighbors-employer, expect=results, min=1]
match
  $carol isa person, has name "Carol";
  (employee: $carol, employer: $company) isa employment;
  $company has name $name;
```

## Counting Neighbors

How many friends does each person have?

```typeql:example[id=patterns-neighbors-count, expect=results, min=4]
match
  $person isa person, has name $name;
  (friend: $person, friend: $friend) isa friendship;
```

Note: Each friendship appears twice (once per friend), reflecting the symmetric nature of the relationship.

## Neighbor Properties

Filter neighbors by their attributes:

```
    (Alice, 30)──[friendship]──(Bob, 25)
                              (Carol, 35)
```

Find Alice's friends who are at least 30:

```typeql:example[id=patterns-neighbors-filtered, expect=results, min=1]
match
  $alice isa person, has name "Alice";
  (friend: $alice, friend: $friend) isa friendship;
  $friend has name $name, has age $age;
  $age >= 30;
```

## Common Neighbors

Find nodes that share a neighbor—they're connected through the same intermediary:

```
    (Alice)───[friendship]───(Bob)───[friendship]───(Carol)
    
    Alice and Carol share neighbor Bob
```

```typeql:example[id=patterns-neighbors-common, expect=results, min=1]
match
  $alice isa person, has name "Alice";
  $carol isa person, has name "Carol";
  (friend: $alice, friend: $shared) isa friendship;
  (friend: $shared, friend: $carol) isa friendship;
  $shared has name $name;
```

## Neighborhood Exploration

To understand a node, examine its neighborhood:

1. **Who** is connected?
2. **How** are they connected (relation type)?
3. **What role** does each party play?

```typeql:example[id=patterns-neighbors-full, expect=results, min=2]
match
  $bob isa person, has name "Bob";
  (friend: $bob, friend: $f) isa friendship;
  $f has name $friendName;
```

## Thinking About Neighborhoods

Neighborhoods reveal:

- **Connectivity**: How many connections a node has
- **Community**: What cluster a node belongs to
- **Influence**: A node's reach within the graph

Next, we'll combine these patterns for advanced graph thinking.
