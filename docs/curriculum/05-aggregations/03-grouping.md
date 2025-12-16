---
id: agg-grouping
title: Grouping Results
context: social-network
requires: [agg-statistics]
---

# Grouping Results

The `groupby` clause groups results before aggregation, like SQL's GROUP BY.

## Count by Group

Count employees per company:

```typeql:example[id=agg-group-count, expect=results, min=2]
match
  $c isa company, has name $cname;
  (employee: $p, employer: $c) isa employment;
reduce $count = count groupby $cname;
```

This returns the employee count for each company.

## Statistics by Group

Calculate average age of employees per company:

```typeql:example[id=agg-group-avg, expect=results, min=2]
match
  $c isa company, has name $cname;
  (employee: $p, employer: $c) isa employment;
  $p has age $a;
reduce $avg_age = mean($a) groupby $cname;
```

## Multiple Group Keys

Group by multiple variables - count friendships per person:

```typeql:example[id=agg-group-multi, expect=results, min=1]
match
  $p isa person, has name $name;
  (friend: $p, friend: $other) isa friendship;
reduce $friend_count = count($other) groupby $name;
```

## Group with Multiple Aggregates

Get min and max age per company:

```typeql:example[id=agg-group-multi-agg, expect=results, min=2]
match
  $c isa company, has name $cname;
  (employee: $p, employer: $c) isa employment;
  $p has age $a;
reduce $min = min($a), $max = max($a) groupby $cname;
```
