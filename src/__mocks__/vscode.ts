/**
 * VS Code API mock for testing
 */
import * as vscode from 'vscode';

// Create a mock implementation of the VS Code API
const mock = {
  // Mock for VS Code's window namespace
  window: {
    activeTextEditor: undefined as vscode.TextEditor | undefined,
    visibleTextEditors: [] as vscode.TextEditor[],
    showInformationMessage: function (): Thenable<string | undefined> {
      return Promise.resolve(undefined);
    },
    showWarningMessage: function (): Thenable<string | undefined> {
      return Promise.resolve(undefined);
    },
    showErrorMessage: function (): Thenable<string | undefined> {
      return Promise.resolve(undefined);
    },
    createTextEditorDecorationType: function (): vscode.TextEditorDecorationType {
      return { dispose: function () {} } as vscode.TextEditorDecorationType;
    },
    createStatusBarItem: function (): vscode.StatusBarItem {
      return {
        show: function () {},
        hide: function () {},
        dispose: function () {},
        text: '',
        tooltip: '',
        command: '',
      } as vscode.StatusBarItem;
    },
    onDidChangeActiveTextEditor: function (
      _listener: (e: vscode.TextEditor | undefined) => any
    ): vscode.Disposable {
      return { dispose: function () {} };
    },
    showTextDocument: function (_document: vscode.TextDocument): Thenable<vscode.TextEditor> {
      return Promise.resolve({} as vscode.TextEditor);
    },
  },

  // Mock for VS Code's workspace namespace
  workspace: {
    getConfiguration: function (_section?: string): vscode.WorkspaceConfiguration {
      return {
        get: function <T>(_key: string, defaultValue?: T): T | undefined {
          return defaultValue;
        },
        update: function (_key: string, _value: any): Thenable<void> {
          return Promise.resolve();
        },
        has: function (_key: string): boolean {
          return true;
        },
        inspect: function (_key: string) {
          return undefined;
        },
      } as vscode.WorkspaceConfiguration;
    },
    onDidChangeConfiguration: function (
      _listener: (e: vscode.ConfigurationChangeEvent) => any
    ): vscode.Disposable {
      return { dispose: function () {} };
    },
    onDidChangeTextDocument: function (
      _listener: (e: vscode.TextDocumentChangeEvent) => any
    ): vscode.Disposable {
      return { dispose: function () {} };
    },
    getWorkspaceFolder: function (_uri: vscode.Uri): vscode.WorkspaceFolder | undefined {
      return undefined;
    },
  },

  // Mock for VS Code's commands namespace
  commands: {
    registerCommand: function (
      _command: string,
      _callback: (...args: any[]) => any
    ): vscode.Disposable {
      return { dispose: function () {} };
    },
    executeCommand: function <T>(_command: string, ..._rest: any[]): Thenable<T | undefined> {
      return Promise.resolve(undefined);
    },
    getCommands: function (_filterInternal?: boolean): Thenable<string[]> {
      return Promise.resolve([
        'camouflage.hide',
        'camouflage.reveal',
        'camouflage.toggleValue',
        'camouflage.toggleSelective',
        'camouflage.addToExcludeList',
      ]);
    },
  },

  // Mock for VS Code's languages namespace
  languages: {
    registerHoverProvider: function (
      _selector: vscode.DocumentSelector,
      _provider: vscode.HoverProvider
    ): vscode.Disposable {
      return { dispose: function () {} };
    },
    getLanguages: function (): Thenable<string[]> {
      return Promise.resolve(['javascript', 'typescript']);
    },
  },

  // Mock for VS Code's extensions namespace
  extensions: {
    getExtension: function <T>(extensionId: string): vscode.Extension<T> | undefined {
      if (extensionId === 'zeybek.camouflage') {
        return {
          id: 'zeybek.camouflage',
          extensionPath: '/path/to/extension',
          extensionUri: {} as vscode.Uri,
          isActive: true,
          packageJSON: { version: '0.0.1' },
          extensionKind: vscode.ExtensionKind.UI,
          activate: function (): Thenable<T> {
            return Promise.resolve({} as T);
          },
          exports: {} as T,
        };
      }
      return undefined;
    },
    all: [] as vscode.Extension<any>[],
  },

  // Mock for VS Code's enums
  StatusBarAlignment: {
    Left: 1,
    Right: 2,
  } as typeof vscode.StatusBarAlignment,

  // Mock for VS Code's classes
  Range: class MockRange implements vscode.Range {
    readonly start: vscode.Position;
    readonly end: vscode.Position;
    readonly isEmpty: boolean;
    readonly isSingleLine: boolean;

    constructor(startLine: number, startCharacter: number, endLine: number, endCharacter: number) {
      this.start = new MockPosition(startLine, startCharacter);
      this.end = new MockPosition(endLine, endCharacter);
      this.isEmpty = false;
      this.isSingleLine = startLine === endLine;
    }

    contains(_position: vscode.Position): boolean {
      return false;
    }

    isEqual(_other: vscode.Range): boolean {
      return false;
    }

    intersection(_range: vscode.Range): vscode.Range | undefined {
      return undefined;
    }

    union(_range: vscode.Range): vscode.Range {
      return new MockRange(
        this.start.line,
        this.start.character,
        this.end.line,
        this.end.character
      );
    }

    with(change: { start?: vscode.Position; end?: vscode.Position }): vscode.Range;
    with(start?: vscode.Position, end?: vscode.Position): vscode.Range;
    with(
      startOrChange?: vscode.Position | { start?: vscode.Position; end?: vscode.Position },
      end?: vscode.Position
    ): vscode.Range {
      if (startOrChange && typeof (startOrChange as any).start !== 'undefined') {
        // It's a change object
        const change = startOrChange as { start?: vscode.Position; end?: vscode.Position };
        return new MockRange(
          change.start?.line ?? this.start.line,
          change.start?.character ?? this.start.character,
          change.end?.line ?? this.end.line,
          change.end?.character ?? this.end.character
        );
      }
      // It's a start position
      const start = startOrChange as vscode.Position | undefined;
      return new MockRange(
        start?.line ?? this.start.line,
        start?.character ?? this.start.character,
        end?.line ?? this.end.line,
        end?.character ?? this.end.character
      );
    }
  },

  Position: class MockPosition implements vscode.Position {
    readonly line: number;
    readonly character: number;

    constructor(line: number, character: number) {
      this.line = line;
      this.character = character;
    }

    isBefore(_other: vscode.Position): boolean {
      return false;
    }

    isBeforeOrEqual(_other: vscode.Position): boolean {
      return false;
    }

    isAfter(_other: vscode.Position): boolean {
      return false;
    }

    isAfterOrEqual(_other: vscode.Position): boolean {
      return false;
    }

    isEqual(other: vscode.Position): boolean {
      return this.line === other.line && this.character === other.character;
    }

    compareTo(_other: vscode.Position): number {
      return 0;
    }

    translate(change: { lineDelta?: number; characterDelta?: number }): vscode.Position;
    translate(lineDelta?: number, characterDelta?: number): vscode.Position;
    translate(
      lineDeltaOrChange?: number | { lineDelta?: number; characterDelta?: number },
      characterDelta?: number
    ): vscode.Position {
      if (lineDeltaOrChange && typeof lineDeltaOrChange === 'object') {
        // It's a change object
        return new MockPosition(
          this.line + (lineDeltaOrChange.lineDelta || 0),
          this.character + (lineDeltaOrChange.characterDelta || 0)
        );
      }
      // It's a lineDelta
      return new MockPosition(
        this.line + (lineDeltaOrChange || 0),
        this.character + (characterDelta || 0)
      );
    }

    with(change: { line?: number; character?: number }): vscode.Position;
    with(line?: number, character?: number): vscode.Position;
    with(
      lineOrChange?: number | { line?: number; character?: number },
      character?: number
    ): vscode.Position {
      if (lineOrChange && typeof lineOrChange === 'object') {
        // It's a change object
        return new MockPosition(
          lineOrChange.line !== undefined ? lineOrChange.line : this.line,
          lineOrChange.character !== undefined ? lineOrChange.character : this.character
        );
      }
      // It's a line
      return new MockPosition(
        lineOrChange !== undefined ? lineOrChange : this.line,
        character !== undefined ? character : this.character
      );
    }
  },

  // Mock for VS Code's extension context
  ExtensionContext: class implements Partial<vscode.ExtensionContext> {
    subscriptions: { dispose(): any }[];
    extension: vscode.Extension<any>;
    extensionPath: string;
    extensionUri: vscode.Uri;
    globalState: vscode.Memento & { setKeysForSync(keys: readonly string[]): void };
    workspaceState: vscode.Memento;
    extensionMode: vscode.ExtensionMode;
    storageUri: vscode.Uri | undefined;
    globalStorageUri: vscode.Uri;
    logUri: vscode.Uri;
    logPath: string;

    constructor() {
      this.subscriptions = [];
      this.extension = { id: 'zeybek.camouflage' } as vscode.Extension<any>;
      this.extensionPath = '/path/to/extension';
      this.extensionUri = {} as vscode.Uri;
      this.globalState = {
        get: function <T>(_key: string): T | undefined {
          return undefined;
        },
        update: function (_key: string, _value: any): Thenable<void> {
          return Promise.resolve();
        },
        keys: function (): readonly string[] {
          return [];
        },
        setKeysForSync: function (_keys: readonly string[]): void {},
      };
      this.workspaceState = {
        get: function <T>(_key: string): T | undefined {
          return undefined;
        },
        update: function (_key: string, _value: any): Thenable<void> {
          return Promise.resolve();
        },
        keys: function (): readonly string[] {
          return [];
        },
      };
      this.extensionMode = vscode.ExtensionMode.Test;
      this.storageUri = {} as vscode.Uri;
      this.globalStorageUri = {} as vscode.Uri;
      this.logUri = {} as vscode.Uri;
      this.logPath = '';
    }

    asAbsolutePath(relativePath: string): string {
      return relativePath;
    }
  },

  // Mock for VS Code's disposable
  Disposable: {
    from: function (..._disposables: { dispose(): any }[]): vscode.Disposable {
      return { dispose: function () {} };
    },
  } as typeof vscode.Disposable,

  // Mock for VS Code's ThemeColor
  ThemeColor: class implements vscode.ThemeColor {
    id: string;

    constructor(id: string) {
      this.id = id;
    }
  },
};

