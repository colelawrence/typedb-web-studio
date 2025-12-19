---
id: agg-counting
title: Counting Results
context: S1
---

# Counting Results

The `reduce` clause aggregates query results into summary values.

## Count All Results

Count how many results a query returns:

```typeql:example[id=agg-count-all, expect=results, min=1, max=1]
match
  $p isa person;
reduce $count = count;
```

This returns the total number of people (4).

## Count Specific Variables

Count non-null values of a specific variable:

```typeql:example[id=agg-count-var, expect=results, min=1, max=1]
match
  $p isa person, has age $a;
reduce $count = count($a);
```

Counts how many people have an age attribute.

## Count Relations

Count all friendships in the network:

```typeql:example[id=agg-count-relations, expect=results, min=1, max=1]
match
  (friend: $a, friend: $b) isa friendship;
reduce $count = count;
```

Note: Each friendship appears twice (once for each direction).

## Count with Filtering

Count people older than 25:

```typeql:example[id=agg-count-filtered, expect=results, min=1, max=1]
match
  $p isa person, has age $a;
  $a > 25;
reduce $count = count;
```
