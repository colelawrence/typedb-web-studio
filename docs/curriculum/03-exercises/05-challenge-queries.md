---
id: exercises-challenge
title: "Exercise: Challenge Queries"
context: social-network
requires: [exercises-aggregates]
---

# Exercise: Challenge Queries

These advanced exercises combine multiple concepts. Take your time!

## Challenge 1: Friends of friends

Find Alice's friends' friends (people who are 2 hops from Alice).

**Expected**: At least 1 result

```typeql:example[id=ex-challenge-1, expect=results, min=1]
match
  $alice isa person, has name "Alice";
  (friend: $alice, friend: $friend) isa friendship;
  (friend: $friend, friend: $fof) isa friendship;
```

## Challenge 2: Find friends' employers

Find which companies Alice's friends work at.

**Expected**: At least 2 results

```typeql:example[id=ex-challenge-2, expect=results, min=2]
match
  $alice isa person, has name "Alice";
  (friend: $alice, friend: $friend) isa friendship;
  (employee: $friend, employer: $c) isa employment;
  $c has name $cname;
```

## Challenge 3: Recent hires at Acme

Find employees at Acme Corp who started in 2021 or later.

**Expected**: 1 result (Bob, started 2021-06-01)

```typeql:example[id=ex-challenge-3, expect=results, min=1, max=1]
match
  $c isa company, has name "Acme Corp";
  (employee: $p, employer: $c) isa employment, has start-date $d;
  $d >= 2021-01-01;
```

## Challenge 4: Find senior employees with their companies

Find everyone over 30 with their employer information.

**Expected**: At least 1 result (Carol, age 35 at Globex)

```typeql:example[id=ex-challenge-4, expect=results, min=1]
match
  $p isa person, has age $a, has name $pname;
  $c isa company, has name $cname;
  (employee: $p, employer: $c) isa employment;
  $a > 30;
```

## Challenge 5: Employee details with all attributes

Find all employees with their names, ages, company names, and start dates.

**Expected**: 4 results (one for each employment)

```typeql:example[id=ex-challenge-5, expect=results, min=4, max=4]
match
  $p isa person, has name $pname, has age $age;
  $c isa company, has name $cname;
  (employee: $p, employer: $c) isa employment, has start-date $d;
```
