---
id: koans-matching
title: About Matching
context: social-network
requires: []
---

# About Matching

*The journey of a thousand queries begins with a single match.*

## The Empty Mind

*Before we can find, we must learn to seek.*

To discover all persons, we name what we seek with a variable:

```typeql:example[id=koan-first-match, expect=results, min=4]
match $p isa person;
```

The `$p` becomes each person in turn. Without constraints, all are revealed.

## The Named Vessel

*A variable is an empty vessel, waiting to be filled.*

```typeql:example[id=koan-named-variable, expect=results, min=2]
match $company isa company;
```

`$company` and `$c` hold the same truth—but one speaks clearly.

## The Void Returns Nothing

*A variable without a type is like a question without a subject.*

```typeql:invalid[id=koan-missing-type, error=parse]
match $p;
```

Without `isa`, the database cannot know what you seek.

## The Misspoken Word

*A type that does not exist cannot be found.*

```typeql:invalid[id=koan-unknown-type, error=data]
match $x isa unknown_type;
```

The database knows what types exist—unknown types yield error.

## Two Seekers

*Multiple patterns reveal multiple truths.*

```typeql:example[id=koan-two-variables, expect=results, min=1]
match
  $p isa person;
  $c isa company;
```

Each person pairs with each company—the Cartesian product emerges.

## Reflection

*Sit with these truths:*

- Every query begins with `match`
- Variables start with `$` and must have a type
- Unknown types return emptiness, not error
- Multiple patterns multiply results
