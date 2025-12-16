---
id: schema-constraints
title: Schema Constraints
context: null
requires: [schema-types]
---

# Schema Constraints

Constraints enforce data integrity at the schema level.

## Cardinality with @card

Control how many attributes an entity can have:

```typeql:readonly[id=schema-card-single]
define
attribute email value string;

# Exactly one email required
entity user owns email @card(1, 1);
```

```typeql:readonly[id=schema-card-optional]
define
attribute nickname value string;

# Zero or one nickname (optional, single)
entity user owns nickname @card(0, 1);
```

```typeql:readonly[id=schema-card-multiple]
define
attribute phone value string;

# One or more phones required
entity user owns phone @card(1..);
```

## Uniqueness with @unique

Ensure attribute values are unique across instances:

```typeql:readonly[id=schema-unique]
define
attribute email value string;
attribute username value string;

entity user 
  owns email @unique,
  owns username @unique;
```

No two users can have the same email or username.

## Key Attributes with @key

A key uniquely identifies an entity (implies @unique):

```typeql:readonly[id=schema-key]
define
attribute user-id value string;

entity user owns user-id @key;
```

## Value Constraints with @regex

Validate string format with regular expressions:

```typeql:readonly[id=schema-regex]
define
attribute email value string @regex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$");
attribute phone value string @regex("^\\+?[0-9]{10,14}$");
```

## Range Constraints

Limit numeric values:

```typeql:readonly[id=schema-range]
define
attribute age value integer @range(0, 150);
attribute percentage value double @range(0.0, 100.0);
```
