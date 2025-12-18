---
id: inf-rules-intro
title: Introduction to Inference
context: social-network
---

# Introduction to Inference

TypeDB is designed as a knowledge graph that can derive new facts from existing data.

## Stored vs Derived Knowledge

Knowledge graphs work with two types of knowledge:

1. **Stored knowledge** - Data you explicitly insert
2. **Derived knowledge** - Facts computed from patterns in your data

## TypeQL 3 Status

In TypeQL 3, **rule-based inference is not yet available**. The `rule` keyword from TypeQL 2.x does not exist in the current grammar.

This means that all relationships must be **explicitly stored** rather than derived at query time.

## Alternative: Multi-Hop Queries

You can compute derived relationships at query time using multi-hop patterns:

```typeql:example[id=inf-query-multihop, expect=results, min=1]
match
  $a isa person, has name "Alice";
  (friend: $a, friend: $b) isa friendship;
  (friend: $b, friend: $c) isa friendship;
  not { $c is $a; };
  $c has name $fof-name;
```

This finds friends-of-friends through two friendship hops.

## Alternative: Explicit Data

For frequently-needed derived relationships, store them explicitly when data changes:

```typeql
# When inserting a parent relationship:
insert
  (parent: $a, child: $b) isa parenthood;
  (ancestor: $a, descendant: $b) isa ancestry;  # Also store derived fact
```

## Looking Forward

Rule-based inference remains a core design goal for TypeDB. When available, rules will allow:

- **Automatic derivation** - Facts computed on-demand at query time
- **Transitive closure** - Traverse graphs to any depth
- **Conditional classification** - Assign categories based on criteria

For now, model your domain with explicit relationships and use multi-hop queries for complex inference.
