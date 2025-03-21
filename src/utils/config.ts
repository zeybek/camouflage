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
  return vscode.workspace.getConfiguration(CONFIG_SECTION).get('enabled', true);
}

/**
 * Check if auto hide is enabled
 */
export function isAutoHideEnabled(): boolean {
  return vscode.workspace.getConfiguration(CONFIG_SECTION).get('autoHide', true);
}

/**
 * Get the file patterns
 */
export function getFilePatterns(): string[] {
  return vscode.workspace
    .getConfiguration(CONFIG_SECTION)
    .get('files.patterns', ['.env*', '*.env']);
}

/**
 * Get the text color for hidden values
 */
export function getTextColor(): string {
  // Get user configured color
  const textColor = vscode.workspace
    .getConfiguration(CONFIG_SECTION)
    .get<string>('appearance.textColor', 'auto');

  // If user has explicitly set a color (not 'auto'), use that
  if (textColor !== 'auto') {
    return textColor;
  }

  // Otherwise, return the 'auto' variable which will be resolved to the current theme's text color
  // We use 'var(--vscode-button-foreground)' which is a CSS variable that VS Code provides
  return 'var(--vscode-button-foreground)';
}

/**
 * Get the background color for hidden values
 * This checks if the user has set 'auto' or 'transparent', and returns appropriate values
 */
export function getBackgroundColor(): string {
  // Get user configured color
  const backgroundColor = vscode.workspace
    .getConfiguration(CONFIG_SECTION)
    .get<string>('appearance.backgroundColor', 'auto');

  // If user has explicitly set a color (not 'auto' or 'transparent'), use that
  if (backgroundColor !== 'auto' && backgroundColor !== 'transparent') {
    return backgroundColor;
  }

  // If set to transparent, return that
  if (backgroundColor === 'transparent') {
    return 'transparent';
  }

  // Otherwise, return the 'auto' variable which will be resolved to the current theme's color
  // We use 'var(--vscode-button-background)' which is a CSS variable that VS Code provides
  return 'var(--vscode-button-background)';
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
 * Check if the preview should be shown
 */
export function shouldShowPreview(): boolean {
  return vscode.workspace.getConfiguration(CONFIG_SECTION).get('hover.showPreview', true);
}

/**
 * Get the hover message
 */
export function getHoverMessage(): string {
  return vscode.workspace
    .getConfiguration(CONFIG_SECTION)
    .get('hover.message', 'Hidden by Camouflage');
}

/**
 * Get key patterns that should always be hidden
 */
export function getKeyPatterns(): string[] {
  return vscode.workspace
    .getConfiguration(CONFIG_SECTION)
    .get('selective.keyPatterns', [
      '*KEY*',
      '*TOKEN*',
      '*SECRET*',
      '*PASSWORD*',
      '*PWD*',
      '*DB*',
      '*DATABASE*',
      '*PORT*',
    ]);
}

/**
 * Get keys that should never be hidden
 */
export function getExcludeKeys(): string[] {
  return vscode.workspace.getConfiguration(CONFIG_SECTION).get('selective.excludeKeys', []);
}

/**
 * Check if selective hiding is enabled
 */
export function isSelectiveHidingEnabled(): boolean {
  return vscode.workspace.getConfiguration(CONFIG_SECTION).get('selective.enabled', false);
}

/**
 * Get the appearance style for hiding values (text, dotted, stars, scramble)
 */
export function getAppearanceStyle(): string {
  return vscode.workspace.getConfiguration(CONFIG_SECTION).get('appearance.style', 'text');
}
