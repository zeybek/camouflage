# Camouflage - Development Roadmap & TODO

> Last Updated: November 23, 2025
>
> **Current Version**: 1.1.1
>
> **Active Issues**: [#11 - Flashing Problem](https://github.com/zeybek/camouflage/issues/11)

---

## 🚨 Critical Issues

### Issue #11: Values Flash on File Open (STREAMING BLOCKER)

**Problem**: When opening `.env` files, sensitive values are briefly visible for a few frames. Not enough time for screenshots but enough for screen recordings - making the extension unusable for streaming.

**Root Cause**: Race condition in activation

```
1. User opens .env file
2. VS Code renders file (VALUES VISIBLE ⚠️)
3. Extension activates
4. Decorations applied
5. Values hidden
```

**Impact**:

- [ ] Breaks primary use case (streaming/recording)
- [ ] User trust issue
- [ ] Potential security concern

---

## 🎯 Solution Strategies

### Priority 1: Quick Wins (Target: v1.2.0)

#### [ ] Solution A: Instant Decoration in Constructor

**Difficulty**: Easy | **Impact**: High | **ETA**: 1-2 hours

```typescript
// File: src/core/camouflage.ts
constructor() {
  this.activeEditor = vscode.window.activeTextEditor;
  this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);

  // 🚀 IMMEDIATE APPLICATION
  if (this.activeEditor && isEnvFile(this.activeEditor.document.fileName)) {
    this.updateDecorationType();
    this.updateDecorations(); // Apply immediately, no setTimeout
  }

  this.updateStatusBarItem();
}
```

**Testing**:

- [ ] Test with VS Code restart
- [ ] Test with file switching
- [ ] Test with large files (>1000 lines)
- [ ] Record screen and verify no flashing

**Files to modify**:

- `src/core/camouflage.ts` (constructor)

---

#### [ ] Solution B: Eagerly Activate Extension

**Difficulty**: Easy | **Impact**: Medium | **ETA**: 30 minutes

```json
// File: package.json
"activationEvents": [
  "*",  // Activate on startup instead of waiting
  // Remove the following:
  // "onLanguage:dotenv",
  // "onStartupFinished"
]
```

**Trade-offs**:

- ✅ No flashing at all
- ❌ Extension loads even if user doesn't use .env files
- ❌ Slightly increased VS Code startup time

**Decision**: Implement but add config option to disable

---

#### [ ] Solution C: Loading Overlay/Placeholder

**Difficulty**: Medium | **Impact**: High | **ETA**: 3-4 hours

```typescript
// File: src/core/camouflage.ts

private showLoadingOverlay() {
  if (!this.activeEditor) return;

  const decoration = vscode.window.createTextEditorDecorationType({
    before: {
      contentText: '🔒 ',
      color: 'var(--vscode-editor-foreground)',
    },
    after: {
      contentText: ' Loading secure view...',
      color: 'var(--vscode-descriptionForeground)',
      backgroundColor: 'var(--vscode-editor-background)',
      fontStyle: 'italic',
    },
    isWholeLine: true,
  });

  // Apply to entire document
  const lastLine = this.activeEditor.document.lineCount - 1;
  const range = new vscode.Range(0, 0, lastLine, 0);

  this.activeEditor.setDecorations(decoration, [{ range }]);

  // Remove after decorations are ready
  setTimeout(() => decoration.dispose(), 50);
}
```

**Implementation Steps**:

- [ ] Create loading decoration type
- [ ] Show on file open
- [ ] Remove when actual decorations ready
- [ ] Add tests
- [ ] Add config option to disable

---

### Priority 2: Robust Solution (Target: v1.3.0)

#### [ ] Solution D: Virtual Document Provider (RECOMMENDED)

**Difficulty**: Hard | **Impact**: Very High | **ETA**: 1-2 days

This is the **proper solution** that guarantees zero flashing.

```typescript
// File: src/providers/camouflage-document-provider.ts (NEW FILE)

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { matchesAnyPattern } from '../utils/pattern-matcher';
import { generateHiddenText } from '../lib/text-generator';
import * as config from '../utils/config';

export class CamouflageDocumentProvider implements vscode.TextDocumentContentProvider {
  private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidChange = this._onDidChange.event;

  provideTextDocumentContent(uri: vscode.Uri): string {
    // Read the actual .env file
    const realPath = uri.with({ scheme: 'file' }).fsPath;
    const content = fs.readFileSync(realPath, 'utf8');

    // Mask values before VS Code even renders
    return this.maskContent(content);
  }

  private maskContent(content: string): string {
    if (!config.isEnabled()) {
      return content;
    }

    const style = config.getAppearanceStyle();
    const keyPatterns = config.getKeyPatterns();
    const excludeKeys = config.getExcludeKeys();
    const isSelectiveEnabled = config.isSelectiveHidingEnabled();

    return content.replace(
      /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/gm,
      (match, key, value) => {
        // Check exclude list
        if (excludeKeys.length > 0 && matchesAnyPattern(key, excludeKeys)) {
          return match;
        }

        // Check selective hiding
        if (isSelectiveEnabled && !matchesAnyPattern(key, keyPatterns)) {
          return match;
        }

        // Generate hidden text
        const hiddenText = generateHiddenText(style, value.length, value);
        return `${key}=${hiddenText}`;
      }
    );
  }

  public refresh(uri: vscode.Uri): void {
    this._onDidChange.fire(uri);
  }
}
```

**Integration in extension.ts**:

```typescript
// File: src/extension.ts

export function activate(context: vscode.ExtensionContext): void {
  const provider = new CamouflageDocumentProvider();

  // Register provider for camouflage:// scheme
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider('camouflage', provider)
  );

  // Intercept .env file opens
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(async (doc) => {
      if (isEnvFile(doc.fileName) && config.isEnabled()) {
        // Close original and open virtual version
        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
        const virtualUri = vscode.Uri.parse(`camouflage://${doc.uri.fsPath}`);
        await vscode.window.showTextDocument(virtualUri);
      }
    })
  );

  // Rest of activation...
}
```

**Implementation Checklist**:

- [ ] Create `CamouflageDocumentProvider` class
- [ ] Register provider with `camouflage://` scheme
- [ ] Intercept file opens and redirect to virtual documents
- [ ] Handle file saves (sync back to real file)
- [ ] Handle config changes (refresh virtual document)
- [ ] Add toggle command to switch between real/virtual view
- [ ] Write comprehensive tests
- [ ] Update documentation

