import * as vscode from 'vscode';

const CONFIG_SECTION = 'camouflage';

/**
 * Get configuration for the extension
 */
export function getConfig() {
  return vscode.workspace.getConfiguration(CONFIG_SECTION);
}

/**
 * Check if the extension is enabled
 */
export function isEnabled(): boolean {
  return getConfig().get('enabled', true);
}

/**
 * Check if auto hide is enabled
 */
export function isAutoHideEnabled(): boolean {
  return getConfig().get('autoHide', true);
}

/**
 * Get file patterns to apply hiding
 */
export function getFilePatterns(): string[] {
  return getConfig().get('files.patterns', ['.env*', '*.env']) || [];
}

/**
 * Get text color for hidden values
 */
export function getTextColor(): string {
  return getConfig().get('appearance.textColor', '#FFFFFF');
}

/**
 * Get background color for hidden values
 */
export function getBackgroundColor(): string {
  return getConfig().get('appearance.backgroundColor', '#2F7FE5');
}

/**
 * Enable the extension
 */
export async function enable(): Promise<void> {
  await getConfig().update('enabled', true, true);
}

/**
 * Disable the extension
 */
export async function disable(): Promise<void> {
  await getConfig().update('enabled', false, true);
}

/**
 * Check if preview on hover is enabled
 */
export function shouldShowPreview(): boolean {
  return getConfig().get('hover.showPreview', false);
}

/**
 * Get hover message
 */
export function getHoverMessage(): string {
  return getConfig().get('hover.message', 'Environment value hidden by Camouflage extension');
}

/**
 * Get key patterns to match for selective hiding
 */
export function getKeyPatterns(): string[] {
  return (
    getConfig().get('selective.keyPatterns', [
      '*KEY*',
      '*TOKEN*',
      '*SECRET*',
      '*PASSWORD*',
      '*PWD*',
      '*DB*',
      '*DATABASE*',
      '*PORT*',
    ]) || []
  );
}

/**
 * Get keys to exclude from hiding
 */
export function getExcludeKeys(): string[] {
  return getConfig().get('selective.excludeKeys', []) || [];
}

/**
 * Check if selective hiding is enabled
 */
export function isSelectiveHidingEnabled(): boolean {
  return getConfig().get('selective.enabled', false);
}

/**
 * Check if password protection is enabled
 */
export function isPasswordProtectionEnabled(): boolean {
  return getConfig().get('security.passwordProtection', false);
}

/**
 * Get password timeout in seconds
 */
export function getPasswordTimeout(): number {
  return getConfig().get('security.passwordTimeout', 300);
}

/**
 * Get max password attempts
 */
export function getMaxAttempts(): number {
  return getConfig().get('security.maxAttempts', 3);
}

/**
 * Check if remember password is enabled
 */
export function isRememberPasswordEnabled(): boolean {
  return getConfig().get('security.rememberPassword', true);
}

/**
 * Enable password protection
 */
export async function enablePasswordProtection(): Promise<void> {
  await getConfig().update('security.passwordProtection', true, true);
}

/**
 * Disable password protection
 */
export async function disablePasswordProtection(): Promise<void> {
  await getConfig().update('security.passwordProtection', false, true);
}
