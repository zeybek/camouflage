import * as vscode from 'vscode';
import { Debounce, HandleErrors, Log, MeasurePerformance, ValidateConfig } from '../decorators';
import { generateHiddenText } from '../lib/text-generator';
import { PasswordManager } from '../security/password-manager';
import * as config from '../utils/config';
import { ENV_VAR_REGEX, isEnvFile } from '../utils/file';
import { HiddenTextStyle } from './types';

/**
 * Class to manage value masking in environment files
 */
export class Camouflage {
  private decorationType: vscode.TextEditorDecorationType | undefined;
  private activeEditor: vscode.TextEditor | undefined;
  private statusBarItem: vscode.StatusBarItem;

  constructor() {
    this.activeEditor = vscode.window.activeTextEditor;
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.updateStatusBarItem();
    this.updateDecorationType();
  }

  /**
   * Update status bar item
   */
  @HandleErrors()
  public updateStatusBarItem(): void {
    const isEnabled = config.isEnabled();
    const isSelectiveEnabled = config.isSelectiveHidingEnabled();
    const passwordManager = PasswordManager.getInstance();
    const isPasswordProtected = passwordManager.isPasswordProtectionEnabled();
    const passwordIcon = isPasswordProtected ? ' 🔒' : '';

    // Update status bar text based on both enabled state and selective mode
    if (isEnabled) {
      if (isSelectiveEnabled) {
        this.statusBarItem.text = `$(eye-closed) Camouflage: Selective${passwordIcon}`;
        this.statusBarItem.tooltip = 'Camouflage is ON (Selective Mode)\nClick to disable';
      } else {
        this.statusBarItem.text = `$(eye-closed) Camouflage: On${passwordIcon}`;
        this.statusBarItem.tooltip = 'Camouflage is ON (All values hidden)\nClick to disable';
      }
      this.statusBarItem.command = 'camouflage.reveal';
    } else {
      this.statusBarItem.text = `$(eye) Camouflage: Off${passwordIcon}`;
      this.statusBarItem.tooltip = 'Camouflage is OFF\nClick to enable';
      this.statusBarItem.command = 'camouflage.hide';
    }

    // Only show status bar item when viewing a .env file
    if (this.activeEditor && isEnvFile(this.activeEditor.document.fileName)) {
      this.statusBarItem.show();
    } else {
      this.statusBarItem.hide();
    }
  }

