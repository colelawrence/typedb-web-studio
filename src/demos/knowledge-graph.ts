/**
 * Knowledge Graph Demo
 *
 * A knowledge graph schema demonstrating:
 * - Entity types: concept, person, organization, location, event
 * - Relation types: related-to, part-of, located-in, works-for, attended
 * - Rich semantic relationships and inheritance
 */

import type { DemoDefinition } from "./index";

export const KNOWLEDGE_GRAPH_DEMO: DemoDefinition = {
  id: "knowledge-graph",
  name: "Knowledge Graph",
  description: "Interconnected concepts and their relationships",
  icon: "network",

  schema: `
# Knowledge Graph Schema
# Semantic concepts and their relationships

# =============================================================================
# Attribute Types
# =============================================================================

define

# Identity attributes
attribute name value string;
attribute alias value string;
attribute identifier value string;

# Descriptive attributes
attribute description value string;
attribute summary value string;
attribute url value string;

# Classification attributes
attribute domain value string;
attribute type-label value string;
attribute confidence value double;

# Temporal attributes
attribute start-date value datetime;
attribute end-date value datetime;
attribute founded value datetime;
attribute birth-date value datetime;

# Location attributes
attribute country value string;
attribute city value string;
attribute coordinates value string;

# Numeric
attribute population value integer;
attribute revenue value double;
attribute employee-count value integer;

# =============================================================================
# Entity Types
# =============================================================================

# Abstract base concept
entity concept,
    abstract,
    owns name,
    owns alias,
    owns description,
    owns url,
    plays semantic-relation:subject,
    plays semantic-relation:object,
    plays part-of:part,
    plays part-of:whole;

# A person (scientist, artist, historical figure, etc.)
entity person sub concept,
    owns birth-date,
    plays employment:employee,
    plays education:student,
    plays creation:creator,
    plays event-participation:participant;

# An organization (company, university, government)
entity organization sub concept,
    owns founded,
    owns employee-count,
    owns revenue,
    plays employment:employer,
    plays education:institution,
    plays headquartered:organization,
    plays event-participation:host;

# A geographic location
entity location sub concept,
    owns country,
    owns city,
    owns coordinates,
    owns population,
    plays located-in:inner,
    plays located-in:outer,
    plays headquartered:location,
    plays event-location:venue;

# A historical or scheduled event
entity event sub concept,
    owns start-date,
    owns end-date,
    plays event-location:event,
    plays event-participation:event;

# A scientific or technical field
entity field sub concept,
    owns domain,
    plays specialization:general,
    plays specialization:specific,
    plays expertise:field;

# A creative work (book, paper, artwork)
entity work sub concept,
    owns identifier,
    plays creation:work,
    plays citation:citing,
    plays citation:cited;

# An abstract idea or theory
entity theory sub concept,
    plays influences:influencer,
    plays influences:influenced,
    plays expertise:field;

# =============================================================================
# Relation Types
# =============================================================================

# Generic semantic relation between concepts
relation semantic-relation,
    owns type-label,
    owns confidence,
    relates subject,
    relates object;

# Part-whole relationships
relation part-of,
    relates part,
    relates whole;

# Geographic containment
relation located-in,
    relates inner,
    relates outer;

# Organization headquarters
relation headquartered,
    relates organization,
    relates location;

# Employment relationship
relation employment,
    owns start-date,
    owns end-date,
    relates employee,
    relates employer;

# Educational relationship
relation education,
    owns start-date,
    owns end-date,
    owns description,
    relates student,
    relates institution;

# Creation/authorship
relation creation,
    owns start-date,
    relates creator,
    relates work;

# Academic citations
relation citation,
    relates citing,
    relates cited;

# Field specialization hierarchy
relation specialization,
    relates general,
    relates specific;

# Person's expertise in a field
relation expertise,
    owns confidence,
    relates person,
    relates field;

# Theoretical influences
relation influences,
    owns description,
    relates influencer,
    relates influenced;

# Event location
relation event-location,
    relates event,
    relates venue;

# Event participation
relation event-participation,
    relates participant,
    relates event,
    relates host;
`,

  sampleData: `
insert $cs isa field, has name "Computer Science", has description "The study of computation and information", has domain "Science";

insert $ai isa field, has name "Artificial Intelligence", has description "The study of intelligent agents", has domain "Computer Science";

insert $ml isa field, has name "Machine Learning", has description "Systems that learn from data", has domain "Computer Science";

insert $db isa field, has name "Database Systems", has description "Storage and retrieval of data", has domain "Computer Science";

insert $kg isa field, has name "Knowledge Graphs", has description "Graph-structured knowledge bases", has domain "Computer Science";

insert $math isa field, has name "Mathematics", has description "The study of numbers and structures", has domain "Science";

insert $cs isa field, has name "Computer Science"; $ai isa field, has name "Artificial Intelligence"; (general: $cs, specific: $ai) isa specialization;

insert $ai isa field, has name "Artificial Intelligence"; $ml isa field, has name "Machine Learning"; (general: $ai, specific: $ml) isa specialization;

insert $cs isa field, has name "Computer Science"; $db isa field, has name "Database Systems"; (general: $cs, specific: $db) isa specialization;

insert $db isa field, has name "Database Systems"; $kg isa field, has name "Knowledge Graphs"; (general: $db, specific: $kg) isa specialization;

insert $usa isa location, has name "United States", has country "USA", has population 331000000;

insert $uk isa location, has name "United Kingdom", has country "UK", has population 67000000;

insert $california isa location, has name "California", has country "USA", has population 39500000;

insert $london isa location, has name "London", has country "UK", has city "London", has population 8982000;

insert $california isa location, has name "California"; $usa isa location, has name "United States"; (inner: $california, outer: $usa) isa located-in;

insert $london isa location, has name "London"; $uk isa location, has name "United Kingdom"; (inner: $london, outer: $uk) isa located-in;

insert $mit isa organization, has name "Massachusetts Institute of Technology", has alias "MIT", has description "Private research university", has founded 1861-04-10T00:00:00, has employee-count 12000;

insert $stanford isa organization, has name "Stanford University", has description "Private research university in California", has founded 1885-11-11T00:00:00, has employee-count 15000;

insert $google isa organization, has name "Google", has alias "Alphabet", has description "Multinational technology company", has founded 1998-09-04T00:00:00, has employee-count 180000, has revenue 282000000000.0;

insert $deepmind isa organization, has name "DeepMind", has description "AI research laboratory", has founded 2010-09-23T00:00:00, has employee-count 1000;

insert $google isa organization, has name "Google"; $california isa location, has name "California"; (organization: $google, location: $california) isa headquartered;

insert $deepmind isa organization, has name "DeepMind"; $london isa location, has name "London"; (organization: $deepmind, location: $london) isa headquartered;

insert $deepmind isa organization, has name "DeepMind"; $google isa organization, has name "Google"; (part: $deepmind, whole: $google) isa part-of;

insert $turing isa person, has name "Alan Turing", has description "Pioneer of theoretical computer science and AI", has birth-date 1912-06-23T00:00:00;

insert $hinton isa person, has name "Geoffrey Hinton", has alias "Godfather of AI", has description "Pioneer of deep learning and neural networks";

insert $lecun isa person, has name "Yann LeCun", has description "Pioneer of convolutional neural networks";

insert $page isa person, has name "Larry Page", has description "Co-founder of Google";

insert $hinton isa person, has name "Geoffrey Hinton"; $google isa organization, has name "Google"; (employee: $hinton, employer: $google) isa employment, has start-date 2013-03-12T00:00:00;

insert $turing isa person, has name "Alan Turing"; $cs isa field, has name "Computer Science"; (person: $turing, field: $cs) isa expertise, has confidence 1.0;

insert $turing isa person, has name "Alan Turing"; $ai isa field, has name "Artificial Intelligence"; (person: $turing, field: $ai) isa expertise, has confidence 1.0;

insert $hinton isa person, has name "Geoffrey Hinton"; $ml isa field, has name "Machine Learning"; (person: $hinton, field: $ml) isa expertise, has confidence 1.0;

insert $lecun isa person, has name "Yann LeCun"; $ml isa field, has name "Machine Learning"; (person: $lecun, field: $ml) isa expertise, has confidence 1.0;

insert $turing_machine isa theory, has name "Turing Machine", has description "Abstract mathematical model of computation";

insert $backpropagation isa theory, has name "Backpropagation", has description "Algorithm for training neural networks";

insert $transformer isa theory, has name "Transformer Architecture", has description "Neural network architecture using self-attention";

insert $computing_machinery isa work, has name "Computing Machinery and Intelligence", has description "Turings seminal paper proposing the Turing Test", has identifier "10.1093/mind/LIX.236.433";

insert $imagenet isa work, has name "ImageNet Classification with Deep CNNs", has description "AlexNet paper that revolutionized computer vision", has identifier "NIPS-2012";

insert $attention_paper isa work, has name "Attention Is All You Need", has description "Paper introducing the Transformer architecture", has identifier "arXiv:1706.03762";

insert $turing isa person, has name "Alan Turing"; $computing_machinery isa work, has name "Computing Machinery and Intelligence"; (creator: $turing, work: $computing_machinery) isa creation, has start-date 1950-01-01T00:00:00;

insert $hinton isa person, has name "Geoffrey Hinton"; $imagenet isa work, has name "ImageNet Classification with Deep CNNs"; (creator: $hinton, work: $imagenet) isa creation, has start-date 2012-01-01T00:00:00;

insert $imagenet isa work, has identifier "NIPS-2012"; $computing_machinery isa work, has identifier "10.1093/mind/LIX.236.433"; (citing: $imagenet, cited: $computing_machinery) isa citation;

insert $attention_paper isa work, has identifier "arXiv:1706.03762"; $imagenet isa work, has identifier "NIPS-2012"; (citing: $attention_paper, cited: $imagenet) isa citation;
`,

  exampleQueries: [
    {
      name: "All Concepts",
      description: "Browse all concepts in the knowledge graph",
      query: `match $c isa concept;
fetch {
    "name": $c.name,
    "description": $c.description
};`,
    },
    {
      name: "People and Expertise",
      description: "Find people and their areas of expertise",
      query: `match
$person isa person;
(person: $person, field: $field) isa expertise, has confidence $conf;
$conf > 0.8;
fetch {
    "person": $person.name,
    "field": $field.name,
    "confidence": $conf
};`,
    },
    {
      name: "Organization Locations",
      description: "Where are organizations headquartered",
      query: `match
$org isa organization;
(organization: $org, location: $loc) isa headquartered;
fetch {
    "organization": $org.name,
    "location": $loc.name,
    "country": $loc.country
};`,
    },
    {
      name: "Education History",
      description: "Who studied where",
      query: `match
(student: $person, institution: $uni) isa education, has description $degree;
fetch {
    "person": $person.name,
    "university": $uni.name,
    "degree": $degree
};`,
    },
    {
      name: "Field Hierarchy",
      description: "Explore specialization relationships",
      query: `match
(general: $parent, specific: $child) isa specialization;
fetch {
    "general_field": $parent.name,
    "specialization": $child.name
};`,
    },
    {
      name: "Citation Network",
      description: "How papers cite each other",
      query: `match
(citing: $paper1, cited: $paper2) isa citation;
fetch {
    "citing_paper": $paper1.name,
    "cites": $paper2.name
};`,
    },
    {
      name: "Full Knowledge Graph",
      description: "Explore all relationships",
      query: `match
$concept isa concept;
{
    ($concept, $other) isa semantic-relation;
} or {
    (part: $concept, whole: $other) isa part-of;
} or {
    (inner: $concept, outer: $other) isa located-in;
};
limit 30;`,
    },
  ],
};
