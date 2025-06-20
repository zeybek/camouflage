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
 */
export function findEnvVariables(text: string): RegExpMatchArray[] {
  // Use matchAll with global flag for safe iteration
  const globalRegex = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/gm;
  return Array.from(text.matchAll(globalRegex));
}

/**
 * Find all commented environment variable matches in the given text
 * Returns an array of matches with index information for commented lines
 */
export function findCommentedEnvVariables(text: string): RegExpMatchArray[] {
  return Array.from(text.matchAll(COMMENTED_ENV_VAR_REGEX));
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
 * Check if a file is an environment file
 */
export function isEnvFile(fileName: string): boolean {
  return (
    fileName.toLowerCase().endsWith('.env') ||
    fileName.toLowerCase().includes('.env.') ||
    fileName.toLowerCase().includes('.envrc')
  );
}