  /**
   * Initialize the camouflage
   */
  @Log('Initializing camouflage')
  @HandleErrors()
  public initialize(context: vscode.ExtensionContext): void {
    // Update decoration type
    this.updateDecorationType();

    // Force immediate update for the current file
    if (this.activeEditor) {
      this.updateDecorations();
    }

    // Listen for editor changes
    context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        this.activeEditor = editor;
        if (editor) {
          this.updateStatusBarItem();

          // Only update decorations if this is an .env file
          if (isEnvFile(editor.document.fileName)) {
            // Immediately update decorations without debounce when switching editors
            this.updateDecorations();
          }
        }
      })
    );

    // Listen for document changes
    context.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (this.activeEditor && event.document === this.activeEditor.document) {
          this.triggerUpdateDecorations();
        }
      })
    );

    // Listen for configuration changes
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('camouflage')) {
          this.updateDecorationType();
          this.updateStatusBarItem();
        }
      })
    );

    // Register status bar item
    context.subscriptions.push(this.statusBarItem);
  }

  /**
   * Update the decoration type based on configuration
   */
  @ValidateConfig()
  @HandleErrors()
  @Log('Updating decoration type')
  public updateDecorationType(): void {
    if (this.decorationType) {
      this.decorationType.dispose();
    }

    const isEnabled = config.isEnabled();
    let decorationOptions: vscode.DecorationRenderOptions = {
      backgroundColor: 'transparent',
      color: 'transparent',
      textDecoration: 'none; display: none',
    };

    if (isEnabled) {
      decorationOptions = {
        letterSpacing: '-1000em',
        color: 'transparent',
        textDecoration: 'none',
        opacity: '0',
        cursor: 'default',
      };
    }

    this.decorationType = vscode.window.createTextEditorDecorationType(decorationOptions);

    if (this.activeEditor) {
      // Immediately update decorations without debounce
      this.updateDecorations();
    }
  }

  /**
   * Hide sensitive values
   */
  @HandleErrors()
  @Log('Hiding sensitive values')
  public async hide(): Promise<void> {
    await config.enable();
    this.updateStatusBarItem();
    this.updateDecorationType();
  }

  /**
   * Reveal sensitive values
   */
  @HandleErrors()
  @Log('Revealing sensitive values')
  public async reveal(): Promise<void> {
    // Check password if protection is enabled
    const passwordManager = PasswordManager.getInstance();
    if (passwordManager.isPasswordProtectionEnabled()) {
      const isVerified = await passwordManager.verifyPassword();
      if (!isVerified) {
        vscode.window.showErrorMessage('Password verification failed. Values will remain hidden.');
        return; // Password verification failed
      }
    }

    await config.disable();
    this.updateStatusBarItem();
    this.updateDecorationType();

    // If timeout is enabled, schedule auto-hide
    const timeout = config.getPasswordTimeout();
    if (timeout > 0 && passwordManager.isPasswordProtectionEnabled()) {
      vscode.window.showInformationMessage(
        `Values will be automatically hidden after ${timeout} seconds`
      );
      setTimeout(() => {
        this.hide();
      }, timeout * 1000);
    }
  }

  /**
   * Update decorations in the editor
   */
  @MeasurePerformance()
  @HandleErrors()
  private updateDecorations(): void {
    if (!this.activeEditor || !this.decorationType) {
      return;
    }

    // Check if this is an .env file
    const fileName = this.activeEditor.document.fileName;
    if (!isEnvFile(fileName)) {
      return;
    }

    // Check if the extension is enabled
    if (!config.isEnabled()) {
      this.activeEditor.setDecorations(this.decorationType, []);
      return;
    }

    // Prepare variables before processing the text
    const style = config.getConfig().get('appearance.style', 'text') as HiddenTextStyle;
    const textColor = config.getTextColor();
    const backgroundColor = config.getBackgroundColor();
    const showPreview = config.shouldShowPreview();
    const hoverMessage = config.getHoverMessage();

    const text = this.activeEditor.document.getText();
    const decorations: vscode.DecorationOptions[] = [];

    // Reset regex lastIndex to ensure it starts from the beginning
    ENV_VAR_REGEX.lastIndex = 0;

    // Find all environment variables
    let match;
    while ((match = ENV_VAR_REGEX.exec(text))) {
      const key = match[1];
      const value = match[2];

      // Skip empty values
      if (!value.trim()) {
        continue;
      }

      // Check if this key should be excluded
      const excludeKeys = config.getExcludeKeys();
      if (excludeKeys.length > 0) {
        const isExcluded = excludeKeys.some((pattern) => {
          // Handle different pattern types for exclude keys:
          // *KEY* -> contains KEY anywhere
          // KEY* -> starts with KEY
          // *KEY -> ends with KEY
          // KEY -> exact match
          let regexPattern: string;

          if (pattern.startsWith('*') && pattern.endsWith('*')) {
            // *KEY* -> contains KEY anywhere
            regexPattern = pattern.slice(1, -1);
          } else if (pattern.startsWith('*')) {
            // *KEY -> ends with KEY
            regexPattern = pattern.slice(1) + '$';
          } else if (pattern.endsWith('*')) {
            // KEY* -> starts with KEY
            regexPattern = '^' + pattern.slice(0, -1);
          } else {
            // KEY -> exact match
            regexPattern = '^' + pattern + '$';
          }

          const regex = new RegExp(regexPattern, 'i');
          return regex.test(key);
        });

        if (isExcluded) {
          continue;
        }
      }

      // Check if selective hiding is enabled
      const isSelectiveEnabled = config.isSelectiveHidingEnabled();

      if (isSelectiveEnabled) {
        // Only hide if key matches one of the patterns
        const keyPatterns = config.getKeyPatterns();
        const matchesPattern = keyPatterns.some((pattern) => {
          // Handle different pattern types:
          // *KEY* -> contains KEY anywhere
          // KEY* -> starts with KEY
          // *KEY -> ends with KEY
          // KEY -> exact match
          let regexPattern: string;

          if (pattern.startsWith('*') && pattern.endsWith('*')) {
            // *KEY* -> contains KEY anywhere
            regexPattern = pattern.slice(1, -1);
          } else if (pattern.startsWith('*')) {
            // *KEY -> ends with KEY
            regexPattern = pattern.slice(1) + '$';
          } else if (pattern.endsWith('*')) {
            // KEY* -> starts with KEY
            regexPattern = '^' + pattern.slice(0, -1);
          } else {
            // KEY -> exact match
            regexPattern = '^' + pattern + '$';
          }

          const regex = new RegExp(regexPattern, 'i');
          return regex.test(key);
        });

        if (!matchesPattern) {
          continue;
        }
      }

      // Find the position where the value starts (after the equals sign)
      const equalsSignPos = match[0].indexOf('=');
      const valueStartPos = this.activeEditor.document.positionAt(match.index + equalsSignPos + 1);
      const valueEndPos = this.activeEditor.document.positionAt(match.index + match[0].length);

      // Generate hidden text based on value length
      const valueLength = value.length;
      const hiddenText = generateHiddenText(style, valueLength);

      // Create a decoration for the value part
      const decoration = {
        range: new vscode.Range(valueStartPos, valueEndPos),
        renderOptions: {
          after: {
            contentText: hiddenText,
            color: textColor,
            backgroundColor,
            margin: '0 2px',
          },
        },
        hoverMessage: showPreview ? `${hoverMessage}\nValue: ${value}` : hoverMessage,
      };

      decorations.push(decoration);
    }

    this.activeEditor.setDecorations(this.decorationType, decorations);
  }

  /**
   * Trigger an update of decorations with debounce
   */
  @Debounce(50)
  private triggerUpdateDecorations(): void {
    this.updateDecorations();
  }
}