// Helper class for Position
class MockPosition implements vscode.Position {
  readonly line: number;
  readonly character: number;

  constructor(line: number, character: number) {
    this.line = line;
    this.character = character;
  }

  isBefore(_other: vscode.Position): boolean {
    return false;
  }

  isBeforeOrEqual(_other: vscode.Position): boolean {
    return false;
  }

  isAfter(_other: vscode.Position): boolean {
    return false;
  }

  isAfterOrEqual(_other: vscode.Position): boolean {
    return false;
  }

  isEqual(other: vscode.Position): boolean {
    return this.line === other.line && this.character === other.character;
  }

  compareTo(_other: vscode.Position): number {
    return 0;
  }

  translate(change: { lineDelta?: number; characterDelta?: number }): vscode.Position;
  translate(lineDelta?: number, characterDelta?: number): vscode.Position;
  translate(
    lineDeltaOrChange?: number | { lineDelta?: number; characterDelta?: number },
    characterDelta?: number
  ): vscode.Position {
    if (lineDeltaOrChange && typeof lineDeltaOrChange === 'object') {
      // It's a change object
      return new MockPosition(
        this.line + (lineDeltaOrChange.lineDelta || 0),
        this.character + (lineDeltaOrChange.characterDelta || 0)
      );
    }
    // It's a lineDelta
    return new MockPosition(
      this.line + (lineDeltaOrChange || 0),
      this.character + (characterDelta || 0)
    );
  }

  with(change: { line?: number; character?: number }): vscode.Position;
  with(line?: number, character?: number): vscode.Position;
  with(
    lineOrChange?: number | { line?: number; character?: number },
    character?: number
  ): vscode.Position {
    if (lineOrChange && typeof lineOrChange === 'object') {
      // It's a change object
      return new MockPosition(
        lineOrChange.line !== undefined ? lineOrChange.line : this.line,
        lineOrChange.character !== undefined ? lineOrChange.character : this.character
      );
    }
    // It's a line
    return new MockPosition(
      lineOrChange !== undefined ? lineOrChange : this.line,
      character !== undefined ? character : this.character
    );
  }
}

// Export both default and named exports for compatibility
export default mock;
export const window = mock.window;
export const workspace = mock.workspace;
export const commands = mock.commands;
export const languages = mock.languages;
export const extensions = mock.extensions;
export const StatusBarAlignment = mock.StatusBarAlignment;
export const Range = mock.Range;
export const Position = mock.Position;
export const ExtensionContext = mock.ExtensionContext;
export const Disposable = mock.Disposable;
export const ThemeColor = mock.ThemeColor;
