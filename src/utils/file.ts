/**
 * Regular expression to match environment variable declarations
 * Matches lines like: KEY=value or export KEY=value
 * Note: Removed global flag to prevent state issues
 */
const ENV_VAR_BASE_REGEX = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/m;

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
