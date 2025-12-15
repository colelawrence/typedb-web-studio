/**
 * Curriculum Parser Tests
 *
 * Tests for the markdown parser that extracts structured content
 * from curriculum files.
 *
 * These tests run in Node environment (via vitest workspace config).
 */

import { describe, it, expect, vi } from 'vitest';
import { resolve } from 'path';
import { readFile } from 'fs/promises';
import {
  parseSection,
  getExampleIds,
  findDuplicateExampleIds,
  validateSection,
} from '../parser';

const SAMPLE_MARKDOWN = `---
id: match-basics
title: Basic Pattern Matching
context: social-network
requires: [types-intro]
---

# Pattern Matching

The match clause finds data.

## Variables

Variables start with \`$\`.

\`\`\`typeql:example[id=first-match, expect=results]
match $p isa person;
get $p;
\`\`\`

## Invalid Examples

\`\`\`typeql:invalid[id=bad-syntax, error="expecting 'isa'"]
match $p person;
\`\`\`
`;

describe('Curriculum Parser', () => {
  describe('Frontmatter Parsing', () => {
    it('parses frontmatter correctly', () => {
      const section = parseSection(SAMPLE_MARKDOWN, 'test.md');

      expect(section.id).toBe('match-basics');
      expect(section.title).toBe('Basic Pattern Matching');
      expect(section.context).toBe('social-network');
      expect(section.requires).toEqual(['types-intro']);
    });

    it('handles missing optional frontmatter fields', () => {
      const minimal = `---
id: minimal
title: Minimal Section
---

# Content
`;
      const section = parseSection(minimal, 'test.md');

      expect(section.context).toBeNull();
      expect(section.requires).toEqual([]);
    });

    it('provides defaults for missing required fields', () => {
      const noId = `---
title: No ID Section
---

# Content
`;
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const section = parseSection(noId, 'no-id.md');

      expect(consoleSpy).toHaveBeenCalled();
      expect(section.id).toBe('no-id-md'); // slugified filename
      consoleSpy.mockRestore();
    });

    it('preserves rawContent without frontmatter', () => {
      const section = parseSection(SAMPLE_MARKDOWN, 'test.md');

      expect(section.rawContent).not.toContain('---');
      expect(section.rawContent).not.toContain('id: match-basics');
      expect(section.rawContent).toContain('# Pattern Matching');
    });
  });

  describe('Heading Extraction', () => {
    it('extracts all headings with correct levels', () => {
      const section = parseSection(SAMPLE_MARKDOWN, 'test.md');

      expect(section.headings).toHaveLength(3);
      expect(section.headings[0]).toMatchObject({
        text: 'Pattern Matching',
        level: 1,
        id: 'pattern-matching',
      });
      expect(section.headings[1]).toMatchObject({
        text: 'Variables',
        level: 2,
        id: 'variables',
      });
      expect(section.headings[2]).toMatchObject({
        text: 'Invalid Examples',
        level: 2,
        id: 'invalid-examples',
      });
    });

    it('computes line numbers for headings', () => {
      const section = parseSection(SAMPLE_MARKDOWN, 'test.md');

      // Line numbers should be > 0 and in order
      expect(section.headings[0].line).toBeGreaterThan(0);
      expect(section.headings[1].line).toBeGreaterThan(section.headings[0].line);
      expect(section.headings[2].line).toBeGreaterThan(section.headings[1].line);
    });

    it('handles various heading levels', () => {
      const multiLevel = `---
id: multi-level
title: Multi Level
---

# H1
## H2
### H3
#### H4
##### H5
###### H6
`;
      const section = parseSection(multiLevel, 'test.md');

      expect(section.headings).toHaveLength(6);
      expect(section.headings.map((h) => h.level)).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('slugifies heading text correctly', () => {
      const specialChars = `---
id: special
title: Special
---

# Hello World
## What's New?
### 123 Numbers First
#### Mixed CASE Text
`;
      const section = parseSection(specialChars, 'test.md');

      expect(section.headings.map((h) => h.id)).toEqual([
        'hello-world',
        'what-s-new',
        '123-numbers-first',
        'mixed-case-text',
      ]);
    });
  });

  describe('Example Extraction', () => {
    it('extracts example code blocks with attributes', () => {
      const section = parseSection(SAMPLE_MARKDOWN, 'test.md');

      expect(section.examples).toHaveLength(2);

      const firstMatch = section.examples.find((e) => e.id === 'first-match');
      expect(firstMatch).toMatchObject({
        type: 'example',
        query: 'match $p isa person;\nget $p;',
        expect: { results: true },
      });
    });

    it('extracts invalid examples with error patterns', () => {
      const section = parseSection(SAMPLE_MARKDOWN, 'test.md');

      const badSyntax = section.examples.find((e) => e.id === 'bad-syntax');
      expect(badSyntax).toMatchObject({
        type: 'invalid',
        expect: { error: "expecting 'isa'" },
      });
    });

    it('includes source location for examples', () => {
      const section = parseSection(SAMPLE_MARKDOWN, 'test.md');

      const firstMatch = section.examples.find((e) => e.id === 'first-match');
      expect(firstMatch?.sourceFile).toBe('test.md');
      expect(firstMatch?.lineNumber).toBeGreaterThan(0);
    });

    it('handles multiline queries', () => {
      const multiline = `---
id: multiline
title: Multiline
---

\`\`\`typeql:example[id=multi, expect=results]
match
  $p isa person,
    has name $n,
    has age $a;
get $p, $n, $a;
\`\`\`
`;
      const section = parseSection(multiline, 'test.md');
      const example = section.examples[0];

      expect(example.query).toContain('$p isa person');
      expect(example.query).toContain('has name $n');
      expect(example.query.split('\n').length).toBeGreaterThan(1);
    });

    it('parses min/max expectations', () => {
      const withMinMax = `---
id: minmax
title: MinMax
---

\`\`\`typeql:example[id=bounded, expect=results, min=1, max=5]
match $p isa person;
get $p;
\`\`\`
`;
      const section = parseSection(withMinMax, 'test.md');
      const example = section.examples[0];

      expect(example.expect).toEqual({
        results: true,
        min: 1,
        max: 5,
      });
    });

    it('handles quoted attribute values', () => {
      const quoted = `---
id: quoted
title: Quoted
---

\`\`\`typeql:invalid[id=syntax-err, error="unexpected token '}'"]
match $p isa {person};
\`\`\`
`;
      const section = parseSection(quoted, 'test.md');
      const example = section.examples[0];

      expect(example.expect?.error).toBe("unexpected token '}'");
    });

    it('handles schema type examples', () => {
      const schema = `---
id: schema-def
title: Schema Definition
---

\`\`\`typeql:schema[id=define-person]
define
person sub entity,
  owns name;
\`\`\`
`;
      const section = parseSection(schema, 'test.md');
      const example = section.examples[0];

      expect(example.type).toBe('schema');
      expect(example.query).toContain('define');
    });

    it('handles readonly type examples', () => {
      const readonly = `---
id: readonly-test
title: Readonly
---

\`\`\`typeql:readonly[id=display-only]
match $x isa thing;
\`\`\`
`;
      const section = parseSection(readonly, 'test.md');
      const example = section.examples[0];

      expect(example.type).toBe('readonly');
    });
  });

  describe('Edge Cases', () => {
    it('warns on examples without id', () => {
      const noId = `---
id: no-id-test
title: Test
---

\`\`\`typeql:example[expect=results]
match $x isa thing;
\`\`\`
`;
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const section = parseSection(noId, 'test.md');

      expect(consoleSpy).toHaveBeenCalled();
      expect(section.examples).toHaveLength(0);
      consoleSpy.mockRestore();
    });

    it('warns on invalid example type', () => {
      const invalidType = `---
id: invalid-type
title: Test
---

\`\`\`typeql:badtype[id=test]
match $x isa thing;
\`\`\`
`;
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const section = parseSection(invalidType, 'test.md');

      expect(consoleSpy).toHaveBeenCalled();
      expect(section.examples).toHaveLength(0);
      consoleSpy.mockRestore();
    });

    it('handles empty markdown', () => {
      const empty = `---
id: empty
title: Empty
---
`;
      const section = parseSection(empty, 'test.md');

      expect(section.headings).toHaveLength(0);
      expect(section.examples).toHaveLength(0);
      expect(section.rawContent.trim()).toBe('');
    });

    it('handles markdown with no code fences', () => {
      const noCode = `---
id: no-code
title: No Code
---

# Introduction

This is just text without any code examples.

## More Content

Still no code here.
`;
      const section = parseSection(noCode, 'test.md');

      expect(section.headings).toHaveLength(2);
      expect(section.examples).toHaveLength(0);
    });

    it('ignores non-typeql code fences', () => {
      const mixedCode = `---
id: mixed
title: Mixed
---

\`\`\`typescript
const x = 1;
\`\`\`

\`\`\`typeql:example[id=real]
match $p isa person;
\`\`\`

\`\`\`python
print("hello")
\`\`\`
`;
      const section = parseSection(mixedCode, 'test.md');

      // Only the typeql fence should be captured
      expect(section.examples).toHaveLength(1);
      expect(section.examples[0].id).toBe('real');
    });
  });
});

describe('Helper Functions', () => {
  describe('getExampleIds', () => {
    it('returns all example IDs from a section', () => {
      const section = parseSection(SAMPLE_MARKDOWN, 'test.md');
      const ids = getExampleIds(section);

      expect(ids).toEqual(['first-match', 'bad-syntax']);
    });
  });

  describe('findDuplicateExampleIds', () => {
    it('finds duplicate IDs across sections', () => {
      const section1 = parseSection(
        `---
id: sec1
title: Section 1
---

\`\`\`typeql:example[id=duplicate]
match $a isa a;
\`\`\`
`,
        'sec1.md'
      );

      const section2 = parseSection(
        `---
id: sec2
title: Section 2
---

\`\`\`typeql:example[id=duplicate]
match $b isa b;
\`\`\`

\`\`\`typeql:example[id=unique]
match $c isa c;
\`\`\`
`,
        'sec2.md'
      );

      const duplicates = findDuplicateExampleIds([section1, section2]);

      expect(duplicates.size).toBe(1);
      expect(duplicates.has('duplicate')).toBe(true);
      expect(duplicates.get('duplicate')).toHaveLength(2);
    });

    it('returns empty map when no duplicates', () => {
      const section1 = parseSection(
        `---
id: sec1
title: Section 1
---

\`\`\`typeql:example[id=unique1]
match $a isa a;
\`\`\`
`,
        'sec1.md'
      );

      const section2 = parseSection(
        `---
id: sec2
title: Section 2
---

\`\`\`typeql:example[id=unique2]
match $b isa b;
\`\`\`
`,
        'sec2.md'
      );

      const duplicates = findDuplicateExampleIds([section1, section2]);

      expect(duplicates.size).toBe(0);
    });
  });

  describe('validateSection', () => {
    it('warns about examples without expectations', () => {
      const noExpect = parseSection(
        `---
id: no-expect
title: No Expectations
---

\`\`\`typeql:example[id=missing-expect]
match $p isa person;
\`\`\`
`,
        'test.md'
      );

      const warnings = validateSection(noExpect);

      expect(warnings.some((w) => w.includes('missing-expect'))).toBe(true);
      expect(warnings.some((w) => w.includes('no expectations'))).toBe(true);
    });

    it('warns about invalid examples without error pattern', () => {
      const noError = parseSection(
        `---
id: no-error
title: No Error Pattern
---

\`\`\`typeql:invalid[id=missing-error]
match $p person;
\`\`\`
`,
        'test.md'
      );

      const warnings = validateSection(noError);

      expect(warnings.some((w) => w.includes('missing-error'))).toBe(true);
      expect(warnings.some((w) => w.includes('no expected error'))).toBe(true);
    });

    it('warns about sections with no headings', () => {
      const noHeadings = parseSection(
        `---
id: no-headings
title: No Headings
---

Just some text without any headings.
`,
        'test.md'
      );

      const warnings = validateSection(noHeadings);

      expect(warnings.some((w) => w.includes('no headings'))).toBe(true);
    });

    it('returns no warnings for valid section', () => {
      const valid = parseSection(
        `---
id: valid
title: Valid Section
---

# Introduction

Some content here.

\`\`\`typeql:example[id=valid-example, expect=results]
match $p isa person;
\`\`\`

\`\`\`typeql:invalid[id=valid-invalid, error="syntax error"]
bad query;
\`\`\`
`,
        'test.md'
      );

      const warnings = validateSection(valid);

      expect(warnings).toHaveLength(0);
    });
  });
});

describe('Real Curriculum File', () => {
  it('parses the sample first-queries.md file', async () => {
    // This test uses the actual curriculum file to ensure compatibility
    const curriculumPath = resolve(
      process.cwd(),
      'docs/curriculum/01-foundations/03-first-queries.md'
    );

    let content: string;
    try {
      content = await readFile(curriculumPath, 'utf-8');
    } catch {
      // Skip test if file doesn't exist
      console.log('Skipping real file test - curriculum file not found');
      return;
    }

    const section = parseSection(content, curriculumPath);

    expect(section.id).toBe('first-queries');
    expect(section.title).toBe('Your First Queries');
    expect(section.context).toBe('social-network');
    expect(section.requires).toContain('types-intro');

    // Should have multiple examples
    expect(section.examples.length).toBeGreaterThan(0);

    // Should have example and invalid types
    const types = new Set(section.examples.map((e) => e.type));
    expect(types.has('example')).toBe(true);
    expect(types.has('invalid')).toBe(true);
  });
});
