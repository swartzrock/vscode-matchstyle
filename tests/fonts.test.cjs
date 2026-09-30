const assert = require ( 'node:assert/strict' );
const {test} = require ( 'node:test' );
const vm = require ( 'node:vm' );
const {buildSync} = require ( 'esbuild' );
const {Worker} = require ( 'node:worker_threads' );
const path = require ( 'node:path' );
const fs = require ( 'node:fs' );

buildSync ({entryPoints: ['src/matcher.ts'], bundle: true, platform: 'node', format: 'cjs', outfile: 'dist/matcher.js'});

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
  const warnings = [];
  const timers = new Set ();
  const workers = new Set ();
  class TestWorker extends Worker {
    constructor ( ...args ) {
      super ( ...args );
      workers.add ( this );
      this.once ( 'exit', () => workers.delete ( this ) );
    }
  }
  const settle = async () => {
    const deadline = Date.now () + 8000;
    while ( timers.size || workers.size ) {
      assert.ok ( Date.now () < deadline, 'render did not finish' );
      await new Promise ( resolve => setTimeout ( resolve, 10 ) );
    }
  };
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
      showWarningMessage ( message ) { warnings.push ( message ); return Promise.resolve (); },
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
    module, exports: module.exports, __dirname: path.join ( __dirname, '../dist' ),
    setTimeout ( callback, delay ) {
      const timer = setTimeout ( () => { timers.delete ( timer ); callback (); }, delay );
      timers.add ( timer );
      return timer;
    },
    clearTimeout ( timer ) { timers.delete ( timer ); clearTimeout ( timer ); },
    require: name => {
      if ( name === 'vscode' ) return vscode;
      if ( name === 'node:worker_threads' ) return {Worker: TestWorker};
      assert.equal ( name, 'node:path' );
      return require ( name );
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
    affectsConfiguration: ( section, scope ) => section === 'matchStyle' && ( !path || !scope || scope.uri.path === path )
  });
  const edit = ( editor, text ) => {
    editor.document.text = text;
    emit ( 'edit', {document: editor.document, contentChanges: [{text}] } );
  };
  return {
    vscode, config, context, types, listeners, addEditor, emit, changeConfig, edit, settle, warnings, workers,
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

const phrasePattern = '\\p{Script=Hebrew}+(?:[ \\t]+\\p{Script=Hebrew}+)*';
const fonts = () => ({enabled: true, rules: [{pattern: phrasePattern, fontFamily: 'Noto Serif Hebrew', fontSize: 32, fontWeight: '500'}]});

const sized = size => ({enabled: true, rules: [{pattern: phrasePattern, fontSize: size}]});

test ( 'configured rules style Korean and arbitrary text with independent fonts and colors', async () => {
  const runtime = createRuntime ({enabled: true, rules: [
    {pattern: '\\p{Script=Hangul}+', fontFamily: 'Noto Sans KR', fontSize: 24},
    {pattern: 'TODO', fontWeight: 'bold', color: '#FFD60A'}
  ]});
  const editor = runtime.addEditor ( 'hello 안녕하세요 TODO 세계 한 😀 123' );
  runtime.activate ();
  await runtime.settle ();
  const styled = decoratedText ( editor );
  assert.deepEqual ( styled.map ( item => item.text ), [['안녕하세요', '세계', '한'], ['TODO']] );
  assert.match ( styled[0].options.textDecoration, /Noto Sans KR/ );
  assert.equal ( styled[1].options.fontWeight, 'bold' );
  assert.equal ( styled[1].options.color, '#FFD60A' );
  assert.equal ( styled[1].options.textDecoration, undefined );
  assert.equal ( styled[0].options.fontWeight, undefined );
  assert.equal ( styled[0].options.fontStyle, undefined );
});

test ( 'text colors accept CSS hex values and reject malformed values', async () => {
  const colors = ['#FD0', '#FD0F', '#FFD60A', '#FFD60ACC', 'yellow', '#GGG', '#12345', '#123456; color:red', '#FFFFFF\n', 42];
  const runtime = createRuntime ({enabled: true, rules: colors.map ( ( color, index ) => ({pattern: `word${index}\\b`, color}) )});
  const editor = runtime.addEditor ( colors.map ( ( _, index ) => `word${index}` ).join ( ' ' ) );
  runtime.activate ();
  await runtime.settle ();
  assert.deepEqual ( decoratedText ( editor ).map ( item => item.options.color ), [
    '#FD0', '#FD0F', '#FFD60A', '#FFD60ACC', undefined, undefined, undefined, undefined, undefined, undefined
  ] );
});

test ( 'configured phrases keep connecting spaces in one decoration', async () => {
  const phrase = 'וְאָהַבְתָּ אֵת יְהוָה אֱלֹהֶיךָ בְּכָל';
  const text = JSON.stringify ({phrase, translation: 'And you shall love'}, null, 2);
  const runtime = createRuntime ( fonts () );
  const editor = runtime.addEditor ( text );
  runtime.activate ();
  await runtime.settle ();
  assert.deepEqual ( decoratedText ( editor )[0].text, [phrase] );
  assert.equal ( editor.document.getText (), text );
});

test ( 'the phrase example stops at punctuation and line breaks', async () => {
  const runtime = createRuntime ( fonts () );
  const editor = runtime.addEditor ( '  שלום  עולם\tא! ב English ג\r\nד ה  ' );
  runtime.activate ();
  await runtime.settle ();
  assert.deepEqual ( decoratedText ( editor )[0].text, ['שלום  עולם\tא', 'ב', 'ג', 'ד ה'] );
});

test ( 'matches support combining marks and presentation forms', async () => {
  const runtime = createRuntime ( fonts () );
  const editor = runtime.addEditor ( 'hello שָׁלוֹם 😀 123\r\nשָׁלוֹם א֑' );
  runtime.activate ();
  await runtime.settle ();
  const [styled] = decoratedText ( editor );
  assert.deepEqual ( styled.text, ['שָׁלוֹם', 'שָׁלוֹם א֑'] );
  assert.equal ( styled.options.textDecoration, 'none; font-family: Noto Serif Hebrew !important; font-size: 32px !important' );
  assert.equal ( styled.options.fontWeight, '500' );
  assert.equal ( styled.options.letterSpacing, 'normal' );
});

test ( 'styling is opt-in and missing rules have no built-in language matcher', async () => {
  for ( const config of [{}, {rules: [{pattern: 'TODO'}]}, {enabled: true}, {enabled: true, rules: []}, {enabled: true, hebrew: {fontSize: 32}}] ) {
    const runtime = createRuntime ( config );
    const editor = runtime.addEditor ( 'TODO שלום 안녕하세요' );
    runtime.activate ();
    await runtime.settle ();
    assert.equal ( runtime.types.length, 0 );
    assert.deepEqual ( decoratedText ( editor ), [] );
  }
});

test ( 'malformed font fields and CSS injection keep the editor styling', async () => {
  const values = [{fontFamily: 'Arial; color:red'}, {fontFamily: 'Arial\n'}, {fontFamily: 'Arial\r\n'}, {fontFamily: 'url(https://example.com)'}, {fontFamily: '"Arial'}, {fontFamily: 'A     ,'.repeat ( 60 ) + '!'}, {fontFamily: 'A' + ' '.repeat ( 100000 ) + '!'}, {fontSize: NaN}, {fontSize: Infinity}, {fontSize: 5}, {fontSize: 101}, {fontSize: '32; color:red'}, {fontWeight: '500; color:red'}, {fontWeight: '500\n'}];
  const runtime = createRuntime ({enabled: true, rules: values.map ( ( value, index ) => ({pattern: `word${index}\\b`, ...value}) )});
  const editor = runtime.addEditor ( values.map ( ( _, index ) => `word${index}` ).join ( ' ' ) );
  runtime.activate ();
  await runtime.settle ();
  const styled = decoratedText ( editor );
  assert.equal ( styled.length, values.length );
  for ( const {options} of styled ) {
    assert.equal ( options.textDecoration, undefined );
    assert.equal ( options.fontWeight, undefined );
    assert.equal ( options.fontStyle, undefined );
  }
});

test ( 'quoted font stacks, size boundaries and partial settings are accepted', async () => {
  const runtime = createRuntime ({enabled: true, rules: [{pattern: 'A', fontFamily: "'Noto Sans KR', Arial", fontSize: 6, fontWeight: '900'}]});
  const editor = runtime.addEditor ( 'A' );
  runtime.activate ();
  await runtime.settle ();
  const [styled] = decoratedText ( editor );
  assert.match ( styled.options.textDecoration, /font-family: 'Noto Sans KR', Arial !important; font-size: 6px/ );
  assert.equal ( styled.options.fontWeight, '900' );
  runtime.config.rules = [{pattern: 'A', fontSize: 100}];
  runtime.changeConfig ();
  await runtime.settle ();
  assert.equal ( decoratedText ( editor )[0].options.textDecoration, 'none; font-size: 100px !important' );
  assert.equal ( decoratedText ( editor )[0].options.fontWeight, undefined );
});

test ( 'settings changes, removal, and disabling dispose stale decorations', async () => {
  const runtime = createRuntime ( fonts () );
  const editor = runtime.addEditor ( 'hello שלום' );
  runtime.activate ();
  await runtime.settle ();
  const original = runtime.types.slice ();
  runtime.config.rules[0].fontSize = 36;
  runtime.changeConfig ();
  await runtime.settle ();
  assert.ok ( original.every ( type => type.disposed ) );
  assert.match ( decoratedText ( editor )[0].options.textDecoration, /36px/ );
  runtime.config.enabled = false;
  runtime.changeConfig ();
  await runtime.settle ();
  assert.deepEqual ( decoratedText ( editor ), [] );
  assert.ok ( runtime.types.every ( type => type.disposed ) );
  runtime.config.enabled = true;
  runtime.changeConfig ();
  await runtime.settle ();
  assert.equal ( decoratedText ( editor ).length, 1 );
  runtime.config.rules = [];
  runtime.changeConfig ();
  await runtime.settle ();
  assert.deepEqual ( decoratedText ( editor ), [] );
});

test ( 'edits update split views without recreating decoration types', async () => {
  const runtime = createRuntime ( fonts () );
  const first = runtime.addEditor ( 'hello\nשלום' );
  const second = runtime.addEditor ( '', '/sample.json', first.document );
  runtime.activate ();
  await runtime.settle ();
  const count = runtime.types.length;
  runtime.edit ( first, '😀 א\nnew\nשלום' );
  await runtime.settle ();
  for ( const editor of [first, second] ) assert.deepEqual ( decoratedText ( editor )[0].text, ['א', 'שלום'] );
  runtime.edit ( first, '' );
  await runtime.settle ();
  assert.deepEqual ( decoratedText ( second ), [] );
  assert.equal ( runtime.types.length, count );
});

test ( 'folder and language settings apply, and hidden editors release styles', async () => {
  const scoped = {'/one.json': sized ( 40 ), '/two.json:json': sized ( 24 )};
  const runtime = createRuntime ({enabled: false}, scoped);
  const first = runtime.addEditor ( 'א', '/one.json' );
  runtime.activate ();
  await runtime.settle ();
  const firstTypes = runtime.types.slice ();
  const second = runtime.addEditor ( 'ב', '/two.json' );
  runtime.emit ( 'visible', runtime.vscode.window.visibleTextEditors );
  await runtime.settle ();
  assert.match ( decoratedText ( first )[0].options.textDecoration, /40px/ );
  assert.match ( decoratedText ( second )[0].options.textDecoration, /24px/ );
  scoped['/two.json:json'].rules[0].fontSize = 30;
  runtime.changeConfig ( '/two.json' );
  await runtime.settle ();
  assert.match ( decoratedText ( second )[0].options.textDecoration, /30px/ );
  assert.ok ( firstTypes.every ( type => !type.disposed ) );
  runtime.vscode.window.visibleTextEditors = [second];
  runtime.emit ( 'visible', [second] );
  await runtime.settle ();
  assert.ok ( firstTypes.every ( type => type.disposed ) );
  assert.deepEqual ( decoratedText ( first ), [] );
});

test ( 'all matches are styled with correct UTF-16 offsets', async () => {
  const runtime = createRuntime ({enabled: true, rules: [{pattern: '안녕|😀'}]});
  const editor = runtime.addEditor ( '😀 안녕\n'.repeat ( 1500 ) );
  runtime.activate ();
  await runtime.settle ();
  const words = decoratedText ( editor )[0].text;
  assert.equal ( words.length, 3000 );
  assert.ok ( words.every ( ( word, index ) => word === ( index % 2 ? '안녕' : '😀' ) ) );
});

test ( 'changing a document language refreshes language-specific rules', async () => {
  const runtime = createRuntime ( fonts (), {'/sample.json:plaintext': sized ( 24 ), '/sample.json:markdown': {enabled: false}} );
  const editor = runtime.addEditor ( 'hello שלום' );
  runtime.activate ();
  await runtime.settle ();
  const original = runtime.types.slice ();
  editor.document.languageId = 'plaintext';
  runtime.emit ( 'open', editor.document );
  await runtime.settle ();
  assert.match ( decoratedText ( editor )[0].options.textDecoration, /24px/ );
  assert.ok ( original.every ( type => type.disposed ) );
  editor.document.languageId = 'markdown';
  runtime.emit ( 'open', editor.document );
  await runtime.settle ();
  assert.deepEqual ( decoratedText ( editor ), [] );
});

test ( 'disposal cancels pending work and releases subscriptions', async () => {
  const runtime = createRuntime ( fonts () );
  const editor = runtime.addEditor ( 'hello שלום' );
  runtime.activate ();
  runtime.dispose ();
  await runtime.settle ();
  assert.ok ( runtime.types.every ( type => type.disposed ) );
  assert.deepEqual ( decoratedText ( editor ), [] );
  assert.ok ( Array.from ( runtime.listeners.values () ).every ( callbacks => callbacks.size === 0 ) );
  assert.equal ( runtime.workers.size, 0 );
});

test ( 'regexFlags supports case-insensitive, multiline, dotAll, and global matching', async () => {
  const runtime = createRuntime ({enabled: true, rules: [
    {pattern: '^todo', regexFlags: 'im'},
    {pattern: 'start.*end', regexFlags: 's'},
    {pattern: '\\p{Script=Hangul}+', regexFlags: 'gu'}
  ]});
  const editor = runtime.addEditor ( 'TODO one\ntodo two\nstart\nend 안녕 세계' );
  runtime.activate ();
  await runtime.settle ();
  assert.deepEqual ( decoratedText ( editor ).map ( item => item.text ), [['TODO', 'todo'], ['start\nend'], ['안녕', '세계']] );
});

test ( 'earlier rules win overlaps while adjacent matches remain independent', async () => {
  const runtime = createRuntime ({enabled: true, rules: [{pattern: 'cd'}, {pattern: 'abc|ef|ghi'}, {pattern: 'de|ab'}]});
  const editor = runtime.addEditor ( 'abcdefghi' );
  runtime.activate ();
  await runtime.settle ();
  assert.deepEqual ( decoratedText ( editor ).map ( item => item.text ), [['cd'], ['ef', 'ghi'], ['ab']] );
});

test ( 'invalid rules are skipped, valid rules still run, and warnings are deduplicated', async () => {
  const invalid = [null, 'bad', {pattern: ''}, {pattern: '['}, {pattern: 'x', regexFlags: 'ii'}, {pattern: 'x', regexFlags: 'y'}, {pattern: 'x', regexFlags: 1}];
  const runtime = createRuntime ({enabled: true, rules: [...invalid, {pattern: 'TODO', fontWeight: 'bold'}]});
  const first = runtime.addEditor ( 'TODO x' );
  runtime.addEditor ( '', '/sample.json', first.document );
  runtime.activate ();
  await runtime.settle ();
  assert.deepEqual ( decoratedText ( first )[0].text, ['TODO'] );
  assert.equal ( runtime.warnings.length, invalid.length );
  runtime.edit ( first, 'TODO TODO' );
  await runtime.settle ();
  assert.equal ( runtime.warnings.length, invalid.length );
  runtime.config.rules = [{pattern: 'x'}];
  runtime.changeConfig ();
  runtime.edit ( first, 'x' );
  await runtime.settle ();
  assert.deepEqual ( decoratedText ( first )[0].text, ['x'] );
});

test ( 'malformed rule lists do not throw or style text', async () => {
  for ( const rules of [null, 'bad', {}] ) {
    const runtime = createRuntime ({enabled: true, rules});
    const editor = runtime.addEditor ( 'TODO' );
    runtime.activate ();
    await runtime.settle ();
    assert.equal ( runtime.types.length, 0 );
    assert.equal ( runtime.warnings.length, 1 );
    assert.deepEqual ( decoratedText ( editor ), [] );
  }
});

test ( 'zero-length matches are ignored without blocking later rules', async () => {
  const runtime = createRuntime ({enabled: true, rules: [{pattern: '(?=.)'}, {pattern: '😀|안녕'}]});
  const editor = runtime.addEditor ( '😀 안녕' );
  runtime.activate ();
  await runtime.settle ();
  assert.deepEqual ( decoratedText ( editor ).map ( item => item.text ), [['😀', '안녕']] );
  assert.deepEqual ( runtime.warnings, [] );
});

test ( 'editing cancels a running scan and only renders the latest text', async () => {
  const runtime = createRuntime ({enabled: true, rules: [{pattern: '(a+)+$|TODO'}]});
  const editor = runtime.addEditor ( 'a'.repeat ( 40 ) + '!' );
  runtime.activate ();
  await new Promise ( resolve => setTimeout ( resolve, 150 ) );
  runtime.edit ( editor, 'TODO latest 😀' );
  await runtime.settle ();
  assert.deepEqual ( decoratedText ( editor )[0].text, ['TODO'] );
  assert.deepEqual ( runtime.warnings, [] );
});

test ( 'slow patterns time out without freezing the host, then recover on a safe edit', async () => {
  const runtime = createRuntime ({enabled: true, rules: [{pattern: '(a+)+$'}]});
  const editor = runtime.addEditor ( 'a'.repeat ( 40 ) + '!' );
  runtime.activate ();
  await new Promise ( resolve => setTimeout ( resolve, 200 ) );
  assert.ok ( runtime.workers.size > 0 );
  await runtime.settle ();
  assert.deepEqual ( decoratedText ( editor ), [] );
  assert.match ( runtime.warnings[0], /too long/ );
  runtime.edit ( editor, 'aaa' );
  await runtime.settle ();
  assert.deepEqual ( decoratedText ( editor )[0].text, ['aaa'] );
});

test ( 'README settings style Markdown headings and TODO markers', async () => {
  const readme = fs.readFileSync ( path.join ( __dirname, '../README.md' ), 'utf8' );
  const settings = JSON.parse ( readme.match ( /```json\n([\s\S]*?)\n```/ )[1] )['[markdown]'];
  const runtime = createRuntime ({}, {'/sample.md:markdown': {enabled: settings['matchStyle.enabled'], rules: settings['matchStyle.rules']}});
  const editor = runtime.addEditor ( '# Title\n## Next steps\nTODO: Write the guide.', '/sample.md' );
  editor.document.languageId = 'markdown';
  runtime.activate ();
  await runtime.settle ();
  const styled = decoratedText ( editor );
  assert.deepEqual ( styled.map ( item => item.text ), [['## Next steps'], ['TODO']] );
  assert.match ( styled[0].options.textDecoration, /font-family: Georgia, serif/ );
  assert.match ( styled[0].options.textDecoration, /font-size: 24px/ );
  assert.equal ( styled[1].options.color, '#FFD60A' );
  assert.deepEqual ( runtime.warnings, [] );
});

test ( 'changing rules cancels a running scan before replacing styles', async () => {
  const runtime = createRuntime ({enabled: true, rules: [{pattern: '(a+)+$'}]});
  const editor = runtime.addEditor ( 'a'.repeat ( 40 ) + '!' );
  runtime.activate ();
  await new Promise ( resolve => setTimeout ( resolve, 150 ) );
  const original = runtime.types.slice ();
  runtime.config.rules = [{pattern: '!$', fontWeight: 'bold'}];
  runtime.changeConfig ();
  await runtime.settle ();
  assert.ok ( original.every ( type => type.disposed ) );
  assert.deepEqual ( decoratedText ( editor )[0].text, ['!'] );
  assert.deepEqual ( runtime.warnings, [] );
});

test ( 'hiding an editor cancels its running scan', async () => {
  const runtime = createRuntime ({enabled: true, rules: [{pattern: '(a+)+$'}]});
  const editor = runtime.addEditor ( 'a'.repeat ( 40 ) + '!' );
  runtime.activate ();
  await new Promise ( resolve => setTimeout ( resolve, 150 ) );
  runtime.vscode.window.visibleTextEditors = [];
  runtime.emit ( 'visible', [] );
  await runtime.settle ();
  assert.deepEqual ( decoratedText ( editor ), [] );
  assert.ok ( runtime.types.every ( type => type.disposed ) );
  assert.deepEqual ( runtime.warnings, [] );
});
