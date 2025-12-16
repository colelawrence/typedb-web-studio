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

```typeql:readonly[id=schema-symmetric]
define
relation friendship relates friend;

entity person plays friendship:friend;
```

Insert friendships naturally:

```typeql:readonly[id=schema-symmetric-insert]
insert
  $a isa person, has name "Alice";
  $b isa person, has name "Bob";
  (friend: $a, friend: $b) isa friendship;
```

## Pattern: Timestamped Relations

Track when relationships were created:

```typeql:readonly[id=schema-timestamped]
define
attribute created-at value datetime;
attribute ended-at value datetime;

relation employment 
  relates employee, relates employer,
  owns created-at, owns ended-at;
```

## Pattern: N-ary Relations

Relations can have more than two roles:

```typeql:readonly[id=schema-ternary]
define
relation purchase
  relates buyer,
  relates seller,
  relates product,
  owns amount,
  owns purchase-date;

entity person plays purchase:buyer, plays purchase:seller;
entity product plays purchase:product;
```

## Pattern: Hierarchical Types

Use role specialization for hierarchies:

```typeql:readonly[id=schema-hierarchy]
define
relation parenthood relates parent, relates child;

entity person 
  plays parenthood:parent,
  plays parenthood:child;
```

## Pattern: Self-Referential Relations

Entities can play multiple roles in the same relation type:

```typeql:readonly[id=schema-self-ref]
define
relation management relates manager, relates report;

entity employee 
  plays management:manager,
  plays management:report;
```

## Complete Example: Social Network

```typeql:readonly[id=schema-complete]
define
# Attributes first
attribute name value string;
attribute age value integer;
attribute founded-year value integer;
attribute start-date value datetime;

# Entities with attributes
entity person owns name, owns age,
  plays friendship:friend,
  plays employment:employee;

entity company owns name, owns founded-year,
  plays employment:employer;

# Relations
relation friendship relates friend;
relation employment 
  relates employee, relates employer,
  owns start-date;
```

This schema enables rich queries about people, companies, and their relationships.
