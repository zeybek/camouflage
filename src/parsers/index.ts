import * as path from 'path';
import { Parser, ParserType, ParsedVariable, ParserOptions } from './types';
import { EnvParser } from './env-parser';
import { JsonParser } from './json-parser';
import { YamlParser } from './yaml-parser';
import { PropertiesParser } from './properties-parser';
import { TomlParser } from './toml-parser';

// Re-export types
export * from './types';
export { EnvParser } from './env-parser';
export { JsonParser } from './json-parser';
export { YamlParser } from './yaml-parser';
export { PropertiesParser } from './properties-parser';
export { TomlParser } from './toml-parser';

/**
 * Parser Registry - manages all available parsers
 */
export class ParserRegistry {
  private parsers: Map<ParserType, Parser> = new Map();
  private enabledParsers: Set<ParserType> = new Set();

  constructor(enabledParsers: ParserType[] = ['env', 'json', 'yaml', 'properties', 'toml']) {
    // Initialize all parsers
    this.registerParser('env', new EnvParser());
    this.registerParser('json', new JsonParser());
    this.registerParser('yaml', new YamlParser());
    this.registerParser('properties', new PropertiesParser());
    this.registerParser('toml', new TomlParser());

    // Set enabled parsers
    this.setEnabledParsers(enabledParsers);
  }

  /**
   * Register a parser
   */
  registerParser(type: ParserType, parser: Parser): void {
    this.parsers.set(type, parser);
  }

  /**
   * Set which parsers are enabled
   */
  setEnabledParsers(types: ParserType[]): void {
    this.enabledParsers.clear();
    for (const type of types) {
      if (this.parsers.has(type)) {
        this.enabledParsers.add(type);
      }
    }
  }

  /**
   * Get a parser by type
   */
  getParser(type: ParserType): Parser | undefined {
    return this.parsers.get(type);
  }

  /**
   * Get all enabled parsers
   */
  getEnabledParsers(): Parser[] {
    return Array.from(this.enabledParsers)
      .map((type) => this.parsers.get(type))
      .filter((parser): parser is Parser => parser !== undefined);
  }

  /**
   * Find a parser that can handle the given file
   */
  findParserForFile(fileName: string): Parser | undefined {
    for (const type of this.enabledParsers) {
      const parser = this.parsers.get(type);
      if (parser && parser.canParse(fileName)) {
        return parser;
      }
    }
    return undefined;
  }

  /**
   * Check if any enabled parser can handle the given file
   */
  canParseFile(fileName: string): boolean {
    return this.findParserForFile(fileName) !== undefined;
  }

  /**
   * Parse a file's content using the appropriate parser
   */
  parseFile(fileName: string, content: string): ParsedVariable[] {
    const parser = this.findParserForFile(fileName);
    if (!parser) {
      return [];
    }
    return parser.parse(content);
  }

  /**
   * Update options for a specific parser
   */
  updateParserOptions(type: ParserType, options: Partial<ParserOptions>): void {
    const parser = this.parsers.get(type);
    if (parser && 'setOptions' in parser) {
      (parser as any).setOptions(options);
    }
  }

  /**
   * Get all supported file extensions across all enabled parsers
   */
  getSupportedExtensions(): string[] {
    const extensions = new Set<string>();
    for (const type of this.enabledParsers) {
      const parser = this.parsers.get(type);
      if (parser) {
        for (const ext of parser.supportedExtensions) {
          extensions.add(ext);
        }
      }
    }
    return Array.from(extensions);
  }
}

/**
 * Default parser registry instance
 */
let defaultRegistry: ParserRegistry | null = null;

/**
 * Get the default parser registry
 */
export function getParserRegistry(): ParserRegistry {
  if (!defaultRegistry) {
    defaultRegistry = new ParserRegistry();
  }
  return defaultRegistry;
}

/**
 * Reset the default parser registry (useful for testing)
 */
export function resetParserRegistry(): void {
  defaultRegistry = null;
}

/**
 * Configure the default parser registry
 */
export function configureParserRegistry(
  enabledParsers: ParserType[],
  options?: {
    json?: Partial<ParserOptions>;
    yaml?: Partial<ParserOptions>;
  }
): void {
  const registry = getParserRegistry();
  registry.setEnabledParsers(enabledParsers);

  if (options?.json) {
    registry.updateParserOptions('json', options.json);
  }
  if (options?.yaml) {
    registry.updateParserOptions('yaml', options.yaml);
  }
}

/**
 * Utility function to check if a file is supported
 */
export function isSupportedFile(fileName: string): boolean {
  return getParserRegistry().canParseFile(fileName);
}

/**
 * Utility function to parse a file
 */
export function parseFile(fileName: string, content: string): ParsedVariable[] {
  return getParserRegistry().parseFile(fileName, content);
}

/**
 * Check if file matches user-defined patterns
 * This is used in addition to parser-based detection
 */
export function matchesUserPatterns(fileName: string, patterns: string[]): boolean {
  const baseName = path.basename(fileName).toLowerCase();

  for (const pattern of patterns) {
    const p = pattern.toLowerCase();

    if (p.startsWith('*') && p.endsWith('*')) {
      // *env* → contains "env"
      if (baseName.includes(p.slice(1, -1))) {
        return true;
      }
    } else if (p.startsWith('*.')) {
      // *.sh → ends with ".sh"
      if (baseName.endsWith(p.slice(1))) {
        return true;
      }
    } else if (p.startsWith('.') && p.includes('*')) {
      // .env* → starts with ".env"
      if (baseName.startsWith(p.replace('*', ''))) {
        return true;
      }
    } else if (p.endsWith('*')) {
      // config* → starts with "config"
      if (baseName.startsWith(p.slice(0, -1))) {
        return true;
      }
    } else {
      // exact match
      if (baseName === p) {
        return true;
      }
    }
  }

  return false;
}
