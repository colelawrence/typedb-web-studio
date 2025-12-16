---
id: tour-attributes
title: Filtering by Attributes
context: social-network
requires: [tour-entities]
---

# Filtering by Attributes

Entities have **attributes** - properties like name, age, or title. Use `has` to filter:

```typeql:example[id=tour-find-alice, expect=results, min=1]
match $p isa person, has name "Alice";
```

The comma means "and". This finds entities that are persons AND have the name "Alice".

## Comparing Values

Use comparison operators on attributes:

```typeql:example[id=tour-age-filter, expect=results, min=2]
match $p isa person, has age $a; $a > 27;
```

This finds people older than 27.

## Multiple Constraints

Combine constraints to narrow results:

```typeql:example[id=tour-young-people, expect=results, min=1]
match $p isa person, has name $n, has age $a; $a < 28;
```

Finds people under 28 and retrieves their names.