**Testing Requirements**:

- [ ] Zero flashing on file open
- [ ] File saves work correctly
- [ ] Config changes reflect immediately
- [ ] Performance with large files
- [ ] Multiple .env files open simultaneously
- [ ] Works with git diff/merge
- [ ] Syntax highlighting preserved

**Challenges**:

- File editing limitations
- Git integration complexity
- User confusion (different URI scheme)

---

## 🎨 UI/UX Improvements

### [ ] Feature: Safe Mode Configuration

**Difficulty**: Easy | **Impact**: Medium | **ETA**: 1 hour

Add user-configurable option for flashing prevention strategy.

```json
// File: package.json
"camouflage.safeMode.enabled": {
  "type": "boolean",
  "default": true,
  "description": "Enable safe mode to prevent value flashing on file open"
},
"camouflage.safeMode.strategy": {
  "type": "string",
  "enum": ["instant", "overlay", "virtual"],
  "default": "instant",
  "description": "Strategy for preventing flashing: instant (quick), overlay (visual feedback), virtual (most secure)"
}
```

---

### [ ] Feature: Status Bar Loading State

**Difficulty**: Easy | **Impact**: Low | **ETA**: 30 minutes

```typescript
// File: src/core/camouflage.ts

private updateStatusBarItem(): void {
  if (!this.statusBarItem) return;

  const isEnabled = config.isEnabled();
  const isSelectiveEnabled = config.isSelectiveHidingEnabled();

  // Show loading state during decoration
  if (this.isApplyingDecorations) {
    this.statusBarItem.text = '$(loading~spin) Camouflage: Loading...';
    this.statusBarItem.tooltip = 'Applying secure decorations...';
    return;
  }

  // Rest of existing code...
}
```

---

### [ ] Feature: Visual Feedback for Security State

**Difficulty**: Medium | **Impact**: Medium | **ETA**: 2 hours

Add gutter icons to indicate hidden values.

```typescript
// Show lock icon in gutter for hidden values
const gutterDecoration = {
  gutterIconPath: context.asAbsolutePath('assets/lock-icon.svg'),
  gutterIconSize: 'contain',
};
```

**Implementation**:

- [ ] Create lock icon SVG
- [ ] Add gutter decoration option
- [ ] Make it configurable
- [ ] Add tests

---

## 🔐 Security Enhancements

### [ ] Feature: Clipboard Protection

**Difficulty**: Medium | **Impact**: High | **ETA**: 3-4 hours

Prevent accidental copying of sensitive values.

```typescript
// File: src/core/camouflage.ts

private setupClipboardProtection(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextEditorSelection(async (event) => {
      if (!this.activeEditor || !config.isEnabled()) return;
      if (!isEnvFile(this.activeEditor.document.fileName)) return;

      const selection = event.textEditor.selection;
      if (selection.isEmpty) return;

      // Check if selection contains a value
      const selectedText = this.activeEditor.document.getText(selection);
      const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/m.exec(selectedText);

      if (match && this.shouldHide(match[1])) {
        const action = await vscode.window.showWarningMessage(
          '⚠️ You are about to copy a sensitive value!',
          'Copy Anyway',
          'Cancel'
        );

        if (action !== 'Copy Anyway') {
          // Clear selection
          event.textEditor.selection = new vscode.Selection(
            selection.start,
            selection.start
          );
        }
      }
    })
  );
}
```

**Config Options**:

```json
"camouflage.security.clipboardProtection": {
  "type": "boolean",
  "default": true,
  "description": "Warn when copying sensitive values"
},
"camouflage.security.clipboardMode": {
  "type": "string",
  "enum": ["warn", "block", "obfuscate"],
  "default": "warn",
  "description": "How to handle clipboard operations: warn (show warning), block (prevent copy), obfuscate (copy hidden value)"
}
```

---

### [ ] Feature: Screen Recording Detection (macOS)

**Difficulty**: Hard | **Impact**: Medium | **ETA**: 4-6 hours

Detect active screen recording and show warning.

```typescript
// File: src/utils/recording-detector.ts (NEW FILE)

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class RecordingDetector {
  private checkInterval: NodeJS.Timeout | null = null;
  private isRecording = false;

  async detect(): Promise<boolean> {
    if (process.platform === 'darwin') {
      return this.detectMacOS();
    } else if (process.platform === 'win32') {
      return this.detectWindows();
    }
    return false;
  }

  private async detectMacOS(): Promise<boolean> {
    try {
      // Check for screen capture processes
      const { stdout } = await execAsync('ps aux | grep -i "screencapture\\|QuickTime\\|OBS"');
      return (
        stdout.includes('screencapture') ||
        stdout.includes('QuickTime Player') ||
        stdout.includes('obs')
      );
    } catch {
      return false;
    }
  }

  private async detectWindows(): Promise<boolean> {
    try {
      // Check for common recording software
      const { stdout } = await execAsync('tasklist | findstr /i "obs64 obs32 CamStudio"');
      return stdout.length > 0;
    } catch {
      return false;
    }
  }

  startMonitoring(callback: (isRecording: boolean) => void): void {
    this.checkInterval = setInterval(async () => {
      const recording = await this.detect();
      if (recording !== this.isRecording) {
        this.isRecording = recording;
        callback(recording);
      }
    }, 5000); // Check every 5 seconds
  }

  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}
```

**Integration**:

```typescript
// In extension.ts
const detector = new RecordingDetector();
detector.startMonitoring((isRecording) => {
  if (isRecording) {
    vscode.window.showWarningMessage(
      '🎥 Screen recording detected! Make sure Camouflage is enabled.',
      'Check Status'
    );
  }
});
```

**Checklist**:

- [ ] Implement macOS detection
- [ ] Implement Windows detection
- [ ] Implement Linux detection (optional)
- [ ] Add config option to enable/disable
- [ ] Add notification customization
- [ ] Test with various recording software
- [ ] Add to documentation

---

### [ ] Feature: Encryption Mode (Advanced)

**Difficulty**: Very Hard | **Impact**: High | **ETA**: 1 week

Create temporary encrypted files for ultimate security.

