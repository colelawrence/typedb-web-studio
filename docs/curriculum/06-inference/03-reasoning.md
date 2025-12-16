---
id: inf-reasoning
title: Reasoning in Queries
context: null
requires: [inf-rule-patterns]
---

# Reasoning in Queries

When rules are defined, queries automatically include derived facts.

## Querying Derived Facts

With the ancestry rules defined, query all ancestors:

```typeql:readonly[id=inf-query-ancestors]
match
  $me isa person, has name "You";
  (descendant: $me, ancestor: $a) isa ancestry;
```

This returns ALL ancestors - parents, grandparents, great-grandparents - not just those explicitly stored.

## The Magic of Inference

Insert only parent relationships:

```typeql:readonly[id=inf-insert-family]
insert
  $alice isa person, has name "Alice";
  $bob isa person, has name "Bob";
  $carol isa person, has name "Carol";
  (parent: $alice, child: $bob) isa parenthood;
  (parent: $bob, child: $carol) isa parenthood;
```

Query for ancestry:

```typeql:readonly[id=inf-query-alice]
match
  $alice isa person, has name "Alice";
  (ancestor: $alice, descendant: $d) isa ancestry;
```

Returns both Bob (direct child) AND Carol (grandchild) - Carol is derived!

## Performance Considerations

Rules are evaluated:
- **At query time** - Not stored, computed on-demand
- **Lazily** - Only patterns needed by your query
- **Efficiently** - TypeDB optimizes rule evaluation

## When to Use Rules

Rules excel at:
- Graph traversal (friends-of-friends)
- Inheritance hierarchies (permissions, classifications)
- Derived relationships (co-workers from shared employer)
- Domain logic (eligibility rules, risk assessment)

Rules are less suited for:
- Simple data transformations (use expressions)
- One-off calculations (use reduce/aggregations)
- External data lookups (use application code)
