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

```typeql:schema[id=schema-card-single]
define
  attribute email, value string;

  # Exactly one email required
  entity user, owns email @card(1..1);
```

```typeql:schema[id=schema-card-optional]
define
  attribute nickname, value string;

  # Zero or one nickname (optional, single)
  entity user, owns nickname @card(0..1);
```

```typeql:schema[id=schema-card-multiple]
define
  attribute phone, value string;

  # One or more phones required
  entity user, owns phone @card(1..);
```

## Uniqueness with @unique

Ensure attribute values are unique across instances:

```typeql:schema[id=schema-unique]
define
  attribute email, value string;
  attribute username, value string;

  entity user,
    owns email @unique,
    owns username @unique;
```

No two users can have the same email or username.

## Key Attributes with @key

A key uniquely identifies an entity (implies @unique and @card(1..1)):

```typeql:schema[id=schema-key]
define
  attribute user-id, value string;

  entity user, owns user-id @key;
```

## Value Constraints with @regex

Validate string format with regular expressions:

```typeql:schema[id=schema-regex]
define
  attribute email, value string @regex(".*@.*[.].*");
  attribute phone, value string @regex("[+]?[0-9]{10,14}");
```

Note: Use character classes like `[.]` for literal dots, not backslash escapes.

## Range Constraints

Limit numeric values:

```typeql:schema[id=schema-range]
define
  attribute age, value integer @range(0..150);
  attribute percentage, value double @range(0.0..100.0);
```
