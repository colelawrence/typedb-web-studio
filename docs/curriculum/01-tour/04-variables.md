---
id: tour-variables
title: Using Variables
context: social-network
requires: [tour-attributes]
---

# Using Variables

Variables bind to values TypeDB finds. Every `$name` in a query refers to the same thing.

## Binding Attributes

Capture attribute values with variables:

```typeql:example[id=tour-bind-attrs, expect=results, min=4]
match $p isa person, has name $n, has age $a;
```

Each result row shows a person with their name and age bound to `$n` and `$a`.

## Variables Must Be Bound

Every variable needs something to bind to. This fails:

```typeql:invalid[id=tour-unbound-var, error=unbound]
match $p isa person; $x > 10;
```

`$x` isn't connected to anything.

## Filtering Bound Values

Once bound, use variables in comparisons:

```typeql:example[id=tour-bound-comparison, expect=results, min=1]
match $p isa person, has age $a; $a >= 30;
```

Finds people 30 or older.
