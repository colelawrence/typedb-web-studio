---
id: schema-modeling
title: Schema Design Patterns
context: null
requires: [schema-constraints]
---

# Schema Design Patterns

Good schema design makes queries natural and data integrity automatic.

## Pattern: Symmetric Relations

For symmetric relations like friendship, use the same role twice:

```typeql:schema[id=schema-symmetric]
define
  attribute name, value string;

  relation friendship, relates friend;

  entity person, owns name, plays friendship:friend;
```

Insert friendships naturally:

```typeql:data[id=schema-symmetric-insert]
insert
  $a isa person, has name "Alice";
  $b isa person, has name "Bob";
  (friend: $a, friend: $b) isa friendship;
```

## Pattern: Timestamped Relations

Track when relationships were created:

```typeql:schema[id=schema-timestamped]
define
  attribute created-at, value datetime;
  attribute ended-at, value datetime;

  relation employment,
    relates employee,
    relates employer,
    owns created-at,
    owns ended-at;
```

## Pattern: N-ary Relations

Relations can have more than two roles:

```typeql:schema[id=schema-ternary]
define
  attribute amount, value double;
  attribute purchase-date, value datetime;
  attribute product-name, value string;

  relation purchase,
    relates buyer,
    relates seller,
    relates item,
    owns amount,
    owns purchase-date;

  entity person, plays purchase:buyer, plays purchase:seller;
  entity product, owns product-name, plays purchase:item;
```

## Pattern: Hierarchical Types

Use role specialization for hierarchies:

```typeql:schema[id=schema-hierarchy]
define
  attribute person-name, value string;

  relation parenthood, relates parent, relates child;

  entity person,
    owns person-name,
    plays parenthood:parent,
    plays parenthood:child;
```

## Pattern: Self-Referential Relations

Entities can play multiple roles in the same relation type:

```typeql:schema[id=schema-self-ref]
define
  attribute employee-name, value string;

  relation management, relates manager, relates report;

  entity employee,
    owns employee-name,
    plays management:manager,
    plays management:report;
```

## Complete Example: Social Network

```typeql:schema[id=schema-complete]
define
  # Attributes first
  attribute name, value string;
  attribute age, value integer;
  attribute founded-year, value integer;
  attribute start-date, value datetime;

  # Entities with attributes
  entity person,
    owns name,
    owns age,
    plays friendship:friend,
    plays employment:employee;

  entity company,
    owns name,
    owns founded-year,
    plays employment:employer;

  # Relations
  relation friendship, relates friend;
  relation employment,
    relates employee,
    relates employer,
    owns start-date;
```

This schema enables rich queries about people, companies, and their relationships.
