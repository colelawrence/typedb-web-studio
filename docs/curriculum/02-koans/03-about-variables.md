---
id: koans-variables
title: About Variables
context: social-network
requires: [koans-attributes]
---

# About Variables

*Variables are the threads that weave patterns together.*

## The Bound Variable

*A variable may appear many times, but refers to one thing.*

```typeql:example[id=koan-variable-binding, expect=results, min=4]
match
  $p isa person, has name $name;
  $p has age $age;
```

The same `$p` in both lines—the same person throughout.

## The Connecting Thread

*Variables bind patterns together.*

```typeql:example[id=koan-join-patterns, expect=results, min=1]
match
  $p isa person, has name "Alice";
  $p has age $a;
```

First we find Alice, then we ask her age.

## The Anonymous Vessel

*Sometimes we seek without needing to name.*

```typeql:example[id=koan-existence-check, expect=results, min=4]
match $p isa person, has name $n;
```

We care that name exists, captured in `$n`.

## The Distinct Paths

*Different variables walk different paths.*

```typeql:example[id=koan-two-persons, expect=results, min=12]
match
  $p1 isa person, has name $n1;
  $p2 isa person, has name $n2;
```

`$p1` and `$p2` may be the same or different—all pairings emerge.

## The Self-Exclusion

*To find pairs, we must exclude identity.*

```typeql:example[id=koan-not-equals, expect=results, min=12]
match
  $p1 isa person;
  $p2 isa person;
  not { $p1 is $p2; };
```

`$p1 is $p2` tests identity; `not` excludes it.

## The Dollar Sign

*Variables must begin with the dollar sign.*

```typeql:invalid[id=koan-missing-dollar, error=parse]
match p isa person;
```

Without `$`, the parser cannot recognize a variable.

## Reflection

*Sit with these truths:*

- The same variable name always refers to the same thing
- Variables connect patterns across lines
- Different variables may match the same or different things
- `not { $a is $b; }` excludes self-matches
