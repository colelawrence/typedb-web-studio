---
id: exercises-aggregates
title: "Exercise: Combining Patterns"
context: social-network
requires: [exercises-relations]
---

# Exercise: Combining Patterns

These exercises practice combining multiple constraints and patterns.

## Exercise 1: Find employees with their names

Get the names of all employees along with their company names.

**Expected**: 4 results

```typeql:example[id=ex-agg-1, expect=results, min=4, max=4]
match
  $p isa person, has name $pname;
  $c isa company, has name $cname;
  (employee: $p, employer: $c) isa employment;
```

## Exercise 2: Find people at Acme with ages

Find all employees at Acme Corp and get their ages.

**Expected**: 2 results (Alice and Bob)

```typeql:example[id=ex-agg-2, expect=results, min=2, max=2]
match
  $c isa company, has name "Acme Corp";
  $p isa person, has age $a;
  (employee: $p, employer: $c) isa employment;
```

## Exercise 3: Find friends at same company

Find pairs of friends who work at the same company.

**Expected**: At least 1 result

```typeql:example[id=ex-agg-3, expect=results, min=1]
match
  $c isa company;
  $a isa person;
  $b isa person;
  (friend: $a, friend: $b) isa friendship;
  (employee: $a, employer: $c) isa employment;
  (employee: $b, employer: $c) isa employment;
```

## Exercise 4: Find all employed people with ages

Find everyone who has a job and include their age.

**Expected**: 4 results (all employees)

```typeql:example[id=ex-agg-4, expect=results, min=4, max=4]
match
  $p isa person, has age $a;
  (employee: $p, employer: $c) isa employment;
```

## Exercise 5: Find employment with start dates

Find all employments that started in 2020 or earlier.

**Expected**: 2 results (Alice 2020-01-15, Carol 2019-03-20)

```typeql:example[id=ex-agg-5, expect=results, min=2, max=2]
match
  (employee: $p, employer: $c) isa employment, has start-date $d;
  $d < 2021-01-01;
```
