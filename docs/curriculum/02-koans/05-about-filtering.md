---
id: koans-filtering
title: About Filtering
context: social-network
requires: [koans-relations]
---

# About Filtering

*To see clearly, we must learn to exclude.*

## The Greater Path

*Numbers may be compared.*

```typeql:example[id=koan-greater-than, expect=results, min=2]
match
  $p isa person, has age $a;
  $a > 28;
```

Those older than 28 are revealed.

## The Lesser Path

*The other direction beckons.*

```typeql:example[id=koan-less-than, expect=results, min=2]
match
  $p isa person, has age $a;
  $a < 30;
```

Youth emerges from constraint.

## The Equal Ground

*Exact matches require exact values.*

```typeql:example[id=koan-exact-match, expect=results, min=1, max=1]
match
  $p isa person, has age $a;
  $a == 30;
```

Only one person stands at thirty.

## The Range

*Between two bounds lies a range.*

```typeql:example[id=koan-range, expect=results, min=2]
match
  $p isa person, has age $a;
  $a >= 25;
  $a <= 30;
```

Within the range, we find our answers.

## The Negation

*What is not can be as important as what is.*

```typeql:example[id=koan-negation, expect=results, min=2]
match
  $p isa person, has name $n;
  not { $p has age 30; };
```

All except those who are thirty.

## The String Contains

*Strings may be searched within.*

```typeql:example[id=koan-string-contains, expect=results, min=1]
match
  $c isa company, has name $n;
  $n contains "Corp";
```

Names containing the fragment emerge.

## The Combined Filter

*Filters may be combined freely.*

```typeql:example[id=koan-combined, expect=results, min=1]
match
  $p isa person, has name $n, has age $a;
  $a > 25;
  $a < 32;
  not { $n == "Dan"; };
```

Multiple constraints narrow the truth.

## The Impossible Filter

*Contradictions yield nothing.*

```typeql:example[id=koan-impossible, expect=empty]
match
  $p isa person, has age $a;
  $a > 100;
```

No centenarians walk among us.

## Reflection

*Sit with these truths:*

- `>`, `<`, `>=`, `<=`, `==` compare values
- `not { ... }` excludes matching patterns
- `contains` searches within strings
- Impossible constraints return emptiness
