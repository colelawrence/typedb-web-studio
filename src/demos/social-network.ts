/**
 * Social Network Demo
 *
 * A social network schema demonstrating:
 * - Entity types: person, post, comment
 * - Relation types: friendship, authorship, likes, follows
 * - Attribute types: name, email, content, timestamp
 */

import type { DemoDefinition } from "./index";

export const SOCIAL_NETWORK_DEMO: DemoDefinition = {
  id: "social-network",
  name: "Social Network",
  description: "Explore relationships between people, posts, and interactions",
  icon: "users",

  schema: `
# Social Network Schema
# Demonstrates entities, relations, and attributes

# =============================================================================
# Attribute Types
# =============================================================================

define

# Person attributes
attribute name value string;
attribute email value string;
attribute username value string;
attribute bio value string;
attribute join-date value datetime;

# Content attributes
attribute content value string;
attribute created-at value datetime;
attribute updated-at value datetime;
attribute title value string;

# Engagement attributes
attribute like-count value integer;
attribute view-count value integer;

# =============================================================================
# Entity Types
# =============================================================================

# A person in the social network
entity person,
    owns name,
    owns email @unique,
    owns username @unique,
    owns bio,
    owns join-date,
    plays friendship:friend,
    plays follows:follower,
    plays follows:followed,
    plays authorship:author,
    plays likes:liker,
    plays comment-reply:commenter;

# A post created by a person
entity post,
    owns title,
    owns content,
    owns created-at,
    owns updated-at,
    owns like-count,
    owns view-count,
    plays authorship:creation,
    plays likes:liked,
    plays comment-thread:parent;

# A comment on a post
entity comment,
    owns content,
    owns created-at,
    plays comment-thread:reply,
    plays comment-reply:comment,
    plays likes:liked;

# =============================================================================
# Relation Types
# =============================================================================

# Friendship between two people (symmetric)
relation friendship,
    relates friend;

# One person follows another (asymmetric)
relation follows,
    owns created-at,
    relates follower,
    relates followed;

# Authorship of posts
relation authorship,
    relates author,
    relates creation;

# Likes on posts or comments
relation likes,
    owns created-at,
    relates liker,
    relates liked;

# Comments on posts
relation comment-thread,
    relates parent,
    relates reply;

# Who wrote a comment
relation comment-reply,
    relates commenter,
    relates comment;
`,

  sampleData: `
# =============================================================================
# People
# =============================================================================
insert $alice isa person, has name "Alice Chen", has email "alice@example.com", has username "alice_chen", has bio "Software engineer. Coffee enthusiast.", has join-date 2023-01-15T10:30:00;

insert $bob isa person, has name "Bob Smith", has email "bob@example.com", has username "bobsmith", has bio "Product designer at TechCorp", has join-date 2023-02-20T14:15:00;

insert $carol isa person, has name "Carol Williams", has email "carol@example.com", has username "carolw", has bio "Data scientist | ML researcher", has join-date 2023-03-10T09:00:00;

insert $david isa person, has name "David Lee", has email "david@example.com", has username "davidlee", has bio "Full-stack developer. Open source contributor.", has join-date 2023-04-05T16:45:00;

insert $emma isa person, has name "Emma Johnson", has email "emma@example.com", has username "emmaj", has bio "UX researcher. Dog lover.", has join-date 2023-05-12T11:20:00;

# =============================================================================
# Friendships (using match-insert to link existing people)
# =============================================================================
match $alice isa person, has email "alice@example.com"; $bob isa person, has email "bob@example.com"; insert (friend: $alice, friend: $bob) isa friendship;

match $alice isa person, has email "alice@example.com"; $carol isa person, has email "carol@example.com"; insert (friend: $alice, friend: $carol) isa friendship;

match $bob isa person, has email "bob@example.com"; $david isa person, has email "david@example.com"; insert (friend: $bob, friend: $david) isa friendship;

match $carol isa person, has email "carol@example.com"; $emma isa person, has email "emma@example.com"; insert (friend: $carol, friend: $emma) isa friendship;

match $david isa person, has email "david@example.com"; $emma isa person, has email "emma@example.com"; insert (friend: $david, friend: $emma) isa friendship;

# =============================================================================
# Follows (using match-insert)
# =============================================================================
match $alice isa person, has email "alice@example.com"; $carol isa person, has email "carol@example.com"; insert (follower: $alice, followed: $carol) isa follows, has created-at 2023-06-01T10:00:00;

match $bob isa person, has email "bob@example.com"; $alice isa person, has email "alice@example.com"; insert (follower: $bob, followed: $alice) isa follows, has created-at 2023-06-02T11:00:00;

# =============================================================================
# Posts
# =============================================================================
insert $post1 isa post, has title "Getting Started with TypeDB", has content "Just discovered TypeDB and its amazing for modeling complex relationships!", has created-at 2023-07-01T10:00:00, has like-count 15, has view-count 230;

insert $post2 isa post, has title "Design Systems in 2024", has content "Heres my approach to building scalable design systems for large organizations.", has created-at 2023-07-05T14:30:00, has like-count 42, has view-count 890;

insert $post3 isa post, has title "Machine Learning Pipeline Tips", has content "5 things I wish I knew before building my first ML pipeline in production.", has created-at 2023-07-10T09:15:00, has like-count 67, has view-count 1200;

insert $post4 isa post, has title "Open Source Contribution Guide", has content "A beginners guide to making your first open source contribution.", has created-at 2023-07-15T16:00:00, has like-count 89, has view-count 2100;

# =============================================================================
# Authorship (using match-insert)
# =============================================================================
match $alice isa person, has email "alice@example.com"; $post1 isa post, has title "Getting Started with TypeDB"; insert (author: $alice, creation: $post1) isa authorship;

match $bob isa person, has email "bob@example.com"; $post2 isa post, has title "Design Systems in 2024"; insert (author: $bob, creation: $post2) isa authorship;

match $carol isa person, has email "carol@example.com"; $post3 isa post, has title "Machine Learning Pipeline Tips"; insert (author: $carol, creation: $post3) isa authorship;

match $david isa person, has email "david@example.com"; $post4 isa post, has title "Open Source Contribution Guide"; insert (author: $david, creation: $post4) isa authorship;

# =============================================================================
# Comments
# =============================================================================
insert $comment1 isa comment, has content "Great introduction! TypeDBs type inference is powerful.", has created-at 2023-07-01T12:00:00;

insert $comment2 isa comment, has content "Would love to see more examples with relations.", has created-at 2023-07-01T14:30:00;

# =============================================================================
# Comment threads (using match-insert)
# =============================================================================
match $post1 isa post, has title "Getting Started with TypeDB"; $comment1 isa comment, has content "Great introduction! TypeDBs type inference is powerful."; insert (parent: $post1, reply: $comment1) isa comment-thread;

match $post1 isa post, has title "Getting Started with TypeDB"; $comment2 isa comment, has content "Would love to see more examples with relations."; insert (parent: $post1, reply: $comment2) isa comment-thread;

# =============================================================================
# Comment replies (who wrote which comment)
# =============================================================================
match $bob isa person, has email "bob@example.com"; $comment1 isa comment, has content "Great introduction! TypeDBs type inference is powerful."; insert (commenter: $bob, comment: $comment1) isa comment-reply;

match $carol isa person, has email "carol@example.com"; $comment2 isa comment, has content "Would love to see more examples with relations."; insert (commenter: $carol, comment: $comment2) isa comment-reply;

# =============================================================================
# Likes (using match-insert)
# =============================================================================
match $bob isa person, has email "bob@example.com"; $post1 isa post, has title "Getting Started with TypeDB"; insert (liker: $bob, liked: $post1) isa likes, has created-at 2023-07-01T11:00:00;

match $carol isa person, has email "carol@example.com"; $post1 isa post, has title "Getting Started with TypeDB"; insert (liker: $carol, liked: $post1) isa likes, has created-at 2023-07-01T11:30:00;

match $alice isa person, has email "alice@example.com"; $post2 isa post, has title "Design Systems in 2024"; insert (liker: $alice, liked: $post2) isa likes, has created-at 2023-07-05T15:00:00;

match $emma isa person, has email "emma@example.com"; $post2 isa post, has title "Design Systems in 2024"; insert (liker: $emma, liked: $post2) isa likes, has created-at 2023-07-05T16:00:00;
`,

  exampleQueries: [
    {
      name: "All Users",
      description: "Fetch all people with their basic info",
      query: `match $p isa person;
fetch {
    "name": $p.name,
    "username": $p.username,
    "email": $p.email
};`,
    },
    {
      name: "Popular Posts",
      description: "Find posts with most likes",
      query: `match $post isa post, has like-count $likes;
$likes > 30;
fetch {
    "title": $post.title,
    "likes": $likes
};`,
    },
    {
      name: "Friends of Alice",
      description: "Find all of Alice's friends",
      query: `match
$alice isa person, has name "Alice Chen";
($alice, $friend) isa friendship;
fetch {
    "friend": $friend.name
};`,
    },
    {
      name: "Who Follows Who",
      description: "Show all follow relationships",
      query: `match
(follower: $follower, followed: $followed) isa follows;
fetch {
    "follower": $follower.name,
    "follows": $followed.name
};`,
    },
    {
      name: "Post Authors and Comments",
      description: "Posts with their authors and comment count",
      query: `match
$post isa post;
(author: $author, creation: $post) isa authorship;
fetch {
    "title": $post.title,
    "author": $author.name,
    "likes": $post.like-count
};`,
    },
    {
      name: "Social Graph",
      description: "Explore the entire social graph",
      query: `match
$person isa person;
{
    ($person, $other) isa friendship;
} or {
    (follower: $person, followed: $other) isa follows;
} or {
    (author: $person, creation: $post) isa authorship;
};
limit 50;`,
    },
  ],
};
