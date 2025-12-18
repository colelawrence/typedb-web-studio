---
id: schema-types
title: Defining Types
context: null
---

# Defining Types

TypeDB schemas define the structure of your knowledge graph with types.

## The Three Type Kinds

TypeDB has three fundamental type kinds:

1. **entity** - Things that exist (person, company, document)
2. **relation** - Connections between things (friendship, employment)
3. **attribute** - Properties/values (name, age, date)

## Defining Attributes

Attributes store values. Define them first since entities use them:

```typeql:schema[id=schema-attr-string]
define
  attribute name, value string;
  attribute email, value string;
  attribute description, value string;
```

Attributes have value types: `string`, `integer`, `double`, `boolean`, `datetime`, `date`.

```typeql:schema[id=schema-attr-numeric]
define
  attribute age, value integer;
  attribute price, value double;
  attribute active, value boolean;
```

## Defining Entities

Entities own attributes and play roles in relations:

```typeql:schema[id=schema-entity-basic]
define
  attribute name, value string;
  attribute age, value integer;

  entity person,
    owns name,
    owns age;
```

Multiple entities can own the same attribute type:

```typeql:schema[id=schema-entity-shared-attr]
define
  attribute name, value string;

  entity person, owns name;
  entity company, owns name;
  entity product, owns name;
```

## Defining Relations

Relations connect entities through roles:

```typeql:schema[id=schema-relation]
define
  relation employment,
    relates employee,
    relates employer;

  entity person, plays employment:employee;
  entity company, plays employment:employer;
```

Relations can own attributes too:

```typeql:schema[id=schema-relation-attr]
define
  attribute start-date, value datetime;
  attribute salary, value double;

  relation employment,
    relates employee,
    relates employer,
    owns start-date,
    owns salary;
```
