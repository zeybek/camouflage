import * as vscode from 'vscode';
import { Debounce, HandleErrors, Log, MeasurePerformance, ValidateConfig } from '../decorators';
import { generateHiddenText } from '../lib/text-generator';
import { configureParserRegistry } from '../parsers';
import * as config from '../utils/config';
import {
  findAllEnvVariables,
  isSupportedFile,
  ParsedVariable,
  parseFileContent,
} from '../utils/file';
import { matchesAnyPattern } from '../utils/pattern-matcher';
import { HiddenTextStyle } from './types';

/**
 * Class to manage value masking in configuration files
 * Supports multiple formats: .env, .sh, .json, .yaml, .properties, .toml
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

    // Configure parser registry from settings
    this.configureParserRegistry();

    if (this.activeEditor && isSupportedFile(this.activeEditor.document.fileName)) {
      this.updateDecorations();
    }
  }

  /**
   * Configure the parser registry based on user settings
   */
  private configureParserRegistry(): void {
    const enabledParsers = config.getEnabledParsers();
    const jsonNestedDepth = config.getJsonNestedDepth();
    const yamlNestedDepth = config.getYamlNestedDepth();

    configureParserRegistry(enabledParsers, {
      json: { maxNestedDepth: jsonNestedDepth },
      yaml: { maxNestedDepth: yamlNestedDepth },
    });
  }

  /**
   * Update status bar item
   */
  private updateStatusBarItem(): void {
    // Defensive check: Don't update if disposed
    if (!this.statusBarItem) {
      return;
    }

    const isEnabled = config.isEnabled();
    const isSelectiveEnabled = config.isSelectiveHidingEnabled();

    // Update status bar text based on both enabled state and selective mode
    if (isEnabled) {
      if (isSelectiveEnabled) {
        this.statusBarItem.text = '$(eye-closed) Camouflage: Selective';
        this.statusBarItem.tooltip = 'Camouflage is ON (Selective Mode)\nClick to disable';
      } else {
        this.statusBarItem.text = '$(eye-closed) Camouflage: On';
        this.statusBarItem.tooltip = 'Camouflage is ON (All values hidden)\nClick to disable';
      }
      this.statusBarItem.command = 'camouflage.reveal';
    } else {
      this.statusBarItem.text = '$(eye) Camouflage: Off';
      this.statusBarItem.tooltip = 'Camouflage is OFF\nClick to enable';
      this.statusBarItem.command = 'camouflage.hide';
    }

    // Show status bar item when viewing a supported file
    if (this.activeEditor && isSupportedFile(this.activeEditor.document.fileName)) {
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

          // Only update decorations if this is a supported file
          if (isSupportedFile(editor.document.fileName)) {
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
          // Reconfigure parser registry if parser settings changed
          this.configureParserRegistry();
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
    // Clean up existing decoration type
    if (this.decorationType) {
      this.decorationType.dispose();
      this.decorationType = undefined;
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
   * Update decorations in the editor
   * Uses the new parser system for multi-format support
   */
  @MeasurePerformance()
  @HandleErrors()
  private updateDecorations(): void {
    if (!this.activeEditor || !this.decorationType) {
      return;
    }

    // Check if this is a supported file
    const fileName = this.activeEditor.document.fileName;
    if (!isSupportedFile(fileName)) {
      return;
    }

    // Check if the extension is enabled
    if (!config.isEnabled()) {
      this.activeEditor.setDecorations(this.decorationType, []);
      return;
    }

    // Prepare variables before processing the text
    const style = vscode.workspace
      .getConfiguration('camouflage')
      .get('appearance.style', 'text') as HiddenTextStyle;
    const textColor = config.getTextColor();
    const backgroundColor = config.getBackgroundColor();
    const showPreview = config.shouldShowPreview();
    const hoverMessage = config.getHoverMessage();

    const text = this.activeEditor.document.getText();
    const decorations: vscode.DecorationOptions[] = [];

    // Try to use the new parser system first
    const parsedVariables = parseFileContent(fileName, text);

    if (parsedVariables.length > 0) {
      // Use new parser system
      this.processParserResults(
        parsedVariables,
        decorations,
        style,
        textColor,
        backgroundColor,
        showPreview,
        hoverMessage
      );
    } else {
      // Fallback to legacy system for .env files
      this.processLegacyEnvFile(
        text,
        decorations,
        style,
        textColor,
        backgroundColor,
        showPreview,
        hoverMessage
      );
    }

    this.activeEditor.setDecorations(this.decorationType, decorations);
  }

  /**
   * Process results from the new parser system
   */
  private processParserResults(
    variables: ParsedVariable[],
    decorations: vscode.DecorationOptions[],
    style: HiddenTextStyle,
    textColor: string,
    backgroundColor: string,
    showPreview: boolean,
    hoverMessage: string
  ): void {
    if (!this.activeEditor) {
      return;
    }

    const excludeKeys = config.getExcludeKeys();
    const isSelectiveEnabled = config.isSelectiveHidingEnabled();
    const keyPatterns = config.getKeyPatterns();

    for (const variable of variables) {
      const { key, value, startIndex, endIndex, isCommented, isNested } = variable;

      // Skip empty values
      if (!value.trim()) {
        continue;
      }

      // Check if this key should be excluded
      if (excludeKeys.length > 0) {
        const isExcluded = matchesAnyPattern(key, excludeKeys);
        if (isExcluded) {
          continue;
        }
      }

      // Check if selective hiding is enabled
      if (isSelectiveEnabled) {
        // Only hide if key matches one of the patterns
        const matchesPattern = matchesAnyPattern(key, keyPatterns);
        if (!matchesPattern) {
          continue;
        }
      }

      // Calculate positions
      const valueStartPos = this.activeEditor.document.positionAt(startIndex);
      const valueEndPos = this.activeEditor.document.positionAt(endIndex);

      // Generate hidden text based on value length and style
      const valueLength = value.length;
      const hiddenText =
        style === HiddenTextStyle.SCRAMBLE
          ? generateHiddenText(style, valueLength, value)
          : generateHiddenText(style, valueLength);

      // Create additional info for nested keys
      const nestedInfo = isNested ? ' (nested)' : '';
      const commentedInfo = isCommented ? ' (commented)' : '';

      // Create a decoration for the value part
      const decoration: vscode.DecorationOptions = {
        range: new vscode.Range(valueStartPos, valueEndPos),
        renderOptions: {
          after: {
            contentText: hiddenText,
            color: textColor,
            backgroundColor,
            margin: '0 2px',
          },
        },
        hoverMessage: showPreview
          ? `${hoverMessage}${commentedInfo}${nestedInfo}\nKey: ${key}\nValue: ${value}`
          : `${hoverMessage}${commentedInfo}${nestedInfo}\nKey: ${key}`,
      };

      decorations.push(decoration);
    }
  }

  /**
   * Process .env files using the legacy system (backward compatibility)
   */
  private processLegacyEnvFile(
    text: string,
    decorations: vscode.DecorationOptions[],
    style: HiddenTextStyle,
    textColor: string,
    backgroundColor: string,
    showPreview: boolean,
    hoverMessage: string
  ): void {
    // Find all environment variables (both regular and commented)
    const { regular: regularMatches, commented: commentedMatches } = findAllEnvVariables(text);

    // Helper function to process matches
    const processMatches = (matches: RegExpMatchArray[], isCommented: boolean = false) => {
      for (const match of matches) {
        const key = match[1];
        const value = match[2];

        // Skip empty values
        if (!value.trim()) {
          continue;
        }

        // Check if this key should be excluded
        const excludeKeys = config.getExcludeKeys();
        if (excludeKeys.length > 0) {
          const isExcluded = matchesAnyPattern(key, excludeKeys);
          if (isExcluded) {
            continue;
          }
        }

        // Check if selective hiding is enabled
        const isSelectiveEnabled = config.isSelectiveHidingEnabled();

        if (isSelectiveEnabled) {
          // Only hide if key matches one of the patterns
          const keyPatterns = config.getKeyPatterns();
          const matchesPattern = matchesAnyPattern(key, keyPatterns);

          if (!matchesPattern) {
            continue;
          }
        }

        // Find the position where the value starts (after the equals sign)
        if (match.index === undefined) {
          continue; // Skip if index is undefined (shouldn't happen with matchAll, but for type safety)
        }

        if (!this.activeEditor) {
          continue; // Skip if activeEditor is undefined
        }

        const equalsSignPos = match[0].indexOf('=');
        const valueStartPos = this.activeEditor.document.positionAt(
          match.index + equalsSignPos + 1
        );
        const valueEndPos = this.activeEditor.document.positionAt(match.index + match[0].length);

        // Generate hidden text based on value length and style
        const valueLength = value.length;
        const hiddenText =
          style === HiddenTextStyle.SCRAMBLE
            ? generateHiddenText(style, valueLength, value)
            : generateHiddenText(style, valueLength);

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
          hoverMessage: showPreview
            ? `${hoverMessage}${isCommented ? ' (commented)' : ''}\nValue: ${value}`
            : `${hoverMessage}${isCommented ? ' (commented)' : ''}`,
        };

        decorations.push(decoration);
      }
    };

    // Process regular environment variables
    processMatches(regularMatches, false);

    // Process commented environment variables
    processMatches(commentedMatches, true);
  }

  /**
   * Trigger an update of decorations with debounce
   */
  @Debounce(50)
  private triggerUpdateDecorations(): void {
    this.updateDecorations();
  }

  /**
   * Dispose all resources to prevent memory leaks
   * Should be called when the extension is deactivated
   */
  @Log('Disposing camouflage resources')
  @HandleErrors()
  public dispose(): void {
    // Dispose decoration type if it exists
    if (this.decorationType) {
      this.decorationType.dispose();
      this.decorationType = undefined;
    }

    // Dispose status bar item if it exists
    if (this.statusBarItem) {
      this.statusBarItem.dispose();
    }

    // Clear editor reference to prevent potential memory leaks
    this.activeEditor = undefined;
  }
}
