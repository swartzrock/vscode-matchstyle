const assert = require ( 'node:assert/strict' );
const {test} = require ( 'node:test' );
const vm = require ( 'node:vm' );
const {buildSync} = require ( 'esbuild' );

const bundle = buildSync ({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  external: ['vscode'],
  write: false
}).outputFiles[0].text;

class Position {
  constructor ( line, character ) { this.line = line; this.character = character; }
}

class Range {
  constructor ( start, end ) { this.start = start; this.end = end; }
}

const createRuntime = ( config = {}, scoped = {} ) => {
  const listeners = new Map ();
  const types = [];
  const editors = [];
  const context = {subscriptions: []};
  const register = name => callback => {
    const callbacks = listeners.get ( name ) || new Set ();
    callbacks.add ( callback );
    listeners.set ( name, callbacks );
    return {dispose: () => callbacks.delete ( callback )};
  };
  const vscode = {
    Range,
    window: {
      visibleTextEditors: [],
      createTextEditorDecorationType ( options ) {
        const type = {options, disposed: false, dispose () {
          this.disposed = true;
          for ( const editor of editors ) editor.applied.delete ( this );
        }};
        types.push ( type );
        return type;
      },
      onDidChangeVisibleTextEditors: register ( 'visible' )
    },
    workspace: {
      getConfiguration ( section, scope ) {
        const settings = scoped[`${scope?.uri.path}:${scope?.languageId}`] || scoped[scope?.uri.path] || config;
        assert.equal ( section, 'matchStyle' );
        return {get: ( key, fallback ) => settings[key] === undefined ? fallback : settings[key]};
      },
      onDidOpenTextDocument: register ( 'open' ),
      onDidChangeTextDocument: register ( 'edit' ),
      onDidChangeConfiguration: register ( 'configuration' )
    },
    commands: {registerCommand () { throw new Error ( 'MatchStyle must not register commands' ); }}
  };
  const module = {exports: {}};
  vm.runInNewContext ( bundle, {
    module, exports: module.exports,
    require: name => {
      assert.equal ( name, 'vscode' );
      return vscode;
    }
  });
  const addEditor = ( text, path = '/sample.json', existingDocument ) => {
    const document = existingDocument || {
      text, languageId: 'json', uri: {path},
      getText () { return this.text; },
      positionAt ( offset ) {
        const lines = this.text.slice ( 0, offset ).split ( '\n' );
        return new Position ( lines.length - 1, lines.at ( -1 ).length );
      }
    };
    const applied = new Map ();
    const editor = {document, applied, setDecorations: ( type, ranges ) => applied.set ( type, ranges )};
    editors.push ( editor );
    vscode.window.visibleTextEditors.push ( editor );
    return editor;
  };
  const emit = ( name, event ) => { for ( const callback of listeners.get ( name ) || [] ) callback ( event ); };
  const changeConfig = ( path ) => emit ( 'configuration', {
    affectsConfiguration: ( section, scope ) => section === 'matchStyle' && ( !path || scope.uri.path === path )
  });
  const edit = ( editor, text ) => {
    editor.document.text = text;
    emit ( 'edit', {document: editor.document, contentChanges: [{text}] } );
  };
  return {
    vscode, config, context, types, listeners, addEditor, emit, changeConfig, edit,
    activate: () => module.exports.activate ( context ),
    dispose: () => { for ( const item of context.subscriptions ) item.dispose (); }
  };
};

const offsetAt = ( text, position ) => {
  const lines = text.split ( '\n' );
  return lines.slice ( 0, position.line ).reduce ( ( sum, line ) => sum + line.length + 1, 0 ) + position.character;
};

const decoratedText = editor => Array.from ( editor.applied, ([type, ranges]) => ({
  options: type.options,
  text: Array.from ( ranges, range => editor.document.text.slice (
    offsetAt ( editor.document.text, range.start ), offsetAt ( editor.document.text, range.end )
  ))
})).filter ( item => item.text.length );

const fonts = {
  enabled: true,
  hebrew: {fontFamily: 'Noto Serif Hebrew', fontSize: 32, fontWeight: '500'}
};

test ( 'only Hebrew is decorated, even when the removed other setting is present', () => {
  const runtime = createRuntime ({...fonts, other: {fontFamily: 'Arial', fontSize: 100, fontWeight: '900'}});
  const editor = runtime.addEditor ( 'hello שלום 😀 123' );
  runtime.activate ();
  assert.equal ( runtime.types.length, 1 );
  assert.equal ( editor.applied.size, 1 );
  assert.deepEqual ( decoratedText ( editor )[0].text, ['שלום'] );
  runtime.edit ( editor, 'hello 😀 123' );
  assert.deepEqual ( decoratedText ( editor ), [] );
  assert.equal ( runtime.types.length, 1 );
});

