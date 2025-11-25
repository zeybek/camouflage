/**
 * Parser types and interfaces for multi-format support
 */

/**
 * Represents a parsed variable from any supported file format
 */
export interface ParsedVariable {
  /** Full key path (e.g., "database.password" for nested keys) */
  key: string;
  /** The actual value */
  value: string;
  /** Start index of the value in the document */
  startIndex: number;
  /** End index of the value in the document */
  endIndex: number;
  /** Line number (0-based) */
  lineNumber: number;
  /** Whether this is a nested key */
  isNested: boolean;
  /** Whether this is a commented line */
  isCommented: boolean;
}

/**
 * Parser interface that all format-specific parsers must implement
 */
export interface Parser {
  /** Name of the parser (e.g., "env", "json", "yaml") */
  readonly name: string;
  /** File extensions this parser supports (e.g., [".env", ".sh"]) */
  readonly supportedExtensions: string[];
  /** Parse the content and return all variables */
  parse(content: string): ParsedVariable[];
  /** Check if this parser can handle the given file */
  canParse(fileName: string): boolean;
}

/**
 * Parser options that can be configured by the user
 */
export interface ParserOptions {
  /** Maximum depth for nested key parsing (JSON, YAML) */
  maxNestedDepth: number;
  /** Whether to include commented variables */
  includeCommented: boolean;
}

/**
 * Default parser options
 */
export const DEFAULT_PARSER_OPTIONS: ParserOptions = {
  maxNestedDepth: 10,
  includeCommented: true,
};

/**
 * Supported parser types
 */
export type ParserType = 'env' | 'json' | 'yaml' | 'properties' | 'toml';

/**
 * Parser configuration in settings
 */
export interface ParserConfig {
  /** List of enabled parsers */
  enabled: ParserType[];
  /** JSON-specific options */
  json: {
    nestedDepth: number;
  };
  /** YAML-specific options */
  yaml: {
    nestedDepth: number;
  };
}

/**
 * Default parser configuration
 */
export const DEFAULT_PARSER_CONFIG: ParserConfig = {
  enabled: ['env', 'json', 'yaml', 'properties', 'toml'],
  json: {
    nestedDepth: 10,
  },
  yaml: {
    nestedDepth: 10,
  },
};
