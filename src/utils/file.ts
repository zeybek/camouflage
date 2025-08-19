import * as vscode from 'vscode';
import { matchesAnyPattern } from './pattern-matcher';

/**
 * Regular expression to match environment variable declarations
 * Matches lines like: KEY=value or export KEY=value
 * Note: Removed global flag to prevent state issues
 */
const ENV_VAR_BASE_REGEX = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/m;

/**
 * Regular expression to match PHP define() statements
 * Matches lines like: define('KEY', 'value'); or define("KEY", "value");
 */
const PHP_DEFINE_REGEX =
  /define\s*\(\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"],\s*['"]([^'"]*)['"]\s*\)/gm;

/**
 * Regular expression to match PHP array syntax
 * Matches lines like: 'key' => 'value', or "key" => "value",
 */
const PHP_ARRAY_REGEX = /['"]([A-Za-z_][A-Za-z0-9_]*)['"],?\s*=>\s*['"]([^'"]*)['"]/gm;

/**
 * Regular expression to match YAML/JSON key-value pairs
 * Matches lines like: key: value or "key": "value"
 */
const YAML_JSON_REGEX = /['"]?([A-Za-z_][A-Za-z0-9_]*)['"]?\s*:\s*['"]([^'"]*)['"]/gm;

/**
 * Regular expression to match commented environment variable declarations
 * Matches lines like: # KEY=value or # export KEY=value
 */
const COMMENTED_ENV_VAR_REGEX = /^\s*#\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/gm;

/**
 * Find all environment variable matches in the given text
 * Returns an array of matches with index information
 * Supports multiple formats: KEY=value, define('KEY', 'value'), 'key' => 'value', key: "value"
 */
export function findEnvVariables(text: string): RegExpMatchArray[] {
  const matches: RegExpMatchArray[] = [];

  // Standard KEY=value format
  const envRegex = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/gm;
  matches.push(...Array.from(text.matchAll(envRegex)));

  // PHP define() format
  matches.push(...Array.from(text.matchAll(PHP_DEFINE_REGEX)));

  // PHP array format
  matches.push(...Array.from(text.matchAll(PHP_ARRAY_REGEX)));

  // YAML/JSON format
  matches.push(...Array.from(text.matchAll(YAML_JSON_REGEX)));

  return matches;
}

/**
 * Find all commented environment variable matches in the given text
 * Returns an array of matches with index information for commented lines
 * Supports commented PHP define() statements and standard formats
 */
export function findCommentedEnvVariables(text: string): RegExpMatchArray[] {
  const matches: RegExpMatchArray[] = [];

  // Standard commented format: # KEY=value
  matches.push(...Array.from(text.matchAll(COMMENTED_ENV_VAR_REGEX)));

  // PHP commented define() format: // define('KEY', 'value');
  const commentedPhpDefineRegex =
    /\/\/\s*define\s*\(\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"],\s*['"]([^'"]*)['"]\s*\)/gm;
  matches.push(...Array.from(text.matchAll(commentedPhpDefineRegex)));

  return matches;
}

/**
 * Find both regular and commented environment variables
 * Returns an object with both types separated for different processing
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
 * @deprecated Use findEnvVariables() instead for safer regex handling
 */
export const ENV_VAR_REGEX = ENV_VAR_BASE_REGEX;

/**
 * Check if a file matches the configured file patterns
 */
export function isEnvFile(fileName: string): boolean {
  // Get file patterns from configuration
  const filePatterns = vscode.workspace
    .getConfiguration('camouflage')
    .get('files.patterns', ['.env*', '*.env']) as string[];

  // Extract just the filename from the full path
  const basename = fileName.split('/').pop() || fileName.split('\\').pop() || fileName;

  // Check if the filename matches any of the configured patterns
  return matchesAnyPattern(basename, filePatterns);
}
