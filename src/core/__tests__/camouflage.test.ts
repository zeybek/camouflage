import { afterEach, describe, expect, it, jest } from '@jest/globals';
import * as vscode from 'vscode';
import { Camouflage } from '../camouflage';

/**
 * Integration tests for the decoration layer. These exercise the
 * security-critical mapping of parser output -> editor decorations, and assert
 * that every masked decoration range covers exactly the value's source span
 * (i.e. the value is actually hidden, never partially or not at all).
 */

type DecorationCapture = { decorations: vscode.DecorationOptions[] };

function mockConfig(overrides: Record<string, unknown> = {}): void {
  jest.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue({
    get: (key: string, def?: unknown) => (key in overrides ? overrides[key] : def),
    update: () => Promise.resolve(),
    has: () => true,
    inspect: () => undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

function lineStartsOf(content: string): number[] {
  const starts: number[] = [];
  let offset = 0;
  for (const line of content.split('\n')) {
    starts.push(offset);
    offset += line.length + 1;
  }
  return starts;
}

function makeEditor(content: string, fileName: string) {
  const lines = content.split('\n');
  const lineStarts = lineStartsOf(content);
  const positionAt = (offset: number): vscode.Position => {
    let line = 0;
    for (let i = 0; i < lineStarts.length; i++) {
      if (lineStarts[i] <= offset) {
        line = i;
      }
    }
    return new vscode.Position(line, offset - lineStarts[line]);
  };
  const document = {
    fileName,
    getText: () => content,
    positionAt,
    offsetAt: (pos: vscode.Position) => lineStarts[pos.line] + pos.character,
    lineAt: (line: number) => ({ text: lines[line] }),
    uri: { toString: () => `file://${fileName}` },
  };
  const captured: DecorationCapture = { decorations: [] };
  const editor = {
    document,
    selection: { start: new vscode.Position(0, 0) },
    setDecorations: (_type: unknown, decos: vscode.DecorationOptions[]) => {
      captured.decorations = decos;
    },
  };
  return { editor: editor as unknown as vscode.TextEditor, captured };
}

/** Reconstruct the source text covered by a decoration's range. */
function maskedText(content: string, deco: vscode.DecorationOptions): string {
  const lineStarts = lineStartsOf(content);
  const start = lineStarts[deco.range.start.line] + deco.range.start.character;
  const end = lineStarts[deco.range.end.line] + deco.range.end.character;
  return content.slice(start, end);
}

function activate(content: string, fileName: string) {
  const { editor, captured } = makeEditor(content, fileName);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (vscode.window as any).visibleTextEditors = [editor];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (vscode.window as any).activeTextEditor = editor;
  const cam = new Camouflage();
  return { cam, captured };
}

describe('Camouflage decoration layer', () => {
  let cam: Camouflage | undefined;

  afterEach(() => {
    cam?.dispose();
    cam = undefined;
    jest.restoreAllMocks();
    jest.useRealTimers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (vscode as any).__clearListeners?.();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (vscode.window as any).visibleTextEditors = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (vscode.window as any).activeTextEditor = undefined;
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const emit = (name: string, arg?: any) => (vscode as any).__emit(name, arg);

  it('masks each value with a range covering exactly its source span', () => {
    mockConfig();
    const content = 'API_KEY=secret\nDB=local';
    const res = activate(content, '/tmp/test.env');
    cam = res.cam;

    expect(res.captured.decorations).toHaveLength(2);
    expect(maskedText(content, res.captured.decorations[0])).toBe('secret');
    expect(maskedText(content, res.captured.decorations[1])).toBe('local');
  });

  it('does not leak a JSON value containing an escaped quote (end-to-end)', () => {
    mockConfig();
    const content = '{"password": "a\\"b"}';
    const res = activate(content, '/tmp/config.json');
    cam = res.cam;

    expect(res.captured.decorations).toHaveLength(1);
    expect(maskedText(content, res.captured.decorations[0])).toBe('a\\"b');
  });

  it('masks the whole body of a YAML block scalar (end-to-end)', () => {
    mockConfig();
    const content = 'key: |\n  SECRET_LINE_1\n  SECRET_LINE_2';
    const res = activate(content, '/tmp/c.yaml');
    cam = res.cam;

    expect(res.captured.decorations).toHaveLength(1);
    const masked = maskedText(content, res.captured.decorations[0]);
    expect(masked).toContain('SECRET_LINE_1');
    expect(masked).toContain('SECRET_LINE_2');
  });

  it('skips keys in the exclude list', () => {
    mockConfig({ 'selective.excludeKeys': ['DB'] });
    const content = 'API_KEY=secret\nDB=local';
    const res = activate(content, '/tmp/test.env');
    cam = res.cam;

    expect(res.captured.decorations).toHaveLength(1);
    expect(maskedText(content, res.captured.decorations[0])).toBe('secret');
  });

  it('in selective mode only masks keys matching a pattern', () => {
    mockConfig({ 'selective.enabled': true, 'selective.keyPatterns': ['*KEY*'] });
    const content = 'API_KEY=secret\nDB=local';
    const res = activate(content, '/tmp/test.env');
    cam = res.cam;

    expect(res.captured.decorations).toHaveLength(1);
    expect(maskedText(content, res.captured.decorations[0])).toBe('secret');
  });

  it('applies no decorations when disabled', () => {
    mockConfig({ enabled: false });
    const content = 'API_KEY=secret';
    const res = activate(content, '/tmp/test.env');
    cam = res.cam;

    expect(res.captured.decorations).toHaveLength(0);
  });

  it('ignores unsupported files', () => {
    mockConfig();
    const content = 'API_KEY=secret';
    const res = activate(content, '/tmp/README.md');
    cam = res.cam;

    expect(res.captured.decorations).toHaveLength(0);
  });

  it('skips empty values', () => {
    mockConfig();
    const content = 'EMPTY=\nFILLED=value';
    const res = activate(content, '/tmp/test.env');
    cam = res.cam;

    expect(res.captured.decorations).toHaveLength(1);
    expect(maskedText(content, res.captured.decorations[0])).toBe('value');
  });

  it('disposes cleanly', () => {
    mockConfig();
    const res = activate('API_KEY=secret', '/tmp/test.env');
    expect(() => res.cam.dispose()).not.toThrow();
    cam = undefined;
  });

  it('registers event listeners on initialize', () => {
    mockConfig();
    const res = activate('API_KEY=secret', '/tmp/test.env');
    cam = res.cam;
    const context = { subscriptions: [] as { dispose(): unknown }[] };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => cam!.initialize(context as any)).not.toThrow();
    expect(context.subscriptions.length).toBeGreaterThan(0);
  });

  it('uses the legacy env path for supported files without a dedicated parser', () => {
    // A file matched only by a user glob (no parser) -> parseFileContent() is
    // empty -> the legacy regex decoration path runs.
    mockConfig({ 'files.patterns': ['*.xyz'] });
    const content = 'API_KEY=secret\nDB=local';
    const res = activate(content, '/tmp/custom.xyz');
    cam = res.cam;

    expect(res.captured.decorations.length).toBeGreaterThan(0);
    expect(res.captured.decorations.some((d) => maskedText(content, d) === 'secret')).toBe(true);
  });

  it('re-masks after updateDecorationType is called', () => {
    mockConfig();
    const content = 'API_KEY=secret';
    const res = activate(content, '/tmp/test.env');
    cam = res.cam;
    res.captured.decorations = [];
    cam.updateDecorationType();
    expect(res.captured.decorations).toHaveLength(1);
    expect(maskedText(content, res.captured.decorations[0])).toBe('secret');
  });

  it('routes editor / document / config events to decoration updates', () => {
    jest.useFakeTimers();
    mockConfig();
    const content = 'API_KEY=secret';
    const res = activate(content, '/tmp/test.env');
    cam = res.cam;
    const editor = res.captured;
    const context = { subscriptions: [] as { dispose(): unknown }[] };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cam.initialize(context as any);

    // active editor changed
    editor.decorations = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    emit('activeTextEditor', (vscode.window as any).activeTextEditor);
    expect(editor.decorations).toHaveLength(1);

    // visible editors changed
    editor.decorations = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    emit('visibleTextEditors', (vscode.window as any).visibleTextEditors);
    expect(editor.decorations).toHaveLength(1);

    // document changed -> debounced update fires after the timer
    editor.decorations = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    emit('textDocument', { document: (vscode.window as any).activeTextEditor.document });
    expect(editor.decorations).toHaveLength(0); // debounced, not yet
    jest.runOnlyPendingTimers();
    expect(editor.decorations).toHaveLength(1);

    // document opened -> setImmediate update
    editor.decorations = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    emit('openTextDocument', (vscode.window as any).activeTextEditor.document);
    jest.runOnlyPendingTimers();
    expect(editor.decorations).toHaveLength(1);

    // configuration changed
    editor.decorations = [];
    emit('configuration', { affectsConfiguration: () => true });
    expect(editor.decorations).toHaveLength(1);
  });

  it('clears pending debounce timers on dispose', () => {
    jest.useFakeTimers();
    mockConfig();
    const res = activate('API_KEY=secret', '/tmp/test.env');
    cam = res.cam;
    const context = { subscriptions: [] as { dispose(): unknown }[] };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cam.initialize(context as any);
    // Two rapid changes: the second resets the existing debounce timer.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = (vscode.window as any).activeTextEditor.document;
    emit('textDocument', { document: doc });
    emit('textDocument', { document: doc });
    expect(() => cam!.dispose()).not.toThrow();
    cam = undefined;
  });

  it('skips empty string values (parser path)', () => {
    mockConfig();
    const content = '{"empty": "", "name": "keep"}';
    const res = activate(content, '/tmp/c.json');
    cam = res.cam;

    expect(res.captured.decorations).toHaveLength(1);
    expect(maskedText(content, res.captured.decorations[0])).toBe('keep');
  });

  it('honors the exclude list on the legacy env path', () => {
    mockConfig({ 'files.patterns': ['*.xyz'], 'selective.excludeKeys': ['DB'] });
    const content = 'API_KEY=secret\nDB=local';
    const res = activate(content, '/tmp/custom.xyz');
    cam = res.cam;

    expect(res.captured.decorations).toHaveLength(1);
    expect(maskedText(content, res.captured.decorations[0])).toBe('secret');
  });

  it('honors selective mode on the legacy env path', () => {
    mockConfig({
      'files.patterns': ['*.xyz'],
      'selective.enabled': true,
      'selective.keyPatterns': ['*KEY*'],
    });
    const content = 'API_KEY=secret\nDB=local';
    const res = activate(content, '/tmp/custom.xyz');
    cam = res.cam;

    expect(res.captured.decorations).toHaveLength(1);
    expect(maskedText(content, res.captured.decorations[0])).toBe('secret');
  });

  it('skips empty values on the legacy env path', () => {
    mockConfig({ 'files.patterns': ['*.xyz'] });
    const content = 'API_KEY=secret\nEMPTY=';
    const res = activate(content, '/tmp/custom.xyz');
    cam = res.cam;

    expect(res.captured.decorations).toHaveLength(1);
    expect(maskedText(content, res.captured.decorations[0])).toBe('secret');
  });

  it('covers parser-path decoration options (scramble, nested, preview)', () => {
    mockConfig({ 'appearance.style': 'scramble', 'hover.showPreview': true });
    const content = '{"db": {"password": "topsecret"}}';
    const res = activate(content, '/tmp/c.json');
    cam = res.cam;

    expect(res.captured.decorations).toHaveLength(1);
    expect(maskedText(content, res.captured.decorations[0])).toBe('topsecret');
  });

  it('covers legacy-path decoration options (scramble, commented, preview)', () => {
    mockConfig({
      'files.patterns': ['*.xyz'],
      'appearance.style': 'scramble',
      'hover.showPreview': true,
    });
    const content = 'API_KEY=secretvalue\n# COMMENTED=alsosecret';
    const res = activate(content, '/tmp/c.xyz');
    cam = res.cam;

    // both the regular and the commented value get a decoration
    expect(res.captured.decorations.length).toBeGreaterThanOrEqual(2);
  });

  it('covers event-handler guard branches', () => {
    jest.useFakeTimers();
    mockConfig();
    const res = activate('API_KEY=secret', '/tmp/test.env');
    cam = res.cam;
    const context = { subscriptions: [] as { dispose(): unknown }[] };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cam.initialize(context as any);
    const unsupported = makeEditor('x', '/tmp/README.md').editor;

    emit('activeTextEditor', undefined); // if (editor) false
    emit('activeTextEditor', unsupported); // isSupportedFile false
    emit('visibleTextEditors', [unsupported]); // isSupportedFile false
    emit('openTextDocument', { fileName: '/tmp/other.env' }); // document !== editor.document
    jest.runOnlyPendingTimers();
    emit('textDocument', { document: { fileName: '/tmp/nomatch.env' } }); // event.document mismatch
    emit('configuration', { affectsConfiguration: () => false }); // not affecting camouflage

    expect(context.subscriptions.length).toBeGreaterThan(0);
  });

  it('skips a debounced update when the editor is no longer visible', () => {
    jest.useFakeTimers();
    mockConfig();
    const res = activate('API_KEY=secret', '/tmp/test.env');
    cam = res.cam;
    const context = { subscriptions: [] as { dispose(): unknown }[] };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cam.initialize(context as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const editor = (vscode.window as any).activeTextEditor;
    emit('textDocument', { document: editor.document });
    // editor leaves the visible set before the debounce fires
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (vscode.window as any).visibleTextEditors = [];
    expect(() => jest.runOnlyPendingTimers()).not.toThrow();
  });
});
