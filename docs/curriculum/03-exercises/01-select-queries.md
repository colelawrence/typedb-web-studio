---
id: exercises-select
title: "Exercise: Finding Data"
context: S1
requires: [first-queries]
---

# Exercise: Finding Data

Complete the following exercises. Each query should return the expected results.

## Exercise 1: Find all people

Write a query to find all people in the database.

**Expected**: 4 or more results (Alice, Bob, Carol, Dan - may include duplicates from seed data)

```typeql:example[id=ex-select-1, expect=results, min=4]
match $p isa person;
```

## Exercise 2: Find all companies

Write a query to find all companies in the database.

**Expected**: 2 or more results (Acme Corp, Globex Inc)

```typeql:example[id=ex-select-2, expect=results, min=2]
match $c isa company;
```

## Exercise 3: Find a specific person

Write a query to find only Alice.

**Expected**: At least 1 result

```typeql:example[id=ex-select-3, expect=results, min=1]
match $p isa person, has name "Alice";
```

## Exercise 4: Find all friendships

Write a query to find all friendship relations in the database.

**Expected**: 4 friendships

```typeql:example[id=ex-select-4, expect=results, min=4, max=4]
match $f isa friendship;
```

## Exercise 5: Find all employment relations

Write a query to find all employment relations.

**Expected**: 4 employment relations (one for each person)

```typeql:example[id=ex-select-5, expect=results, min=4, max=4]
match $e isa employment;
```
