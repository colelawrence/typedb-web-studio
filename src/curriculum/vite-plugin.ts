/**
 * Vite Plugin for Curriculum Content
 *
 * This plugin parses curriculum markdown files at build time,
 * converting them to structured JSON that browser code can consume.
 *
 * The heavy-lifting (gray-matter, filesystem access) happens at build time,
 * so browser bundles only include pre-parsed content.
 *
 * @module curriculum/vite-plugin
 */

import type { Plugin } from 'vite';
import { readFile, readdir } from 'fs/promises';
import { join, relative } from 'path';
import { parseSection, validateSection } from './parser';
import type { ParsedSection, ContextMeta, LoadedContext } from './types';
import * as yaml from 'yaml';

const VIRTUAL_MODULE_ID = 'virtual:curriculum-content';
const RESOLVED_VIRTUAL_MODULE_ID = '\0' + VIRTUAL_MODULE_ID;

interface CurriculumContent {
  sections: ParsedSection[];
  contexts: ContextMeta[];
  /** Loaded contexts with schema and seed content, keyed by context name */
  loadedContexts: Record<string, LoadedContext>;
  metadata: {
    generatedAt: string;
    totalExamples: number;
    totalSections: number;
  };
}

/**
 * Recursively find all markdown files in a directory.
 */
async function findMarkdownFiles(dir: string, basePath: string = ''): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const relativePath = join(basePath, entry.name);

      if (entry.isDirectory()) {
        // Skip underscore-prefixed directories (like _contexts, _meta)
        if (!entry.name.startsWith('_')) {
          const subFiles = await findMarkdownFiles(fullPath, relativePath);
          files.push(...subFiles);
        }
      } else if (entry.isFile() && entry.name.endsWith('.md') && !entry.name.startsWith('_')) {
        files.push(fullPath);
      }
    }
  } catch (err) {
    // Directory doesn't exist - return empty
    console.warn(`[curriculum] Could not read directory: ${dir}`);
  }

  return files;
}

/**
 * Load context definitions from _contexts directory.
 * Returns both metadata and loaded content.
 */
async function loadContexts(contextsDir: string): Promise<{
  contexts: ContextMeta[];
  loadedContexts: Record<string, LoadedContext>;
}> {
  const contexts: ContextMeta[] = [];
  const loadedContexts: Record<string, LoadedContext> = {};

  try {
    const entries = await readdir(contextsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const contextDir = join(contextsDir, entry.name);
        const contextYaml = join(contextDir, 'context.yaml');
        const schemaFile = join(contextDir, 'schema.tql');
        const seedFile = join(contextDir, 'seed.tql');

        let description = '';
        try {
          const yamlContent = await readFile(contextYaml, 'utf-8');
          const meta = yaml.parse(yamlContent) as Partial<ContextMeta>;
          description = meta.description ?? '';
        } catch {
          // Context without yaml - use defaults
        }

        // Load schema and seed file contents
        let schema = '';
        let seed = '';
        try {
          schema = await readFile(schemaFile, 'utf-8');
        } catch {
          console.warn(`[curriculum] Could not read schema file: ${schemaFile}`);
        }
        try {
          seed = await readFile(seedFile, 'utf-8');
        } catch {
          console.warn(`[curriculum] Could not read seed file: ${seedFile}`);
        }

        contexts.push({
          name: entry.name,
          description,
          schemaFile,
          seedFile,
        });

        loadedContexts[entry.name] = {
          name: entry.name,
          description,
          schema,
          seed,
        };
      }
    }
  } catch {
    // No contexts directory
  }

  return { contexts, loadedContexts };
}

/**
 * Parse all curriculum content from filesystem.
 */
async function parseCurriculumContent(curriculumDir: string): Promise<CurriculumContent> {
  const sections: ParsedSection[] = [];
  const mdFiles = await findMarkdownFiles(curriculumDir);
  const contextsDir = join(curriculumDir, '_contexts');
  const { contexts, loadedContexts } = await loadContexts(contextsDir);

  for (const filePath of mdFiles) {
    try {
      const content = await readFile(filePath, 'utf-8');
      const relativePath = relative(curriculumDir, filePath);
      const section = parseSection(content, relativePath);

      // Validate and log warnings
      const warnings = validateSection(section);
      for (const warning of warnings) {
        console.warn(`[curriculum] ${warning}`);
      }

      sections.push(section);
    } catch (err) {
      console.error(`[curriculum] Failed to parse ${filePath}:`, err);
    }
  }

  // Sort sections by their file path for consistent ordering
  sections.sort((a, b) => a.sourceFile.localeCompare(b.sourceFile));

  const totalExamples = sections.reduce((sum, s) => sum + s.examples.length, 0);

  return {
    sections,
    contexts,
    loadedContexts,
    metadata: {
      generatedAt: new Date().toISOString(),
      totalExamples,
      totalSections: sections.length,
    },
  };
}

/**
 * Create the Vite plugin for curriculum content.
 *
 * @param options - Plugin options
 * @param options.curriculumDir - Path to curriculum directory (relative to project root)
 */
export function curriculumPlugin(options: { curriculumDir?: string } = {}): Plugin {
  const curriculumDir = options.curriculumDir ?? 'docs/curriculum';
  let projectRoot: string;

  return {
    name: 'curriculum-content',

    configResolved(config) {
      projectRoot = config.root;
    },

    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) {
        return RESOLVED_VIRTUAL_MODULE_ID;
      }
    },

    async load(id) {
      if (id === RESOLVED_VIRTUAL_MODULE_ID) {
        const fullPath = join(projectRoot, curriculumDir);
        const content = await parseCurriculumContent(fullPath);

        // Generate TypeScript module that exports the parsed content
        return `
// Auto-generated curriculum content
// Generated at: ${content.metadata.generatedAt}

export const curriculumSections = ${JSON.stringify(content.sections, null, 2)};

export const curriculumContexts = ${JSON.stringify(content.contexts, null, 2)};

/** Loaded contexts with schema and seed content, keyed by context name */
export const curriculumLoadedContexts = ${JSON.stringify(content.loadedContexts, null, 2)};

export const curriculumMetadata = ${JSON.stringify(content.metadata, null, 2)};

export function getCurriculumSection(id) {
  return curriculumSections.find(s => s.id === id) ?? null;
}

export function getCurriculumSectionsByContext(contextName) {
  return curriculumSections.filter(s => s.context === contextName);
}

export function getExampleById(exampleId) {
  for (const section of curriculumSections) {
    const example = section.examples.find(e => e.id === exampleId);
    if (example) {
      return { section, example };
    }
  }
  return null;
}

export function getAllExamples() {
  return curriculumSections.flatMap(s =>
    s.examples.map(e => ({ ...e, sectionId: s.id, sectionTitle: s.title }))
  );
}
`;
      }
    },

    // Watch curriculum files for HMR
    configureServer(server) {
      const fullPath = join(projectRoot, curriculumDir);

      server.watcher.add(fullPath);

      server.watcher.on('change', (path) => {
        if (path.startsWith(fullPath) && (path.endsWith('.md') || path.endsWith('.yaml') || path.endsWith('.tql'))) {
          // Invalidate the virtual module
          const mod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_MODULE_ID);
          if (mod) {
            server.moduleGraph.invalidateModule(mod);
            server.ws.send({ type: 'full-reload' });
          }
        }
      });
    },
  };
}

export default curriculumPlugin;