```typescript
// File: src/security/encryption.ts (NEW FILE)

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class EncryptionManager {
  private algorithm = 'aes-256-gcm';
  private tempDir: string;

  constructor() {
    this.tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'camouflage-'));
  }

  async encryptFile(sourcePath: string, password: string): Promise<string> {
    const content = fs.readFileSync(sourcePath, 'utf8');

    // Generate key from password
    const key = crypto.scryptSync(password, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);

    let encrypted = cipher.update(content, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Save encrypted file
    const encryptedPath = path.join(this.tempDir, `${path.basename(sourcePath)}.enc`);

    fs.writeFileSync(
      encryptedPath,
      JSON.stringify({
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
      })
    );

    return encryptedPath;
  }

  async decryptFile(encryptedPath: string, password: string): Promise<string> {
    const data = JSON.parse(fs.readFileSync(encryptedPath, 'utf8'));

    const key = crypto.scryptSync(password, 'salt', 32);
    const decipher = crypto.createDecipheriv(this.algorithm, key, Buffer.from(data.iv, 'hex'));

    decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));

    let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  cleanup(): void {
    // Delete temp directory
    if (fs.existsSync(this.tempDir)) {
      fs.rmSync(this.tempDir, { recursive: true });
    }
  }
}
```

**Features**:

- [ ] Encrypt .env files at rest
- [ ] Require password to view
- [ ] Auto-lock after inactivity
- [ ] Secure temp file cleanup
- [ ] Multi-user support (different passwords)

---

## ⚡ Performance Optimizations

### [ ] Optimization: Incremental Decoration Updates

**Difficulty**: Medium | **Impact**: High | **ETA**: 4-6 hours

Only update decorations for changed lines instead of entire document.

```typescript
// File: src/core/camouflage.ts

private lastDocumentVersion: number = -1;
private decorationCache = new Map<number, vscode.DecorationOptions>();

private updateDecorations(): void {
  if (!this.activeEditor || !this.decorationType) return;

  const document = this.activeEditor.document;

  // Check if document hasn't changed
  if (document.version === this.lastDocumentVersion) {
    return;
  }

  this.lastDocumentVersion = document.version;

  // Use cache for unchanged lines
  const decorations: vscode.DecorationOptions[] = [];
  const text = document.getText();
  const { regular, commented } = findAllEnvVariables(text);

  for (const match of [...regular, ...commented]) {
    const lineNumber = document.positionAt(match.index!).line;

    // Check cache
    const cached = this.decorationCache.get(lineNumber);
    if (cached && !this.hasLineChanged(document, lineNumber)) {
      decorations.push(cached);
      continue;
    }

    // Create new decoration
    const decoration = this.createDecoration(match, document);
    this.decorationCache.set(lineNumber, decoration);
    decorations.push(decoration);
  }

  this.activeEditor.setDecorations(this.decorationType, decorations);
}

private hasLineChanged(document: vscode.TextDocument, lineNumber: number): boolean {
  // Implementation to track line changes
  // Could use document change events to mark dirty lines
  return this.dirtyLines.has(lineNumber);
}
```

**Checklist**:

- [ ] Implement decoration caching
- [ ] Track changed lines
- [ ] Benchmark performance improvement
- [ ] Add tests for cache invalidation
- [ ] Handle edge cases (line insertion/deletion)

---

### [ ] Optimization: Worker Thread for Large Files

**Difficulty**: Hard | **Impact**: Medium | **ETA**: 1 week

Process large .env files in a separate thread.

```typescript
// File: src/workers/env-parser.worker.ts (NEW FILE)

import { parentPort, workerData } from 'worker_threads';
import { findAllEnvVariables } from '../utils/file';
import { matchesAnyPattern } from '../utils/pattern-matcher';

interface WorkerInput {
  content: string;
  config: {
    keyPatterns: string[];
    excludeKeys: string[];
    isSelectiveEnabled: boolean;
  };
}

interface WorkerOutput {
  matches: Array<{
    key: string;
    value: string;
    index: number;
    length: number;
    shouldHide: boolean;
  }>;
}

parentPort?.on('message', (input: WorkerInput) => {
  const { content, config } = input;
  const { regular, commented } = findAllEnvVariables(content);

  const matches = [...regular, ...commented].map((match) => {
    const key = match[1];
    const value = match[2];

    let shouldHide = true;

    // Check exclusions
    if (config.excludeKeys.length > 0 && matchesAnyPattern(key, config.excludeKeys)) {
      shouldHide = false;
    }

    // Check selective mode
    if (config.isSelectiveEnabled && !matchesAnyPattern(key, config.keyPatterns)) {
      shouldHide = false;
    }

    return {
      key,
      value,
      index: match.index!,
      length: match[0].length,
      shouldHide,
    };
  });

  parentPort?.postMessage({ matches } as WorkerOutput);
});
```

**Usage**:

```typescript
// File: src/core/camouflage.ts

private async updateDecorationsAsync(): Promise<void> {
  if (!this.activeEditor) return;

  const content = this.activeEditor.document.getText();

  // Use worker for large files (>100 KB)
  if (content.length > 100000) {
    const worker = new Worker(path.join(__dirname, '../workers/env-parser.worker.js'));

    worker.postMessage({
      content,
      config: {
        keyPatterns: config.getKeyPatterns(),
        excludeKeys: config.getExcludeKeys(),
        isSelectiveEnabled: config.isSelectiveHidingEnabled(),
      },
    });

    worker.on('message', (result: WorkerOutput) => {
      this.applyDecorations(result.matches);
      worker.terminate();
    });
  } else {
    // Use synchronous method for small files
    this.updateDecorations();
  }
}
```

**Config**:

```json
"camouflage.performance.workerThreshold": {
  "type": "number",
  "default": 100000,
  "description": "File size (in bytes) threshold for using worker thread"
}
```

---

### [ ] Optimization: Decoration Batching

**Difficulty**: Medium | **Impact**: Medium | **ETA**: 3-4 hours

Batch multiple decoration updates for better performance.

```typescript
// File: src/core/camouflage.ts

private decorationQueue: vscode.DecorationOptions[] = [];
private batchTimeout: NodeJS.Timeout | null = null;
private readonly BATCH_DELAY = 16; // 60fps

private queueDecoration(decoration: vscode.DecorationOptions): void {
  this.decorationQueue.push(decoration);

  if (this.batchTimeout) {
    clearTimeout(this.batchTimeout);
  }

  this.batchTimeout = setTimeout(() => {
    this.flushDecorationQueue();
  }, this.BATCH_DELAY);
}

private flushDecorationQueue(): void {
  if (!this.activeEditor || !this.decorationType) return;

  this.activeEditor.setDecorations(
    this.decorationType,
    this.decorationQueue
  );

  this.decorationQueue = [];
  this.batchTimeout = null;
}
```

---

## 🎯 New Features

