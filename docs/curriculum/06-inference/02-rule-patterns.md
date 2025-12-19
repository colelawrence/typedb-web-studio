---
id: inf-rule-patterns
title: Modeling Derived Relationships
context: S1
requires: [inf-rules-intro]
---

# Modeling Derived Relationships

Without automatic inference, we model derived relationships with multi-hop queries. These patterns work with the social network data.

## Pattern 1: Multi-Hop Queries

Find indirect relationships by chaining patterns. This finds friends-of-friends:

```typeql:example[id=inf-multihop-fof, expect=results, min=1]
match
  $me isa person, has name "Alice";
  (friend: $me, friend: $f1) isa friendship;
  (friend: $f1, friend: $fof) isa friendship;
  not { $fof is $me; };
  $fof has name $name;
```

Alice's friends are Bob and Carol. Bob's friends include Carol and Dan. So Dan is a friend-of-friend.

## Pattern 2: Shared Context

Find people with common relationships. This finds coworkers:

```typeql:example[id=inf-shared-employer, expect=results, min=1]
match
  $p1 isa person, has name $n1;
  $p2 isa person, has name $n2;
  (employee: $p1, employer: $c) isa employment;
  (employee: $p2, employer: $c) isa employment;
  not { $p1 is $p2; };
```

Two people are coworkers if they work for the same company.

## Pattern 3: Cross-Relationship Queries

Combine friendship and employment patterns:

```typeql:example[id=inf-cross-relations, expect=results, min=1]
match
  $person isa person, has name "Alice";
  $company isa company, has name $company-name;
  (friend: $person, friend: $friend) isa friendship;
  (employee: $friend, employer: $company) isa employment;
```

This finds companies where Alice's friends work.

## Pattern 4: Aggregated Attributes

Use `reduce` for computed values:

```typeql:example[id=inf-computed-count, expect=results, min=1]
match
  $c isa company, has name $company-name;
  (employee: $p, employer: $c) isa employment;
reduce $employee-count = count groupby $c, $company-name;
```

Count employees per company.

## When to Store vs Query

**Query patterns directly when:**
- Data changes frequently
- Real-time accuracy matters
- The pattern is simple (2-3 hops)

**Store derived relationships when:**
- They're queried frequently
- The computation spans many hops
- Performance is critical

## Future: Rule Syntax

When rules become available, multi-hop patterns can be computed automatically:

```
# Future syntax (not yet supported)
rule friend-of-friend:
  when {
    (friend: $a, friend: $b) isa friendship;
    (friend: $b, friend: $c) isa friendship;
  } then {
    (indirect-friend: $a, indirect-friend: $c) isa indirect-friendship;
  };
```

Until then, use explicit multi-hop queries.