test ( 'Hebrew words and connecting spaces stay in one RTL decoration in JSON', () => {
  const phrase = 'וְאָהַבְתָּ אֵת יְהוָה אֱלֹהֶיךָ בְּכָל';
  const text = JSON.stringify ({
    id: 'line-01', hebrew: phrase,
    translation: 'And you shall love Adonai Your God',
    transliteration: "V'ahavta eit Adonai Elohecha, b'chol"
  }, null, 2);
  const runtime = createRuntime ( fonts );
  const editor = runtime.addEditor ( text );
  runtime.activate ();
  const [hebrew] = decoratedText ( editor );
  assert.deepEqual ( hebrew.text, [phrase] );
  assert.equal ( editor.applied.size, 1 );
  assert.equal ( editor.document.getText (), text );
});

test ( 'Hebrew phrases stop at English, punctuation, and line breaks', () => {
  const runtime = createRuntime ( fonts );
  const editor = runtime.addEditor ( '  שלום  עולם\tא! ב English ג\r\nד ה  ' );
  runtime.activate ();
  const [hebrew] = decoratedText ( editor );
  assert.deepEqual ( hebrew.text, ['שלום  עולם\tא', 'ב', 'ג', 'ד ה'] );
});

test ( 'the Hebrew override styles pointed Hebrew and presentation forms', () => {
  const runtime = createRuntime ( fonts );
  const editor = runtime.addEditor ( 'hello שָׁלוֹם 😀 123\r\nשָׁלוֹם א֑' );
  runtime.activate ();
  const [hebrew] = decoratedText ( editor );
  assert.deepEqual ( hebrew.text, ['שָׁלוֹם', 'שָׁלוֹם א֑'] );
  assert.equal ( hebrew.options.textDecoration, 'none; font-family: Noto Serif Hebrew !important; font-size: 32px !important' );
  assert.equal ( hebrew.options.fontWeight, '500' );
  assert.equal ( hebrew.options.letterSpacing, 'normal' );
});

test ( 'fonts are opt-in, and old Highlight options have no effect', () => {
  const disabled = createRuntime ();
  const editor = disabled.addEditor ( 'TODO שלום' );
  disabled.activate ();
  assert.equal ( disabled.types.length, 0 );
  assert.deepEqual ( decoratedText ( editor ), [] );
  const enabled = createRuntime ({enabled: true, 'highlight.enabled': false, 'highlight.regexes': {'(TODO)': [{color: 'red'}]}});
  const styled = enabled.addEditor ( 'TODO שלום' );
  enabled.activate ();
  assert.equal ( decoratedText ( styled ).length, 1 );
  assert.ok ( decoratedText ( styled ).every ( item => item.options.color === undefined ) );
});

test ( 'malformed font fields and CSS injection fall back safely', () => {
  for ( const value of [null, 'bad', [], {fontFamily: 'Arial; color:red'}, {fontFamily: 'Arial\n'}, {fontFamily: 'Arial\r\n'}, {fontFamily: 'url(https://example.com)'}, {fontFamily: '"Arial'}, {fontSize: NaN}, {fontSize: Infinity}, {fontSize: 5}, {fontSize: 101}, {fontSize: '32; color:red'}, {fontWeight: '500; color:red'}, {fontWeight: '500\n'}] ) {
    const runtime = createRuntime ({enabled: true, hebrew: value});
    const editor = runtime.addEditor ( 'א' );
    runtime.activate ();
    const [{options}] = decoratedText ( editor );
    assert.equal ( options.textDecoration, 'none; font-family: Noto Serif Hebrew !important; font-size: 32px !important' );
    assert.equal ( options.fontWeight, '500' );
  }
});

test ( 'quoted font stacks, size boundaries and partial settings are accepted', () => {
  const runtime = createRuntime ({enabled: true, hebrew: {fontFamily: "'Noto Serif Hebrew', Arial", fontSize: 6, fontWeight: '900'}});
  const editor = runtime.addEditor ( 'A א' );
  runtime.activate ();
  const [hebrew] = decoratedText ( editor );
  assert.match ( hebrew.options.textDecoration, /font-family: 'Noto Serif Hebrew', Arial !important; font-size: 6px/ );
  assert.equal ( hebrew.options.fontWeight, '900' );
  runtime.config.hebrew = {fontSize: 100};
  runtime.changeConfig ();
  assert.match ( decoratedText ( editor )[0].options.textDecoration, /font-family: Noto Serif Hebrew !important; font-size: 100px/ );
  assert.equal ( decoratedText ( editor )[0].options.fontWeight, '500' );
});

