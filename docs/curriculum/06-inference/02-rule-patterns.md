---
id: inf-rule-patterns
title: Common Rule Patterns
context: null
requires: [inf-rules-intro]
---

# Common Rule Patterns

Rules follow predictable patterns. Learning these patterns helps you model complex domains.

## Pattern 1: Simple Derivation

Derive one relation from another:

```typeql:readonly[id=inf-pattern-simple]
define
rule parent-is-ancestor:
  when {
    (parent: $p, child: $c) isa parenthood;
  } then {
    (ancestor: $p, descendant: $c) isa ancestry;
  };
```

Every parent is also an ancestor of their children.

## Pattern 2: Transitive Closure

Self-referential rules for graph traversal:

```typeql:readonly[id=inf-pattern-transitive]
define
rule transitive-ancestry:
  when {
    (ancestor: $a, descendant: $b) isa ancestry;
    (ancestor: $b, descendant: $c) isa ancestry;
  } then {
    (ancestor: $a, descendant: $c) isa ancestry;
  };
```

Ancestors of ancestors are also ancestors.

## Pattern 3: Permission Inheritance

Derive individual permissions from group membership:

```typeql:readonly[id=inf-pattern-permission]
define
rule inherited-team-permission:
  when {
    (team: $team, member: $member) isa team-membership;
    (subject: $team, object: $obj, action: $act) isa permission;
  } then {
    (subject: $member, object: $obj, action: $act) isa inherited-permission;
  };
```

Team members inherit their team's permissions.

## Pattern 4: Conditional Classification

Classify entities based on attribute values:

```typeql:readonly[id=inf-pattern-classify]
define
rule high-value-customer:
  when {
    $c isa customer, has total-purchases $p;
    $p > 10000;
  } then {
    $c has customer-tier "gold";
  };
```

Customers with high purchases are automatically "gold" tier.

## Combining Rules

Multiple rules can work together:

```typeql:readonly[id=inf-pattern-combined]
define
# Base case
rule parent-is-ancestor:
  when {
    (parent: $p, child: $c) isa parenthood;
  } then {
    (ancestor: $p, descendant: $c) isa ancestry;
  };

# Recursive case
rule transitive-ancestry:
  when {
    (ancestor: $a, descendant: $b) isa ancestry;
    (ancestor: $b, descendant: $c) isa ancestry;
  } then {
    (ancestor: $a, descendant: $c) isa ancestry;
  };
```

Together, these rules compute the complete ancestry graph.
