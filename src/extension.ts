// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { Camouflage } from './core/camouflage';
import { getParserRegistry } from './parsers';
import * as config from './utils/config';

let camouflage: Camouflage;

/**
 * Extract key from current cursor position for any supported file format
 */
function extractKeyAtCursor(
  document: vscode.TextDocument,
  position: vscode.Position
): string | null {
  const fileName = document.fileName;
  const text = document.getText();
  const lineText = document.lineAt(position.line).text;
  const cursorOffset = document.offsetAt(position);

  // Get parser for this file
  const registry = getParserRegistry();
  const parser = registry.findParserForFile(fileName);

  if (!parser) {
    return null;
  }

  // Parse the file and find the variable at cursor position
  const variables = parser.parse(text);

  for (const variable of variables) {
    // Check if cursor is on the same line as the variable
    const varLine = variable.lineNumber;
    if (varLine === position.line) {
      // Check if cursor is within the key-value area (not before key or after value)
      const lineStart = document.offsetAt(new vscode.Position(position.line, 0));
      const lineEnd = document.offsetAt(new vscode.Position(position.line, lineText.length));

      if (cursorOffset >= lineStart && cursorOffset <= lineEnd) {
        return variable.key;
      }
    }

    // For multi-line scenarios, check if cursor is within the value range
    if (cursorOffset >= variable.startIndex && cursorOffset <= variable.endIndex) {
      return variable.key;
    }
  }

  // Fallback: Try regex patterns for common formats
  // ENV format: KEY=value or export KEY=value
  const envMatch = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(lineText);
  if (envMatch) {
    return envMatch[1];
  }

  // JSON format: "key": "value"
  const jsonMatch = /"([^"]+)"\s*:\s*/.exec(lineText);
  if (jsonMatch) {
    // For nested keys, try to build the full path
    return findJsonKeyPath(document, position.line) || jsonMatch[1];
  }

  // YAML format: key: value
  const yamlMatch = /^(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*/.exec(lineText);
  if (yamlMatch) {
    return findYamlKeyPath(document, position.line) || yamlMatch[2];
  }

  // Properties format: key=value or key: value
  const propMatch = /^([a-zA-Z0-9_.]+)\s*[=:]\s*/.exec(lineText);
  if (propMatch) {
    return propMatch[1];
  }

  // TOML format: key = "value"
  const tomlMatch = /^([a-zA-Z0-9_]+)\s*=\s*/.exec(lineText);
  if (tomlMatch) {
    return tomlMatch[1];
  }

  return null;
}

/**
 * Find full JSON key path by traversing up the document
 */
function findJsonKeyPath(document: vscode.TextDocument, lineNumber: number): string | null {
  const lineText = document.lineAt(lineNumber).text;
  const keyMatch = /"([^"]+)"\s*:/.exec(lineText);

  if (!keyMatch) {
    return null;
  }

  const currentKey = keyMatch[1];
  const currentIndent = lineText.search(/\S/);
  const keyPath: string[] = [currentKey];

  // Traverse up to find parent keys
  for (let i = lineNumber - 1; i >= 0; i--) {
    const line = document.lineAt(i).text;
    const indent = line.search(/\S/);

    if (indent < 0) {
      continue;
    } // Skip empty lines

    if (indent < currentIndent) {
      // Check if this line has a key that opens an object
      const parentMatch = /"([^"]+)"\s*:\s*\{?\s*$/.exec(line.trim());
      if (parentMatch) {
        keyPath.unshift(parentMatch[1]);
      }
    }
  }

  return keyPath.length > 1 ? keyPath.join('.') : currentKey;
}

/**
 * Find full YAML key path by traversing up the document
 */
