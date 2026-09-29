import vscode from 'vscode';
import {fontDecoration} from './fonts';
import {scanMatches} from './matches';

const activate = ( context: vscode.ExtensionContext ): void => {
  const styles = new Map<vscode.TextEditor, {rules: unknown[], decorations: vscode.TextEditorDecorationType[], cancel?: () => void}> ();
  const warnings = new Set<string> ();
  const scope = ( editor: vscode.TextEditor ) => ({uri: editor.document.uri, languageId: editor.document.languageId});
  const warn = ( message: string ) => {
    if ( warnings.has ( message ) ) return;
    warnings.add ( message );
    void vscode.window.showWarningMessage ( `MatchStyle: ${message}` );
  };

  const clear = ( editor: vscode.TextEditor ): void => {
    const style = styles.get ( editor );
    if ( !style ) return;
    style.cancel?. ();
    for ( const decoration of style.decorations ) decoration.dispose ();
    styles.delete ( editor );
  };

  const render = ( editor: vscode.TextEditor ): void => {
    let style = styles.get ( editor );
    if ( !style ) {
      const config = vscode.workspace.getConfiguration ( 'matchStyle', scope ( editor ) );
      if ( config.get<boolean> ( 'enabled', false ) !== true ) return;
      const rules = config.get<unknown> ( 'rules', [] );
      if ( !Array.isArray ( rules ) ) {
        warn ( 'rules must be an array.' );
        return;
      }
      style = {rules, decorations: rules.map ( rule => vscode.window.createTextEditorDecorationType ( fontDecoration ( rule ) ) )};
      styles.set ( editor, style );
    }

    style.cancel?. ();
    if ( !style.rules.length ) return;
    const current = style;
    current.cancel = scanMatches ( editor.document.getText (), current.rules, result => {
      for ( const [index, ranges] of result.ranges.entries () ) {
        editor.setDecorations ( current.decorations[index], ranges.map ( run => new vscode.Range ( editor.document.positionAt ( run.start ), editor.document.positionAt ( run.end ) ) ) );
      }
      for ( const error of result.errors ) warn ( error );
    }, message => {
      for ( const decoration of current.decorations ) editor.setDecorations ( decoration, [] );
      warn ( message );
    });
  };

  const refreshVisible = (): void => {
    const visible = vscode.window.visibleTextEditors;
    for ( const editor of styles.keys () ) {
      if ( !visible.includes ( editor ) ) clear ( editor );
    }
    for ( const editor of visible ) render ( editor );
  };

  context.subscriptions.push (
    vscode.window.onDidChangeVisibleTextEditors ( refreshVisible ),
    vscode.workspace.onDidOpenTextDocument ( document => {
      for ( const editor of vscode.window.visibleTextEditors ) {
        if ( editor.document !== document ) continue;
        clear ( editor );
        render ( editor );
      }
    }),
    vscode.workspace.onDidChangeTextDocument ( event => {
      if ( !event.contentChanges.length ) return;
      for ( const editor of vscode.window.visibleTextEditors ) {
        if ( editor.document === event.document ) render ( editor );
      }
    }),
    vscode.workspace.onDidChangeConfiguration ( event => {
      if ( event.affectsConfiguration ( 'matchStyle' ) ) warnings.clear ();
      for ( const editor of vscode.window.visibleTextEditors ) {
        if ( !event.affectsConfiguration ( 'matchStyle', scope ( editor ) ) ) continue;
        clear ( editor );
        render ( editor );
      }
    }),
    {dispose: () => { for ( const editor of styles.keys () ) clear ( editor ); }}
  );

  refreshVisible ();
};

export {activate};
