---
id: koans-attributes
title: About Attributes
context: social-network
requires: [koans-matching]
---

# About Attributes

*Attributes are the properties that give form to the formless.*

## Having and Being

*An entity has attributes; it does not become them.*

```typeql:example[id=koan-has-attribute, expect=results, min=1]
match $p isa person, has name "Alice";
```

Alice is found by what she has, not what she is.

## The Unnamed Attribute

*To capture an attribute's value, give it a name.*

```typeql:example[id=koan-attribute-variable, expect=results, min=4]
match $p isa person, has name $n;
```

Now `$n` holds each name in turn.

## Two Attributes

*An entity may have many attributes.*

```typeql:example[id=koan-two-attributes, expect=results, min=4]
match $p isa person, has name $n, has age $a;
```

Name and age together describe the person more fully.

## The Shortened Path

*Repeated words may be shortened.*

```typeql:example[id=koan-shorthand-has, expect=results, min=4]
match $p isa person, has name $n, has age $a;
```

Both forms speak the same truth.

## The Unquoted Fails

*Strings must wear their quotes.*

```typeql:invalid[id=koan-unquoted-string, error=parse]
match $p isa person, has name Alice;
```

Without quotes, Alice becomes an unknown variable.

## The Absent Attribute

*Seeking what does not exist yields nothing.*

```typeql:example[id=koan-missing-attribute, expect=empty]
match $p isa person, has name "Nobody";
```

No person bears this name; emptiness responds.

## Reflection

*Sit with these truths:*

- `has` connects entities to their attributes
- Variables in attributes capture values
- Strings require quotation marks
- Missing matches return empty, not error
