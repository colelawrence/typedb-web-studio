---
id: first-queries
title: Your First Queries
context: social-network
requires: [types-intro]
---

# Your First Queries

Now that you understand types and entities, let's write some queries! TypeQL queries use pattern matching - you describe what you're looking for, and TypeDB finds all matches.

## The Match Clause

Every query starts with `match`. You describe a pattern, and TypeDB finds all data that fits:

```typeql:example[id=find-all-people, expect=results, min=3]
match $p isa person;
```

The `$p` is a **variable** - a placeholder that TypeDB fills in with matching data. Try running this query to see all people in our social network.

## Understanding Variables

Variables always start with `$`. You can name them anything meaningful:

```typeql:example[id=find-all-companies, expect=results, min=2]
match $company isa company;
```

Notice how `$company` is more descriptive than `$c`. Good variable names make queries easier to read.

## Getting Specific: Constraints

To narrow your search, add constraints. Let's find a specific person:

```typeql:example[id=find-alice, expect=results, min=1, max=1]
match $p isa person, has name "Alice";
```

The comma means "and" - we want something that is a person AND has the name "Alice".

## Retrieving Attributes

So far we've only retrieved entities. Let's also get their attributes:

```typeql:example[id=get-names-ages, expect=results, min=4]
match $p isa person, has name $n, has age $a;
```

Now `$n` and `$a` are variables too! They'll be filled with each person's name and age.

## Filtering by Attribute Values

Combine constraints to ask more specific questions:

```typeql:example[id=find-over-30, expect=results, min=1]
match $p isa person, has name $n, has age $a; $a > 28;
```

This finds everyone older than 28.

## Common Mistakes

Here are some errors you might encounter:

**Missing `isa`** - Every variable needs a type:

```typeql:invalid[id=missing-isa, error=parse]
match $p person;
```

**Unclosed string** - Strings need matching quotes:

```typeql:invalid[id=unclosed-string, error=parse]
match $p isa person, has name "Alice;
```

## Try It Yourself

Now experiment! Try these challenges:

1. Find all companies in the database
2. Find the person named "Bob" and get their age
3. Find everyone under 30 years old

Use the query editor on the right to test your solutions.

## What's Next

You've learned to find entities by type and filter by attributes. In the next lesson, we'll explore **relations** - how entities connect to each other.