### [ ] Feature: Multiple File Format Support

**Difficulty**: Medium | **Impact**: High | **ETA**: 1-2 days

Support YAML, JSON, and other config formats.

```typescript
// File: src/utils/file-parsers.ts (NEW FILE)

export interface FileParser {
  parse(content: string): Array<{ key: string; value: string; index: number }>;
  format(key: string, hiddenValue: string): string;
}

export class YamlParser implements FileParser {
  parse(content: string): Array<{ key: string; value: string; index: number }> {
    const matches: Array<{ key: string; value: string; index: number }> = [];
    const regex = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.+)$/gm;

    let match;
    while ((match = regex.exec(content)) !== null) {
      matches.push({
        key: match[1],
        value: match[2],
        index: match.index,
      });
    }

    return matches;
  }

  format(key: string, hiddenValue: string): string {
    return `${key}: ${hiddenValue}`;
  }
}

export class JsonParser implements FileParser {
  parse(content: string): Array<{ key: string; value: string; index: number }> {
    // Parse JSON and extract sensitive keys
    try {
      const obj = JSON.parse(content);
      return this.extractSensitiveKeys(obj, content);
    } catch {
      return [];
    }
  }

  private extractSensitiveKeys(
    obj: any,
    content: string,
    prefix = ''
  ): Array<{ key: string; value: string; index: number }> {
    const matches: Array<{ key: string; value: string; index: number }> = [];

    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'string') {
        // Find position in original content
        const regex = new RegExp(`"${key}"\\s*:\\s*"([^"]*)"`, 'g');
        const match = regex.exec(content);

        if (match) {
          matches.push({
            key: fullKey,
            value: value as string,
            index: match.index,
          });
        }
      } else if (typeof value === 'object' && value !== null) {
        matches.push(...this.extractSensitiveKeys(value, content, fullKey));
      }
    }

    return matches;
  }

  format(key: string, hiddenValue: string): string {
    return hiddenValue; // JSON maintains structure
  }
}

export class PropertiesParser implements FileParser {
  parse(content: string): Array<{ key: string; value: string; index: number }> {
    const matches: Array<{ key: string; value: string; index: number }> = [];
    const regex = /^([a-zA-Z_][a-zA-Z0-9_.-]*)\s*[=:]\s*(.+)$/gm;

    let match;
    while ((match = regex.exec(content)) !== null) {
      matches.push({
        key: match[1],
        value: match[2],
        index: match.index,
      });
    }

    return matches;
  }

  format(key: string, hiddenValue: string): string {
    return `${key}=${hiddenValue}`;
  }
}
```

**Config**:

```json
"camouflage.files.formats": {
  "type": "array",
  "items": {
    "type": "string",
    "enum": ["dotenv", "yaml", "json", "properties", "xml", "toml"]
  },
  "default": ["dotenv"],
  "description": "File formats to apply hiding"
},
"camouflage.files.patterns": {
  "type": "array",
  "items": {
    "type": "string"
  },
  "default": [
    "*.env*",
    ".env*",
    "*.yaml",
    "*.yml",
    "config.json",
    "*.properties"
  ],
  "description": "File patterns to watch"
}
```

**Checklist**:

- [ ] Implement YAML parser
- [ ] Implement JSON parser
- [ ] Implement Properties parser
- [ ] Implement TOML parser (optional)
- [ ] Implement XML parser (optional)
- [ ] Add format auto-detection
- [ ] Write tests for each format
- [ ] Update documentation

---

### [ ] Feature: Temporary Peek Mode

**Difficulty**: Easy | **Impact**: Medium | **ETA**: 2-3 hours

Allow temporary viewing of values with auto-hide.

```typescript
// File: src/commands/peek-value.ts (NEW FILE)

import * as vscode from 'vscode';
import * as config from '../utils/config';

export async function registerPeekCommand(
  context: vscode.ExtensionContext,
  camouflage: Camouflage
): Promise<void> {
  context.subscriptions.push(
    vscode.commands.registerCommand('camouflage.peekValue', async () => {
      // Get duration from config
      const duration = config.getConfig().get('peek.duration', 3000);

      // Show input box for custom duration (optional)
      const customDuration = await vscode.window.showInputBox({
        prompt: 'Peek duration in seconds (default: 3)',
        value: (duration / 1000).toString(),
        validateInput: (value) => {
          const num = parseInt(value);
          if (isNaN(num) || num <= 0 || num > 60) {
            return 'Please enter a number between 1 and 60';
          }
          return null;
        },
      });

      const peekDuration = customDuration ? parseInt(customDuration) * 1000 : duration;

      // Temporarily reveal
      await vscode.workspace.getConfiguration('camouflage').update('enabled', false, true);

      // Show countdown in status bar
      const statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        1000
      );
      statusBarItem.text = `$(eye) Peeking... ${peekDuration / 1000}s`;
      statusBarItem.show();

      // Countdown
      let remaining = peekDuration / 1000;
      const countdownInterval = setInterval(() => {
        remaining--;
        statusBarItem.text = `$(eye) Peeking... ${remaining}s`;

        if (remaining <= 0) {
          clearInterval(countdownInterval);
        }
      }, 1000);

      // Auto-hide after duration
      setTimeout(async () => {
        await vscode.workspace.getConfiguration('camouflage').update('enabled', true, true);

        statusBarItem.dispose();
        vscode.window.showInformationMessage('🔒 Values hidden again');
      }, peekDuration);
    })
  );

  // Also register keyboard shortcut
  context.subscriptions.push(
    vscode.commands.registerCommand('camouflage.peekValueUnderCursor', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      // Extract key from current line
      const line = editor.document.lineAt(editor.selection.start.line);
      const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line.text);

      if (!match) {
        vscode.window.showWarningMessage('No environment variable found');
        return;
      }

      const [, key, value] = match;

      // Show in hover
      const hover = new vscode.Hover([
        new vscode.MarkdownString(`**${key}**`),
        new vscode.MarkdownString(`\`${value}\``),
        new vscode.MarkdownString('_This message will disappear in 3 seconds_'),
      ]);

      // Show notification
      vscode.window.showInformationMessage(`${key} = ${value}`, { modal: false });
    })
  );
}
```

**Config**:

```json
"camouflage.peek.duration": {
  "type": "number",
  "default": 3000,
  "description": "Duration (in milliseconds) to peek values before auto-hiding"
},
"camouflage.peek.showCountdown": {
  "type": "boolean",
  "default": true,
  "description": "Show countdown timer during peek mode"
}
```

**Commands**:

```json
{
  "command": "camouflage.peekValue",
  "title": "Camouflage: Peek All Values (Temporary)",
  "icon": "$(eye)"
},
{
  "command": "camouflage.peekValueUnderCursor",
  "title": "Camouflage: Peek Value Under Cursor",
  "icon": "$(eye)"
}
```

**Keyboard Shortcuts**:

```json
{
  "command": "camouflage.peekValue",
  "key": "ctrl+shift+p",
  "mac": "cmd+shift+p",
  "when": "editorTextFocus && resourceFilename =~ /.*env.*/"
},
{
  "command": "camouflage.peekValueUnderCursor",
  "key": "ctrl+shift+alt+p",
  "mac": "cmd+shift+alt+p",
  "when": "editorTextFocus && resourceFilename =~ /.*env.*/"
}
```

---

### [ ] Feature: Git Integration

**Difficulty**: Medium | **Impact**: High | **ETA**: 4-6 hours

Warn users before committing with Camouflage disabled.

```typescript
// File: src/integrations/git.ts (NEW FILE)

