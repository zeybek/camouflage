/**
 * Regular expression to match environment variable declarations
 * Matches lines like: KEY=value or export KEY=value
 */
export const ENV_VAR_REGEX = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/gm;

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
