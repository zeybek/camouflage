import {
  getParserRegistry,
  matchesUserPatterns,
  ParsedVariable,
  isSupportedFile as parserIsSupportedFile,
  parseFile as parserParseFile,
} from '../parsers';
import { getFilePatterns, isFileExcluded } from './config';

/**
 * Regular expression to match environment variable declarations
 * Matches lines like: KEY=value or export KEY=value
 * Note: Removed global flag to prevent state issues
 */
const ENV_VAR_BASE_REGEX = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/m;

/**
 * Regular expression to match commented environment variable declarations
 * Matches lines like: # KEY=value or # export KEY=value
 */
const COMMENTED_ENV_VAR_REGEX = /^\s*#\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/gm;

/**
 * Find all environment variable matches in the given text
 * Returns an array of matches with index information
 * @deprecated Use parseFileContent() for multi-format support
 */
export function findEnvVariables(text: string): RegExpMatchArray[] {
  // Use matchAll with global flag for safe iteration
  const globalRegex = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/gm;
  return Array.from(text.matchAll(globalRegex));
}

/**
 * Find all commented environment variable matches in the given text
 * Returns an array of matches with index information for commented lines
 * @deprecated Use parseFileContent() for multi-format support
 */
export function findCommentedEnvVariables(text: string): RegExpMatchArray[] {
  return Array.from(text.matchAll(COMMENTED_ENV_VAR_REGEX));
}

/**
 * Find both regular and commented environment variables
 * Returns an object with both types separated for different processing
 * @deprecated Use parseFileContent() for multi-format support
 */
export function findAllEnvVariables(text: string): {
  regular: RegExpMatchArray[];
  commented: RegExpMatchArray[];
} {
  return {
    regular: findEnvVariables(text),
    commented: findCommentedEnvVariables(text),
  };
}

/**
 * Regular expression to match environment variable declarations (for backward compatibility)
 * @deprecated Use parseFileContent() for multi-format support
 */
export const ENV_VAR_REGEX = ENV_VAR_BASE_REGEX;

/**
 * Check if a file is an environment file (legacy function)
 * @deprecated Use isSupportedFile() for multi-format support
 */
export function isEnvFile(fileName: string): boolean {
  // First check with parser registry
  if (parserIsSupportedFile(fileName)) {
    return true;
  }

  // Then check user-defined patterns
  const userPatterns = getFilePatterns();
  if (matchesUserPatterns(fileName, userPatterns)) {
    return true;
  }

  // Legacy behavior for backward compatibility
  const lowerFileName = fileName.toLowerCase();
  return (
    lowerFileName.endsWith('.env') ||
    lowerFileName.includes('.env.') ||
    lowerFileName.includes('.envrc')
  );
}

/**
 * Check if a file is supported by the parser system
 * This includes all supported formats: .env, .sh, .json, .yaml, .properties, .toml
 * Also checks if the file is in the exclusion list
 */
export function isSupportedFile(fileName: string): boolean {
  // First check if file is explicitly excluded
  if (isFileExcluded(fileName)) {
    return false;
  }

  // Check with parser registry
  if (parserIsSupportedFile(fileName)) {
    return true;
  }

  // Check user-defined patterns
  const userPatterns = getFilePatterns();
  return matchesUserPatterns(fileName, userPatterns);
}

/**
 * Parse file content using the appropriate parser
 * Returns an array of ParsedVariable objects
 */
export function parseFileContent(fileName: string, content: string): ParsedVariable[] {
  return parserParseFile(fileName, content);
}

/**
 * Get all supported file extensions
 */
export function getSupportedExtensions(): string[] {
  return getParserRegistry().getSupportedExtensions();
}

// Re-export ParsedVariable for convenience
export type { ParsedVariable };
