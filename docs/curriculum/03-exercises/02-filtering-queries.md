---
id: exercises-filtering
title: "Exercise: Filtering Data"
context: social-network
requires: [exercises-select]
---

# Exercise: Filtering Data

These exercises practice filtering data using attribute constraints.

## Exercise 1: Find people by name

Find the person named "Bob".

**Expected**: At least 1 result

```typeql:example[id=ex-filter-1, expect=results, min=1]
match $p isa person, has name "Bob";
```

## Exercise 2: Filter by age (greater than)

Find all people older than 27.

**Expected**: 3 results (Alice=30, Carol=35, Dan=28)

```typeql:example[id=ex-filter-2, expect=results, min=3, max=3]
match $p isa person, has age $a; $a > 27;
```

## Exercise 3: Filter by age (less than)

Find all people younger than 30.

**Expected**: 2 results (Bob=25, Dan=28)

```typeql:example[id=ex-filter-3, expect=results, min=2, max=2]
match $p isa person, has age $a; $a < 30;
```

## Exercise 4: Filter by age range

Find people between 26 and 32 years old (inclusive).

**Expected**: 2 results (Alice=30, Dan=28)

```typeql:example[id=ex-filter-4, expect=results, min=2, max=2]
match $p isa person, has age $a; $a >= 26; $a <= 32;
```

## Exercise 5: Find companies founded after 2012

Find companies founded after 2012.

**Expected**: 1 result (Globex Inc, founded 2015)

```typeql:example[id=ex-filter-5, expect=results, min=1, max=1]
match $c isa company, has founded-year $y; $y > 2012;
```
