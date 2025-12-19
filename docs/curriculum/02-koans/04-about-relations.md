---
id: koans-relations
title: About Relations
context: S1
requires: [koans-variables]
---

# About Relations

*Relations are the invisible threads that connect all things.*

## The Connected Pair

*A relation binds entities together through roles.*

```typeql:example[id=koan-basic-relation, expect=results, min=4]
match (friend: $a, friend: $b) isa friendship;
```

Two friends emerge, bound by friendship.

## The Unnamed Role

*When the role is clear, it need not be spoken.*

```typeql:example[id=koan-roleless-relation, expect=results, min=4]
match ($a, $b) isa friendship;
```

The database infers what roles must be.

## The One-Sided Inquiry

*We may anchor one side and discover the other.*

```typeql:example[id=koan-one-sided, expect=results, min=2]
match
  $alice isa person, has name "Alice";
  (friend: $alice, friend: $other) isa friendship;
  $other has name $name;
```

From Alice, we find her friends.

## The Chain of Relations

*Relations may chain, one leading to another.*

```typeql:example[id=koan-relation-chain, expect=results, min=1]
match
  $alice isa person, has name "Alice";
  (friend: $alice, friend: $mid) isa friendship;
  $mid has name $midname;
```

From Alice, we discover who connects her to others.

## The Employment Bond

*Different relations carry different meanings.*

```typeql:example[id=koan-employment, expect=results, min=4]
match
  (employee: $p, employer: $c) isa employment;
  $p has name $person;
  $c has name $company;
```

Employment has roles: one works, one employs.

## The Missing Relation

*A relation that does not exist returns nothing.*

```typeql:example[id=koan-unconnected, expect=empty]
match
  $p isa person, has name "Alice";
  $c isa company, has name "Globex Inc";
  (employee: $p, employer: $c) isa employment;
```

Alice does not work for Globex; emptiness answers.

## Reflection

*Sit with these truths:*

- Relations connect entities through roles
- Roles can be omitted when unambiguous
- Relations can chain to traverse graphs
- Unmatched relations return empty results