test ( 'settings changes and disabling fonts dispose stale decorations', () => {
  const runtime = createRuntime ({enabled: true});
  const editor = runtime.addEditor ( 'hello שלום' );
  runtime.activate ();
  const original = runtime.types.slice ();
  runtime.config.hebrew = {fontSize: 36};
  runtime.changeConfig ();
  assert.ok ( original.every ( type => type.disposed ) );
  assert.match ( decoratedText ( editor )[0].options.textDecoration, /36px/ );
  runtime.config.enabled = false;
  runtime.changeConfig ();
  assert.deepEqual ( decoratedText ( editor ), [] );
  assert.ok ( runtime.types.every ( type => type.disposed ) );
  runtime.config.enabled = true;
  runtime.changeConfig ();
  assert.equal ( decoratedText ( editor ).length, 1 );
});

test ( 'edits update both views of the same document without recreating styles', () => {
  const runtime = createRuntime ({enabled: true});
  const first = runtime.addEditor ( 'hello\nשלום' );
  const second = runtime.addEditor ( '', '/sample.json', first.document );
  runtime.activate ();
  const count = runtime.types.length;
  runtime.edit ( first, '😀 א\nnew\nשלום' );
  for ( const editor of [first, second] ) {
    const [hebrew] = decoratedText ( editor );
    assert.deepEqual ( hebrew.text, ['א', 'שלום'] );
    assert.equal ( editor.applied.size, 1 );
  }
  runtime.edit ( first, 'abc\nשלום' );
  assert.deepEqual ( decoratedText ( second )[0].text, ['שלום'] );
  runtime.edit ( first, '' );
  assert.deepEqual ( decoratedText ( second ), [] );
  assert.equal ( runtime.types.length, count );
});

test ( 'visible editors use folder and language settings, and hidden editors release styles', () => {
  const scoped = {
    '/one.json': {enabled: true, hebrew: {fontSize: 40}},
    '/two.json:json': {enabled: true, hebrew: {fontSize: 24}}
  };
  const runtime = createRuntime ({enabled: false}, scoped);
  const first = runtime.addEditor ( 'א', '/one.json' );
  runtime.activate ();
  const firstTypes = runtime.types.slice ();
  const second = runtime.addEditor ( 'ב', '/two.json' );
  runtime.emit ( 'visible', runtime.vscode.window.visibleTextEditors );
  assert.match ( decoratedText ( first )[0].options.textDecoration, /40px/ );
  assert.match ( decoratedText ( second )[0].options.textDecoration, /24px/ );
  scoped['/two.json:json'].hebrew.fontSize = 30;
  runtime.changeConfig ( '/two.json' );
  assert.match ( decoratedText ( second )[0].options.textDecoration, /30px/ );
  assert.ok ( firstTypes.every ( type => !type.disposed ) );
  runtime.vscode.window.visibleTextEditors = [second];
  runtime.emit ( 'visible', [second] );
  assert.ok ( firstTypes.every ( type => type.disposed ) );
  assert.deepEqual ( decoratedText ( first ), [] );
  runtime.vscode.window.visibleTextEditors = [first, second];
  runtime.emit ( 'visible', [first, second] );
  assert.match ( decoratedText ( first )[0].options.textDecoration, /40px/ );
});

test ( 'all Hebrew runs are styled and line breaks create no decorations', () => {
  const runtime = createRuntime ({enabled: true});
  const editor = runtime.addEditor ( 'aא'.repeat ( 1500 ) );
  const empty = runtime.addEditor ( '\r\n\n' );
  runtime.activate ();
  assert.equal ( decoratedText ( editor )[0].text.length, 1500 );
  assert.equal ( editor.applied.size, 1 );
  assert.deepEqual ( decoratedText ( empty ), [] );
});

test ( 'changing a visible document language refreshes its language-specific styles', () => {
  const runtime = createRuntime ({enabled: true}, {
    '/sample.json:plaintext': {enabled: true, hebrew: {fontSize: 24}},
    '/sample.json:markdown': {enabled: false}
  });
  const editor = runtime.addEditor ( 'hello שלום' );
  runtime.activate ();
  const original = runtime.types.slice ();
  editor.document.languageId = 'plaintext';
  runtime.emit ( 'open', editor.document );
  assert.match ( decoratedText ( editor )[0].options.textDecoration, /24px/ );
  assert.ok ( original.every ( type => type.disposed ) );
  editor.document.languageId = 'markdown';
  runtime.emit ( 'open', editor.document );
  assert.deepEqual ( decoratedText ( editor ), [] );
});

test ( 'extension disposal releases all decoration types and event subscriptions', () => {
  const runtime = createRuntime ({enabled: true});
  const editor = runtime.addEditor ( 'hello שלום' );
  runtime.activate ();
  runtime.dispose ();
  assert.ok ( runtime.types.every ( type => type.disposed ) );
  assert.deepEqual ( decoratedText ( editor ), [] );
  assert.ok ( Array.from ( runtime.listeners.values () ).every ( callbacks => callbacks.size === 0 ) );
});
