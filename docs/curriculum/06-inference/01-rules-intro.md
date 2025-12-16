---
id: inf-rules-intro
title: Introduction to Rules
context: null
---

# Introduction to Rules

**Rules** in TypeDB automatically derive new facts from existing data. They're the foundation of knowledge graphs that "think."

## Stored vs Derived Knowledge

TypeDB has two types of knowledge:

1. **Stored knowledge** - Data you explicitly insert
2. **Derived knowledge** - Facts computed by rules at query time

When you query, you see both seamlessly combined.

## Rule Syntax

A rule has two parts:

```typeql:readonly[id=inf-rule-syntax]
rule rule-name:
  when {
    # condition patterns
  } then {
    # conclusion pattern
  };
```

- **when**: Patterns that must match
- **then**: New fact to derive when conditions match

## A Simple Example

Consider transitive friendship - if Alice is friends with Bob, and Bob is friends with Carol, then Alice and Carol are connected through Bob:

```typeql:readonly[id=inf-rule-example]
define
rule transitive-friendship:
  when {
    (friend: $a, friend: $b) isa friendship;
    (friend: $b, friend: $c) isa friendship;
  } then {
    (friend: $a, friend: $c) isa friendship;
  };
```

When you query friendships, TypeDB automatically includes both direct and transitive friends.

## Why Rules Matter

Rules let you:
- **Model implicit relationships** - "ancestor" from "parent"
- **Inherit permissions** - Team members get team access
- **Classify data** - "high-risk" from criteria patterns
- **Traverse graphs** - Find all connected nodes
