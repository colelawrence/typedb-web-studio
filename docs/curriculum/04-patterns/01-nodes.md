---
id: patterns-nodes
title: Nodes in the Graph
context: S1
requires: []
---

# Nodes in the Graph

In a knowledge graph, **entities are nodes**. Each person, company, or thing is a point in your graph that can connect to others.

```
    (Alice)        (Bob)        (Carol)        (Dan)
       ●            ●             ●             ●
    person       person        person        person


  (Acme Corp)              (Globex Inc)
       ●                        ●
   company                  company
```

## Finding All Nodes of a Type

To find all nodes of type `person`:

```typeql:example[id=patterns-nodes-people, expect=results, min=4]
match $node isa person;
```

Each result is a node in your graph—a person that can have attributes and connections.

## Nodes Have Identity

Every node has a unique identity, separate from its attributes. Two people can have the same name but be different nodes:

```typeql:example[id=patterns-nodes-companies, expect=results, min=2]
match $node isa company;
```

## Nodes Carry Data

Nodes hold attributes—properties attached to that specific point in the graph:

```
         (Alice)
            ●
           /|\
          / | \
     name  age  ...
    "Alice" 30
```

To see the data a node carries:

```typeql:example[id=patterns-nodes-with-attrs, expect=results, min=4]
match $node isa person, has name $name, has age $age;
```

## Finding Specific Nodes

Locate a particular node by its attributes:

```typeql:example[id=patterns-nodes-specific, expect=results, min=1]
match $node isa person, has name "Alice";
```

## Node Types Create Structure

Your schema defines what types of nodes exist. This social network has two node types:

- `person` - People in the network
- `company` - Organizations where people work

Each type can have different attributes and participate in different relationships.

## Thinking in Nodes

When analyzing data, start by identifying your nodes:

1. What **things** exist in your domain?
2. What **attributes** describe each thing?
3. How might these things **connect**?

In the next lesson, we'll explore those connections—the edges that link nodes together.
