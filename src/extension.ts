// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { Camouflage } from './core/camouflage';
import { PasswordManager } from './security/password-manager';
import * as config from './utils/config';

let camouflage: Camouflage;

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
    vscode.commands.registerCommand('camouflage.hide', async () => {
      await camouflage.hide();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('camouflage.reveal', async () => {
      await camouflage.reveal();
    })
  );

  // Toggle selective hiding
  context.subscriptions.push(
    vscode.commands.registerCommand('camouflage.toggleSelective', async () => {
      const isEnabled = config.isSelectiveHidingEnabled();
      await config.getConfig().update('selective.enabled', !isEnabled, true);
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
      const line = document.lineAt(selection.start.line).text;

      // Try to extract the key from the current line
      const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line);
      if (!match) {
        vscode.window.showWarningMessage('No environment variable found at cursor position');
        return;
      }

      const key = match[1];
      const excludeKeys = config.getExcludeKeys();

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
      await config.getConfig().update('selective.excludeKeys', excludeKeys, true);
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
      const line = document.lineAt(selection.start.line).text;

      // Try to extract the key from the current line
      const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line);
      if (!match) {
        vscode.window.showWarningMessage('No environment variable found at cursor position');
        return;
      }

      const key = match[1];
      const excludeKeys = config.getExcludeKeys();

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
        await config.getConfig().update('selective.excludeKeys', excludeKeys, true);
        vscode.window.showInformationMessage(`Added pattern "${patternToAdd}" to exclude list`);
        setTimeout(() => camouflage.updateDecorationType(), 0);
      } else {
        vscode.window.showInformationMessage(
          `Pattern "${patternToAdd}" is already in exclude list`
        );
      }
    })
  );

  // Set password protection
  context.subscriptions.push(
    vscode.commands.registerCommand('camouflage.setPassword', async () => {
      const passwordManager = PasswordManager.getInstance();
      const success = await passwordManager.setPassword();

      if (success) {
        // Enable password protection in settings
        await config.enablePasswordProtection();
        camouflage.updateStatusBarItem();
      }
    })
  );

  // Clear remembered password
  context.subscriptions.push(
    vscode.commands.registerCommand('camouflage.clearPassword', () => {
      const passwordManager = PasswordManager.getInstance();
      passwordManager.clearPassword();
      vscode.window.showInformationMessage('Password cleared from memory');
    })
  );

  // Check if password protection is enabled but no password is set
  const passwordProtectionEnabled = config.isPasswordProtectionEnabled();

  if (passwordProtectionEnabled) {
    const passwordManager = PasswordManager.getInstance();
    if (!passwordManager.isPasswordProtectionEnabled()) {
      // Prompt user to set a password
      vscode.window
        .showInformationMessage(
          'Password protection is enabled but no password is set',
          'Set Password',
          'Disable Protection'
        )
        .then(async (selection) => {
          if (selection === 'Set Password') {
            await passwordManager.setPassword();
          } else if (selection === 'Disable Protection') {
            await config.disablePasswordProtection();
          }
        });
    }
  }
}

/**
 * This method is called when your extension is deactivated
 */
export function deactivate(): void {
  // Clean up resources if needed
}
