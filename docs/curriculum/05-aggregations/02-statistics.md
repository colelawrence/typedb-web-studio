---
id: agg-statistics
title: Statistical Functions
context: social-network
requires: [agg-counting]
---

# Statistical Functions

TypeQL provides mathematical aggregation functions for numeric data.

## Sum Values

Add up all ages:

```typeql:example[id=agg-sum, expect=results, min=1, max=1]
match
  $p isa person, has age $a;
reduce $total = sum($a);
```

## Maximum and Minimum

Find the oldest person's age:

```typeql:example[id=agg-max, expect=results, min=1, max=1]
match
  $p isa person, has age $a;
reduce $oldest = max($a);
```

Find the youngest:

```typeql:example[id=agg-min, expect=results, min=1, max=1]
match
  $p isa person, has age $a;
reduce $youngest = min($a);
```

## Mean (Average)

Calculate average age:

```typeql:example[id=agg-mean, expect=results, min=1, max=1]
match
  $p isa person, has age $a;
reduce $average = mean($a);
```

## Multiple Aggregations

Compute several statistics at once:

```typeql:example[id=agg-multiple, expect=results, min=1, max=1]
match
  $p isa person, has age $a;
reduce $min = min($a), $max = max($a), $avg = mean($a);
```

This returns min, max, and average age in one query.
