---
id: exercises-relations
title: "Exercise: Querying Relations"
context: S1
requires: [exercises-filtering]
---

# Exercise: Querying Relations

These exercises practice querying across multiple entities using relations.

## Exercise 1: Find who works at a company

Find all employees and their employers.

**Expected**: 4 results (each employment relation)

```typeql:example[id=ex-rel-1, expect=results, min=4, max=4]
match (employee: $p, employer: $c) isa employment;
```

## Exercise 2: Find employees at a specific company

Find everyone who works at Acme Corp.

**Expected**: 2 results (Alice and Bob)

```typeql:example[id=ex-rel-2, expect=results, min=2, max=2]
match
  $c isa company, has name "Acme Corp";
  (employee: $p, employer: $c) isa employment;
```

## Exercise 3: Find where a specific person works

Find the company where Carol works.

**Expected**: 1 result (Globex Inc)

```typeql:example[id=ex-rel-3, expect=results, min=1, max=1]
match
  $p isa person, has name "Carol";
  (employee: $p, employer: $c) isa employment;
```

## Exercise 4: Find pairs of friends

Find all pairs of people who are friends. Note: Symmetric relations return both directions, so you'll see each friendship twice.

**Expected**: 8 results (4 friendships × 2 directions)

```typeql:example[id=ex-rel-4, expect=results, min=8, max=8]
match (friend: $a, friend: $b) isa friendship;
```

## Exercise 5: Find Alice's friends

Find all people who are friends with Alice.

**Expected**: 2 results (Bob and Carol)

```typeql:example[id=ex-rel-5, expect=results, min=2, max=2]
match
  $alice isa person, has name "Alice";
  (friend: $alice, friend: $other) isa friendship;
```