function findYamlKeyPath(document: vscode.TextDocument, lineNumber: number): string | null {
  const lineText = document.lineAt(lineNumber).text;
  const keyMatch = /^(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/.exec(lineText);

  if (!keyMatch) {
    return null;
  }

  const currentIndent = keyMatch[1].length;
  const currentKey = keyMatch[2];
  const keyPath: string[] = [currentKey];

  // Traverse up to find parent keys
  for (let i = lineNumber - 1; i >= 0; i--) {
    const line = document.lineAt(i).text;
    const parentMatch = /^(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/.exec(line);

    if (!parentMatch) {
      continue;
    }

    const parentIndent = parentMatch[1].length;
    if (parentIndent < currentIndent) {
      keyPath.unshift(parentMatch[2]);
    }
  }

  return keyPath.length > 1 ? keyPath.join('.') : currentKey;
}

/**
 * This method is called when your extension is activated
 * @param context The extension context
 */
export function activate(context: vscode.ExtensionContext): void {
  console.warn('Camouflage extension is now active!');

  // Initialize the value masker immediately
  camouflage = new Camouflage();
  camouflage.initialize(context);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('camouflage.hide', () => {
      vscode.workspace.getConfiguration('camouflage').update('enabled', true, true);
      // Force immediate update after enabling
      setTimeout(() => camouflage.updateDecorationType(), 0);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('camouflage.reveal', () => {
      vscode.workspace.getConfiguration('camouflage').update('enabled', false, true);
      // Force immediate update after disabling
      setTimeout(() => camouflage.updateDecorationType(), 0);
    })
  );

  // Toggle selective hiding
  context.subscriptions.push(
    vscode.commands.registerCommand('camouflage.toggleSelective', () => {
      const config = vscode.workspace.getConfiguration('camouflage');
      const isEnabled = config.get('selective.enabled', false);
      config.update('selective.enabled', !isEnabled, true);
      vscode.window.showInformationMessage(
        `Selective hiding ${!isEnabled ? 'enabled' : 'disabled'}`
      );
      setTimeout(() => camouflage.updateDecorationType(), 0);
    })
  );

  // Toggle value under cursor
  context.subscriptions.push(
    vscode.commands.registerCommand('camouflage.toggleValue', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }

      const document = editor.document;
      const selection = editor.selection;

      // Try to extract the key from the current line using multi-format support
      const key = extractKeyAtCursor(document, selection.start);
      if (!key) {
        vscode.window.showWarningMessage('No configuration key found at cursor position');
        return;
      }
      const config = vscode.workspace.getConfiguration('camouflage');
      const excludeKeys = config.get('selective.excludeKeys', []) as string[];

      // Ask user if they want to add an exact match or a pattern
      const options = [
        `Exact match: "${key}"`,
        `Starts with: "${key}*"`,
        `Ends with: "*${key}"`,
        `Contains: "*${key}*"`,
      ];

      // Check if key or any pattern containing the key is already in exclude list
      const exactMatchIndex = excludeKeys.findIndex((pattern) => pattern === key);
      const startsWithIndex = excludeKeys.findIndex((pattern) => pattern === `${key}*`);
      const endsWithIndex = excludeKeys.findIndex((pattern) => pattern === `*${key}`);
      const containsIndex = excludeKeys.findIndex((pattern) => pattern === `*${key}*`);

      // If any pattern is found, remove it
      if (
        exactMatchIndex >= 0 ||
        startsWithIndex >= 0 ||
        endsWithIndex >= 0 ||
        containsIndex >= 0
      ) {
        if (exactMatchIndex >= 0) {
          excludeKeys.splice(exactMatchIndex, 1);
          vscode.window.showInformationMessage(`Removed exact match "${key}" from exclude list`);
        }
        if (startsWithIndex >= 0) {
          excludeKeys.splice(startsWithIndex, 1);
          vscode.window.showInformationMessage(`Removed pattern "${key}*" from exclude list`);
        }
        if (endsWithIndex >= 0) {
          excludeKeys.splice(endsWithIndex, 1);
          vscode.window.showInformationMessage(`Removed pattern "*${key}" from exclude list`);
        }
        if (containsIndex >= 0) {
          excludeKeys.splice(containsIndex, 1);
          vscode.window.showInformationMessage(`Removed pattern "*${key}*" from exclude list`);
        }
      } else {
        // Ask user which pattern to add
        const selectedOption = await vscode.window.showQuickPick(options, {
          placeHolder: 'Select pattern type for excluding this key',
        });

        if (!selectedOption) {
          return; // User cancelled
        }

        let patternToAdd: string;
        if (selectedOption === options[0]) {
          patternToAdd = key; // Exact match
        } else if (selectedOption === options[1]) {
          patternToAdd = `${key}*`; // Starts with
        } else if (selectedOption === options[2]) {
          patternToAdd = `*${key}`; // Ends with
        } else {
          patternToAdd = `*${key}*`; // Contains
        }

        // Add to exclude list
        excludeKeys.push(patternToAdd);
        vscode.window.showInformationMessage(`Added pattern "${patternToAdd}" to exclude list`);
      }

      // Update configuration
      config.update('selective.excludeKeys', excludeKeys, true);
      setTimeout(() => camouflage.updateDecorationType(), 0);
    })
  );

  // Add to exclude list
  context.subscriptions.push(
    vscode.commands.registerCommand('camouflage.addToExcludeList', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }

      const document = editor.document;
      const selection = editor.selection;

      // Try to extract the key from the current line using multi-format support
      const key = extractKeyAtCursor(document, selection.start);
      if (!key) {
        vscode.window.showWarningMessage('No configuration key found at cursor position');
        return;
      }
      const config = vscode.workspace.getConfiguration('camouflage');
      const excludeKeys = config.get('selective.excludeKeys', []) as string[];

      // Ask user if they want to add an exact match or a pattern
      const options = [
        `Exact match: "${key}"`,
        `Starts with: "${key}*"`,
        `Ends with: "*${key}"`,
        `Contains: "*${key}*"`,
      ];

      const selectedOption = await vscode.window.showQuickPick(options, {
        placeHolder: 'Select pattern type for excluding this key',
      });

      if (!selectedOption) {
        return; // User cancelled
      }

      let patternToAdd: string;
      if (selectedOption === options[0]) {
        patternToAdd = key; // Exact match
      } else if (selectedOption === options[1]) {
        patternToAdd = `${key}*`; // Starts with
      } else if (selectedOption === options[2]) {
        patternToAdd = `*${key}`; // Ends with
      } else {
        patternToAdd = `*${key}*`; // Contains
      }

      // Add to exclude list if not already there
      if (!excludeKeys.includes(patternToAdd)) {
        excludeKeys.push(patternToAdd);
        config.update('selective.excludeKeys', excludeKeys, true);
        vscode.window.showInformationMessage(`Added pattern "${patternToAdd}" to exclude list`);
        setTimeout(() => camouflage.updateDecorationType(), 0);
      } else {
        vscode.window.showInformationMessage(
          `Pattern "${patternToAdd}" is already in exclude list`
        );
      }
    })
  );

  // Set style to text
  context.subscriptions.push(
    vscode.commands.registerCommand('camouflage.setStyleText', async () => {
      await vscode.workspace
        .getConfiguration('camouflage')
        .update('appearance.style', 'text', true);
      vscode.window.showInformationMessage('Camouflage style set to text');
      setTimeout(() => camouflage.updateDecorationType(), 0);
    })
  );

  // Set style to dotted
  context.subscriptions.push(
    vscode.commands.registerCommand('camouflage.setStyleDotted', async () => {
      await vscode.workspace
        .getConfiguration('camouflage')
        .update('appearance.style', 'dotted', true);
      vscode.window.showInformationMessage('Camouflage style set to dotted');
      setTimeout(() => camouflage.updateDecorationType(), 0);
    })
  );

  // Set style to stars
  context.subscriptions.push(
    vscode.commands.registerCommand('camouflage.setStyleStars', async () => {
      await vscode.workspace
        .getConfiguration('camouflage')
        .update('appearance.style', 'stars', true);
      vscode.window.showInformationMessage('Camouflage style set to stars');
      setTimeout(() => camouflage.updateDecorationType(), 0);
    })
  );

  // Set style to scramble
  context.subscriptions.push(
    vscode.commands.registerCommand('camouflage.setStyleScramble', async () => {
      await vscode.workspace
        .getConfiguration('camouflage')
        .update('appearance.style', 'scramble', true);
      vscode.window.showInformationMessage('Camouflage style set to scramble');
      setTimeout(() => camouflage.updateDecorationType(), 0);
    })
  );

  // Exclude current file from Camouflage
  context.subscriptions.push(
    vscode.commands.registerCommand('camouflage.excludeFile', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active file to exclude');
        return;
      }

      const filePath = editor.document.fileName;
      const fileName = filePath.split('/').pop() || filePath;

      // Check if already excluded
      if (config.isFileExcluded(filePath)) {
        vscode.window.showInformationMessage(`"${fileName}" is already excluded`);
        return;
      }

      await config.addExcludedFile(filePath);
      vscode.window.showInformationMessage(`Excluded "${fileName}" from Camouflage`);
      setTimeout(() => camouflage.updateDecorationType(), 0);
    })
  );

  // Include current file (remove from exclusion list)
  context.subscriptions.push(
    vscode.commands.registerCommand('camouflage.includeFile', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active file to include');
        return;
      }

      const filePath = editor.document.fileName;
      const fileName = filePath.split('/').pop() || filePath;

      // Check if not excluded
      if (!config.isFileExcluded(filePath)) {
        vscode.window.showInformationMessage(`"${fileName}" is not in the exclusion list`);
        return;
      }

      await config.removeExcludedFile(filePath);
      vscode.window.showInformationMessage(`Included "${fileName}" back in Camouflage`);
      setTimeout(() => camouflage.updateDecorationType(), 0);
    })
  );
}

/**
 * This method is called when your extension is deactivated
 */
export function deactivate(): void {
  // Clean up resources to prevent memory leaks
  if (camouflage) {
    camouflage.dispose();
  }
}
