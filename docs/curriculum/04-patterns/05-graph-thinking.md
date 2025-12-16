---
id: patterns-graph-thinking
title: Graph Pattern Thinking
context: social-network
requires: [patterns-neighbors]
---

# Graph Pattern Thinking

Mastering graphs means thinking in **patterns**—reusable structures that answer questions about your data.

## Pattern 1: The Triangle

Three nodes all connected to each other form a **triangle**:

```
        (Alice)
         /   \
        /     \
    (Bob)───(Carol)
```

Find friendship triangles (Alice, Bob, and Carol are all friends with each other):

```typeql:example[id=patterns-thinking-triangle, expect=results, min=1]
match
  $a isa person, has name "Alice";
  $b isa person, has name "Bob";
  $c isa person, has name "Carol";
  (friend: $a, friend: $b) isa friendship;
  (friend: $b, friend: $c) isa friendship;
  (friend: $a, friend: $c) isa friendship;
```

Triangles indicate tight-knit groups where everyone knows everyone.

## Pattern 2: The Hub

A **hub** connects to many nodes—it's central to the network:

```
            (Alice)
               │
    (Dan)──(Carol)──(Bob)
               │
           (Globex)
```

Find who has the most friendships:

```typeql:example[id=patterns-thinking-hub, expect=results, min=4]
match
  $hub isa person, has name $name;
  (friend: $hub, friend: $other) isa friendship;
```

## Pattern 3: The Bridge

A **bridge** connects otherwise separate groups:

```
    Group A          Group B
    (Alice)         (Dan)
       │      Carol    │
       └──────●────────┘
           bridge
```

Carol connects people from different companies (Alice at Acme, Dan at Globex):

```typeql:example[id=patterns-thinking-bridge, expect=results, min=1]
match
  $carol isa person, has name "Carol";
  (friend: $carol, friend: $f1) isa friendship;
  (friend: $carol, friend: $f2) isa friendship;
  (employee: $f1, employer: $c1) isa employment;
  (employee: $f2, employer: $c2) isa employment;
  not { $c1 is $c2; };
```

## Pattern 4: Star Pattern

One center connected to multiple periphery nodes:

```
              (Carol)
                │
    (Alice)──(Bob)──(Acme)
                │
             (friend)
```

Find all of Bob's direct connections (star pattern):

```typeql:example[id=patterns-thinking-star, expect=results, min=2]
match
  $bob isa person, has name "Bob";
  (friend: $bob, friend: $friend) isa friendship;
  $friend has name $friendName;
```

## Combining Patterns

Real queries combine multiple patterns. Find people who:
- Work at the same company as Alice
- And get their friends

```typeql:example[id=patterns-thinking-combined, expect=results, min=1]
match
  $alice isa person, has name "Alice";
  (employee: $alice, employer: $company) isa employment;
  (employee: $colleague, employer: $company) isa employment;
  (friend: $colleague, friend: $friend) isa friendship;
  not { $colleague is $alice; };
  $colleague has name $colleagueName;
  $friend has name $friendName;
```

## Pattern Building Strategy

When constructing complex queries:

1. **Start with anchors** - Fixed points you know (e.g., "Alice")
2. **Add one pattern at a time** - Build incrementally
3. **Test each step** - Verify results before adding complexity
4. **Use negation carefully** - `not` patterns exclude matches

## The Graph Mindset

Think of your data as:

- **Nodes**: The things in your domain
- **Edges**: How they relate
- **Patterns**: Questions expressed as graph shapes

Every business question becomes a pattern:

| Question | Pattern |
|----------|---------|
| "Who knows who?" | Direct edge |
| "Who's connected through X?" | Two-hop path |
| "What groups exist?" | Triangles/clusters |
| "Who's most connected?" | Hub detection |

## Practice Challenges

Try these pattern-based questions:

1. Find all pairs of people who work at the same company
2. Find people with no employment record
3. Find the longest friendship path in the network

Graph thinking is a skill—the more patterns you recognize, the more powerful your queries become.
