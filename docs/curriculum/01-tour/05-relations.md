---
id: tour-relations
title: Querying Relations
context: social-network
requires: [tour-variables]
---

# Querying Relations

**Relations** connect entities. An `employment` relation connects a person (employee) to a company (employer).

## Finding Related Entities

Query relations with role names:

```typeql:example[id=tour-employment, expect=results, min=1]
match
  (employee: $person, employer: $company) isa employment;
  $person has name $pn;
  $company has name $cn;
```

The parentheses define a **link** - they specify role players in a relation.

## Binding the Relation

If you need the relation itself, bind it to a variable:

```typeql:example[id=tour-bind-relation, expect=results, min=1]
match
  $emp (employee: $person, employer: $company) isa employment;
  $person has name $pn;
  $company has name $cn;
```

Now `$emp` refers to the employment relation instance.

## Next Steps

You've learned the basics of TypeQL:
- `match` to find data
- `isa` to specify types
- `has` to filter by attributes
- Variables to bind and compare values
- Relations to query connections

Explore more lessons to learn about inserting data, defining schemas, and advanced queries.