import * as vscode from 'vscode';
import * as config from '../utils/config';
import { isEnvFile } from '../utils/file';

export class GitIntegration {
  constructor(private context: vscode.ExtensionContext) {
    this.setupHooks();
  }

  private setupHooks(): void {
    // Hook into save events
    this.context.subscriptions.push(
      vscode.workspace.onWillSaveTextDocument(async (event) => {
        await this.onWillSave(event);
      })
    );

    // Hook into SCM (Source Control Management) events
    const scm = vscode.scm;
    if (scm) {
      // Monitor when files are staged
      this.context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument((event) => {
          this.onDocumentChange(event);
        })
      );
    }
  }

  private async onWillSave(event: vscode.TextDocumentWillSaveEvent): Promise<void> {
    const document = event.document;

    if (!isEnvFile(document.fileName)) {
      return;
    }

    // Check if file is in git repository
    const gitExtension = vscode.extensions.getExtension('vscode.git');
    if (!gitExtension) {
      return;
    }

    const git = gitExtension.exports.getAPI(1);
    const repo = git.repositories.find((r: any) => document.fileName.startsWith(r.rootUri.fsPath));

    if (!repo) {
      return;
    }

    // Check if Camouflage is disabled
    if (!config.isEnabled()) {
      const action = await vscode.window.showWarningMessage(
        '⚠️ You are about to save an .env file with Camouflage disabled!',
        'Enable Camouflage',
        'Save Anyway',
        'Cancel'
      );

      if (action === 'Enable Camouflage') {
        await config.enable();
        event.waitUntil(new Promise((resolve) => setTimeout(resolve, 100)));
      } else if (action === 'Cancel') {
        // This doesn't actually cancel the save in VS Code API
        // But we can at least warn the user
        vscode.window.showErrorMessage('Save cancelled. File not saved.');
      }
    }

    // Check if file has unstaged changes
    const status = await repo.status();
    const fileStatus = status.find((s: any) => s.resourceUri.fsPath === document.fileName);

    if (fileStatus) {
      // File has changes - show reminder
      if (config.getConfig().get('git.showReminder', true)) {
        vscode.window
          .showInformationMessage(
            '💡 Reminder: .env files should not be committed. Check your .gitignore',
            "Don't Show Again"
          )
          .then((action) => {
            if (action === "Don't Show Again") {
              config.getConfig().update('git.showReminder', false, true);
            }
          });
      }
    }
  }

  private onDocumentChange(event: vscode.TextDocumentChangeEvent): void {
    if (!isEnvFile(event.document.fileName)) {
      return;
    }

    // Optionally track changes for analytics
  }

  public async checkGitignore(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      return;
    }

    for (const folder of workspaceFolders) {
      const gitignorePath = vscode.Uri.joinPath(folder.uri, '.gitignore');

      try {
        const content = await vscode.workspace.fs.readFile(gitignorePath);
        const text = Buffer.from(content).toString('utf8');

        // Check if .env is ignored
        if (!text.includes('.env')) {
          const action = await vscode.window.showWarningMessage(
            '⚠️ .env files are not in .gitignore!',
            'Add to .gitignore',
            'Ignore'
          );

          if (action === 'Add to .gitignore') {
            await this.addToGitignore(gitignorePath);
          }
        }
      } catch {
        // .gitignore doesn't exist
      }
    }
  }

  private async addToGitignore(gitignorePath: vscode.Uri): Promise<void> {
    try {
      const content = await vscode.workspace.fs.readFile(gitignorePath);
      const text = Buffer.from(content).toString('utf8');

      const newContent = text + '\n\n# Environment variables\n.env\n.env.*\n!.env.example\n';

      await vscode.workspace.fs.writeFile(gitignorePath, Buffer.from(newContent, 'utf8'));

      vscode.window.showInformationMessage('✅ .env added to .gitignore');
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to update .gitignore: ${error}`);
    }
  }
}
```

**Config Options**:

```json
"camouflage.git.warnOnSave": {
  "type": "boolean",
  "default": true,
  "description": "Warn when saving .env files with Camouflage disabled"
},
"camouflage.git.showReminder": {
  "type": "boolean",
  "default": true,
  "description": "Show reminder about .gitignore"
},
"camouflage.git.checkGitignore": {
  "type": "boolean",
  "default": true,
  "description": "Automatically check if .env is in .gitignore"
}
```

**Commands**:

```json
{
  "command": "camouflage.checkGitignore",
  "title": "Camouflage: Check .gitignore for .env files"
}
```

---

### [ ] Feature: Team Sharing Configurations

**Difficulty**: Medium | **Impact**: Medium | **ETA**: 3-4 hours

Allow teams to share hiding patterns via workspace settings.

```typescript
// File: src/config/workspace-config.ts (NEW FILE)

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface TeamConfig {
  patterns: string[];
  excludePatterns: string[];
  style: string;
  autoEnable: boolean;
}

export class WorkspaceConfigManager {
  private static readonly CONFIG_FILE = '.camouflage.json';

  async loadTeamConfig(): Promise<TeamConfig | null> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return null;
    }

    const configPath = path.join(
      workspaceFolders[0].uri.fsPath,
      WorkspaceConfigManager.CONFIG_FILE
    );

    if (!fs.existsSync(configPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(configPath, 'utf8');
      const config: TeamConfig = JSON.parse(content);
      return config;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to load team config: ${error}`);
      return null;
    }
  }

  async saveTeamConfig(config: TeamConfig): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    const configPath = path.join(
      workspaceFolders[0].uri.fsPath,
      WorkspaceConfigManager.CONFIG_FILE
    );

    try {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');

      vscode.window.showInformationMessage('✅ Team config saved to .camouflage.json');
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to save team config: ${error}`);
    }
  }

  async applyTeamConfig(config: TeamConfig): Promise<void> {
    const vscodeConfig = vscode.workspace.getConfiguration('camouflage');

    await vscodeConfig.update(
      'selective.keyPatterns',
      config.patterns,
      vscode.ConfigurationTarget.Workspace
    );

    await vscodeConfig.update(
      'selective.excludeKeys',
      config.excludePatterns,
      vscode.ConfigurationTarget.Workspace
    );

    await vscodeConfig.update(
      'appearance.style',
      config.style,
      vscode.ConfigurationTarget.Workspace
    );

    if (config.autoEnable) {
      await vscodeConfig.update('enabled', true, vscode.ConfigurationTarget.Workspace);
    }

    vscode.window.showInformationMessage('✅ Team config applied');
  }

  async createTeamConfig(): Promise<void> {
    const currentConfig = vscode.workspace.getConfiguration('camouflage');

    const teamConfig: TeamConfig = {
      patterns: currentConfig.get('selective.keyPatterns', []),
      excludePatterns: currentConfig.get('selective.excludeKeys', []),
      style: currentConfig.get('appearance.style', 'text'),
      autoEnable: currentConfig.get('enabled', true),
    };

    await this.saveTeamConfig(teamConfig);
  }
}
```

**Commands**:

```json
{
  "command": "camouflage.createTeamConfig",
  "title": "Camouflage: Create Team Configuration"
},
{
  "command": "camouflage.loadTeamConfig",
  "title": "Camouflage: Load Team Configuration"
},
{
  "command": "camouflage.exportConfig",
  "title": "Camouflage: Export Configuration"
},
{
  "command": "camouflage.importConfig",
  "title": "Camouflage: Import Configuration"
}
```

**Example `.camouflage.json`**:

```json
{
  "version": "1.0",
  "patterns": ["*KEY*", "*SECRET*", "*TOKEN*", "*PASSWORD*", "DATABASE_*"],
  "excludePatterns": ["PUBLIC_*", "EXAMPLE_*"],
  "style": "dotted",
  "autoEnable": true,
  "description": "Team-wide Camouflage configuration for secure development"
}
```

---

### [ ] Feature: Smart Pattern Suggestions

**Difficulty**: Hard | **Impact**: Medium | **ETA**: 1 week

AI-powered suggestions for sensitive key patterns.

```typescript
// File: src/ai/pattern-suggester.ts (NEW FILE)

import * as vscode from 'vscode';

export interface PatternSuggestion {
  pattern: string;
  confidence: number;
  reason: string;
  examples: string[];
}

export class PatternSuggester {
  private commonSensitiveKeywords = [
    'key',
    'secret',
    'password',
    'token',
    'auth',
    'api',
    'credential',
    'private',
    'secure',
    'db',
    'database',
    'connection',
    'url',
    'username',
    'pwd',
    'pass',
    'cert',
    'certificate',
  ];

  async analyzeFile(content: string): Promise<PatternSuggestion[]> {
    const suggestions: PatternSuggestion[] = [];
    const keys = this.extractKeys(content);

    // Analyze key patterns
    const keyWords = this.extractKeyWords(keys);

    for (const word of keyWords) {
      if (this.isSensitiveKeyword(word)) {
        const pattern = this.generatePattern(word, keys);
        const examples = keys.filter((k) => k.includes(word));

        suggestions.push({
          pattern,
          confidence: this.calculateConfidence(word, examples),
          reason: this.explainReason(word),
          examples: examples.slice(0, 3),
        });
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  private extractKeys(content: string): string[] {
    const regex = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/gm;
    const keys: string[] = [];

    let match;
    while ((match = regex.exec(content)) !== null) {
      keys.push(match[1]);
    }

    return keys;
  }

  private extractKeyWords(keys: string[]): string[] {
    const words = new Set<string>();

    for (const key of keys) {
      // Split by underscore and camelCase
      const parts = key
        .split('_')
        .flatMap((part) => part.split(/(?=[A-Z])/))
        .map((part) => part.toLowerCase())
        .filter((part) => part.length > 2);

      parts.forEach((part) => words.add(part));
    }

    return Array.from(words);
  }

  private isSensitiveKeyword(word: string): boolean {
    return this.commonSensitiveKeywords.some(
      (keyword) => word.includes(keyword) || keyword.includes(word)
    );
  }

  private generatePattern(word: string, keys: string[]): string {
    // Analyze if word appears at start, end, or middle
    const atStart = keys.some((k) => k.toUpperCase().startsWith(word.toUpperCase()));
    const atEnd = keys.some((k) => k.toUpperCase().endsWith(word.toUpperCase()));
    const inMiddle = keys.some(
      (k) =>
        k.toUpperCase().includes(word.toUpperCase()) &&
        !k.toUpperCase().startsWith(word.toUpperCase()) &&
        !k.toUpperCase().endsWith(word.toUpperCase())
    );

    if (atStart && atEnd) {
      return `*${word.toUpperCase()}*`;
    } else if (atStart) {
      return `${word.toUpperCase()}*`;
    } else if (atEnd) {
      return `*${word.toUpperCase()}`;
    } else {
      return `*${word.toUpperCase()}*`;
    }
  }

  private calculateConfidence(word: string, examples: string[]): number {
    let confidence = 0.5;

    // Boost confidence if word is in common sensitive keywords
    if (this.commonSensitiveKeywords.includes(word.toLowerCase())) {
      confidence += 0.3;
    }

    // Boost confidence based on number of examples
    confidence += Math.min(examples.length * 0.05, 0.2);

    return Math.min(confidence, 1.0);
  }

  private explainReason(word: string): string {
    const reasons: { [key: string]: string } = {
      key: 'Typically contains API keys or secret keys',
      secret: 'Used for secret values that should not be exposed',
      password: 'Contains user or service passwords',
      token: 'Authentication or authorization tokens',
      auth: 'Authentication credentials',
      api: 'API credentials or endpoints',
      db: 'Database connection information',
      database: 'Database credentials',
      private: 'Private keys or sensitive data',
    };

    return reasons[word.toLowerCase()] || 'Potentially sensitive information';
  }

  async showSuggestions(suggestions: PatternSuggestion[]): Promise<string[] | undefined> {
    const items = suggestions.map((s) => ({
      label: s.pattern,
      description: `${(s.confidence * 100).toFixed(0)}% confidence`,
      detail: `${s.reason} (e.g., ${s.examples.join(', ')})`,
      pattern: s.pattern,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      canPickMany: true,
      placeHolder: 'Select patterns to add to hiding list',
      title: 'Smart Pattern Suggestions',
    });

    return selected?.map((item) => item.pattern);
  }
}
```

**Command**:

```typescript
// File: src/commands/suggest-patterns.ts

vscode.commands.registerCommand('camouflage.suggestPatterns', async () => {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const content = editor.document.getText();
  const suggester = new PatternSuggester();

  // Show progress
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Analyzing patterns...',
      cancellable: false,
    },
    async () => {
      const suggestions = await suggester.analyzeFile(content);
      const selected = await suggester.showSuggestions(suggestions);

      if (selected && selected.length > 0) {
        const config = vscode.workspace.getConfiguration('camouflage');
        const currentPatterns = config.get('selective.keyPatterns', []);
        const newPatterns = [...new Set([...currentPatterns, ...selected])];

        await config.update('selective.keyPatterns', newPatterns, true);

        vscode.window.showInformationMessage(
          `✅ Added ${selected.length} pattern(s) to hiding list`
        );
      }
    }
  );
});
```

---

## 🧪 Testing Improvements

### [ ] E2E Tests for Flashing Prevention

**Difficulty**: Hard | **Impact**: Critical | **ETA**: 1 week

```typescript
// File: src/__tests__/e2e/flashing-prevention.test.ts (NEW FILE)

import * as vscode from 'vscode';
import * as path from 'path';
import { expect } from 'chai';

describe('Flashing Prevention E2E Tests', () => {
  let testEnvPath: string;

  beforeEach(() => {
    testEnvPath = path.join(__dirname, '../fixtures/test.env');
  });

  it('should hide values before first render', async function () {
    this.timeout(5000);

    // Enable Camouflage
    await vscode.workspace.getConfiguration('camouflage').update('enabled', true, true);

    // Open .env file
    const document = await vscode.workspace.openTextDocument(testEnvPath);
    const editor = await vscode.window.showTextDocument(document);

    // Wait a tiny bit for render
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Check that decorations are applied
    const decorations = editor.decorations;
    expect(decorations.length).to.be.greaterThan(0);

    // Verify values are hidden in visible text
    const visibleText = editor.document.getText();
    expect(visibleText).to.not.include('actual_secret_value');
  });

  it('should not flash when switching between files', async function () {
    this.timeout(10000);

    const env1 = await vscode.workspace.openTextDocument(testEnvPath);
    const env2 = await vscode.workspace.openTextDocument(
      path.join(__dirname, '../fixtures/test2.env')
    );

    // Open first file
    await vscode.window.showTextDocument(env1);
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Switch to second file quickly
    const editor2 = await vscode.window.showTextDocument(env2);

    // Check decorations applied immediately
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(editor2.decorations.length).to.be.greaterThan(0);
  });

  it('should handle large files without flashing', async function () {
    this.timeout(10000);

    // Create large test file
    const largeEnvPath = path.join(__dirname, '../fixtures/large.env');
    // (File with 1000+ lines)

    const document = await vscode.workspace.openTextDocument(largeEnvPath);
    const editor = await vscode.window.showTextDocument(document);

    // Wait minimal time
    await new Promise((resolve) => setTimeout(resolve, 10));

    // All values should be hidden
    const decorations = editor.decorations;
    expect(decorations.length).to.be.greaterThan(100);
  });
});
```

---

### [ ] Performance Benchmarks

**Difficulty**: Medium | **Impact**: Medium | **ETA**: 2-3 days

```typescript
// File: src/__tests__/performance/decoration-benchmark.test.ts (NEW FILE)

import { performance } from 'perf_hooks';
import { Camouflage } from '../../core/camouflage';

describe('Performance Benchmarks', () => {
  it('should apply decorations to small file in <50ms', async () => {
    const content = generateEnvContent(50); // 50 lines
    const start = performance.now();

    // Apply decorations
    await applyDecorations(content);

    const duration = performance.now() - start;
    expect(duration).to.be.lessThan(50);
  });

  it('should apply decorations to large file in <200ms', async () => {
    const content = generateEnvContent(1000); // 1000 lines
    const start = performance.now();

    await applyDecorations(content);

    const duration = performance.now() - start;
    expect(duration).to.be.lessThan(200);
  });

  it('should handle incremental updates efficiently', async () => {
    const content = generateEnvContent(500);

    // Initial application
    await applyDecorations(content);

    // Change one line
    const modifiedContent = content.replace('KEY_1=value1', 'KEY_1=newvalue');

    const start = performance.now();
    await applyDecorations(modifiedContent);
    const duration = performance.now() - start;

    // Should be faster than initial application
    expect(duration).to.be.lessThan(50);
  });
});

function generateEnvContent(lines: number): string {
  return Array.from({ length: lines }, (_, i) => `KEY_${i}=value${i}`).join('\n');
}
```

---

## 📊 Analytics & Telemetry (Optional)

### [ ] Anonymous Usage Statistics

**Difficulty**: Medium | **Impact**: Low | **ETA**: 3-4 hours

```typescript
// File: src/telemetry/analytics.ts (NEW FILE)

import * as vscode from 'vscode';

interface UsageEvent {
  event: string;
  timestamp: number;
  properties?: { [key: string]: any };
}

export class Analytics {
  private events: UsageEvent[] = [];
  private enabled: boolean;

  constructor(private context: vscode.ExtensionContext) {
    this.enabled = vscode.workspace.getConfiguration('camouflage').get('telemetry.enabled', false);
  }

  track(event: string, properties?: { [key: string]: any }): void {
    if (!this.enabled) return;

    this.events.push({
      event,
      timestamp: Date.now(),
      properties: this.sanitizeProperties(properties),
    });

    // Flush periodically
    if (this.events.length >= 10) {
      this.flush();
    }
  }

  private sanitizeProperties(properties?: {
    [key: string]: any;
  }): { [key: string]: any } | undefined {
    if (!properties) return undefined;

    // Remove any sensitive data
    const sanitized: { [key: string]: any } = {};
    for (const [key, value] of Object.entries(properties)) {
      if (typeof value === 'string' && value.length > 100) {
        sanitized[key] = '[REDACTED]';
      } else if (key.toLowerCase().includes('value') || key.toLowerCase().includes('secret')) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  private async flush(): Promise<void> {
    if (this.events.length === 0) return;

    // Save to local storage
    await this.context.globalState.update('analytics', this.events);
    this.events = [];
  }

  // Track common events
  trackFileOpen(fileType: string, lineCount: number): void {
    this.track('file_open', { fileType, lineCount });
  }

  trackDecorationApplied(count: number, duration: number): void {
    this.track('decoration_applied', { count, duration });
  }

  trackStyleChange(oldStyle: string, newStyle: string): void {
    this.track('style_change', { oldStyle, newStyle });
  }

  trackError(error: string): void {
    this.track('error', { error });
  }
}
```

**Config**:

```json
"camouflage.telemetry.enabled": {
  "type": "boolean",
  "default": false,
  "description": "Send anonymous usage statistics to help improve Camouflage"
}
```

---

## 📱 Platform-Specific Features

### [ ] macOS Touch Bar Support

**Difficulty**: Medium | **Impact**: Low | **ETA**: 2-3 hours

```typescript
// File: src/platforms/macos.ts (NEW FILE)

import * as vscode from 'vscode';

export function setupTouchBar(context: vscode.ExtensionContext): void {
  if (process.platform !== 'darwin') {
    return;
  }

  // Note: VS Code doesn't have official Touch Bar API yet
  // This is a placeholder for when it becomes available

  // For now, we can add to Command Palette and Quick Access
  context.subscriptions.push(
    vscode.commands.registerCommand('camouflage.touchBarToggle', () => {
      vscode.commands.executeCommand('camouflage.toggle');
    })
  );
}
```

---

## 📝 Documentation Improvements

### [ ] Add Video Tutorials

**Difficulty**: Medium | **Impact**: High | **ETA**: 1 week

- [ ] Basic usage video
- [ ] Advanced configuration video
- [ ] Streaming setup guide
- [ ] Team collaboration guide

---

### [ ] Interactive Walkthrough

**Difficulty**: Medium | **Impact**: Medium | **ETA**: 1-2 days

```json
// File: package.json - add walkthroughs

"contributes": {
  "walkthroughs": [
    {
      "id": "camouflage.getting-started",
      "title": "Getting Started with Camouflage",
      "description": "Learn how to hide sensitive values in .env files",
      "steps": [
        {
          "id": "open-env-file",
          "title": "Open an .env file",
          "description": "Open any .env file to see Camouflage in action",
          "media": {
            "image": "media/step1.png",
            "altText": "Open .env file"
          }
        },
        {
          "id": "toggle-visibility",
          "title": "Toggle Visibility",
          "description": "Use the status bar or keyboard shortcut to toggle value visibility",
          "media": {
            "image": "media/step2.png",
            "altText": "Toggle visibility"
          }
        }
      ]
    }
  ]
}
```

---

## 🎯 Milestone Planning

### v1.2.0 - Flashing Fix (Target: December 2025)

- [x] Research flashing issue
- [ ] Implement instant decoration in constructor
- [ ] Add loading overlay option
- [ ] Eager activation option
- [ ] Comprehensive E2E tests
- [ ] Performance benchmarks
- [ ] Documentation update

### v1.3.0 - Virtual Document Provider (Target: January 2026)

- [ ] Implement VirtualDocumentProvider
- [ ] File save synchronization
- [ ] Config change handling
- [ ] Tests and documentation
- [ ] Beta testing phase

### v1.4.0 - Security Enhancements (Target: February 2026)

- [ ] Clipboard protection
- [ ] Recording detection
- [ ] Git integration
- [ ] Encryption mode (optional)

### v1.5.0 - Multi-Format Support (Target: March 2026)

- [ ] YAML support
- [ ] JSON support
- [ ] Properties support
- [ ] Auto-detection

### v2.0.0 - Major Features (Target: Q2 2026)

- [ ] Team configuration sharing
- [ ] Smart pattern suggestions
- [ ] Performance optimizations
- [ ] Analytics dashboard

---

## 🚀 Quick Actions

### Immediate (This Week)

1. [ ] Fix constructor to apply decorations immediately
2. [ ] Add E2E test for flashing
3. [ ] Update issue #11 with progress
4. [ ] Release v1.1.2 with quick fix

### Short Term (This Month)

5. [ ] Implement loading overlay
6. [ ] Add eager activation option
7. [ ] Setup performance benchmarks
8. [ ] Begin VirtualDocumentProvider research

### Medium Term (Next 3 Months)

9. [ ] Complete VirtualDocumentProvider
10. [ ] Add clipboard protection
11. [ ] Git integration
12. [ ] Multi-format support

---

## 📚 Resources & References

- [VS Code Extension API](https://code.visualstudio.com/api)
- [TextEditorDecorationType](https://code.visualstudio.com/api/references/vscode-api#TextEditorDecorationType)
- [TextDocumentContentProvider](https://code.visualstudio.com/api/references/vscode-api#TextDocumentContentProvider)
- [Issue #11](https://github.com/zeybek/camouflage/issues/11)
- [Fisher-Yates Shuffle Algorithm](https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle)

---

## 💬 Community Feedback

### Feature Requests from Users

- [ ] Support for Docker Compose files
- [ ] Integration with password managers
- [ ] Export/import settings
- [ ] Regex pattern support
- [ ] Per-project configurations

### Bug Reports

- [x] #11 - Flashing on file open
- [ ] Large file performance
- [ ] Multi-cursor behavior
- [ ] Theme compatibility issues

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed contribution guidelines.

**Priority areas for contributions**:

1. Flashing prevention solutions
2. Performance optimizations
3. Multi-format support
4. Test coverage improvements
5. Documentation enhancements

---

## 📊 Success Metrics

### Technical Metrics

- [ ] Zero flashing on file open (target: 100%)
- [ ] Decoration application time < 50ms (target: small files)
- [ ] Decoration application time < 200ms (target: large files)
- [ ] Test coverage > 85% (current: ~80%)
- [ ] Zero critical bugs in production

### User Metrics

- [ ] User satisfaction score > 4.5/5
- [ ] Issue resolution time < 7 days
- [ ] Extension activation time < 100ms
- [ ] 50+ GitHub stars (current: 30)
- [ ] 1000+ installs from Marketplace

---

**Last Updated**: November 23, 2025 by Ahmet Zeybek
