---
id: tour-entities
title: Finding Entities
context: social-network
requires: [tour-welcome]
---

# Finding Entities

An **entity** is a thing in your database - a person, a company, a product. To find entities, use `match` with a variable and type:

```typeql:example[id=tour-find-people, expect=results, min=4]
match $p isa person;
```

`$p` is a **variable** - TypeDB fills it with every matching entity. `isa` means "is a".

## Try Another Type

The database also has companies:

```typeql:example[id=tour-find-companies, expect=results, min=2]
match $c isa company;
```

## Variable Names

Variables start with `$` and can be any name. Use descriptive names:

```typeql:example[id=tour-descriptive-var, expect=results, min=2]
match $company isa company;
```

`$company` is clearer than `$c` or `$x`.
