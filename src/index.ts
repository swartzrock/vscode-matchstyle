import vscode from 'vscode';
import {fontDecoration, hebrewRuns} from './fonts';

const activate = ( context: vscode.ExtensionContext ): void => {
  const styles = new Map<vscode.TextEditor, vscode.TextEditorDecorationType> ();
  const scope = ( editor: vscode.TextEditor ) => ({uri: editor.document.uri, languageId: editor.document.languageId});

  const clear = ( editor: vscode.TextEditor ): void => {
    const style = styles.get ( editor );
    if ( !style ) return;
    style.dispose ();
    styles.delete ( editor );
  };

  const render = ( editor: vscode.TextEditor ): void => {
    let style = styles.get ( editor );
    if ( !style ) {
      const config = vscode.workspace.getConfiguration ( 'matchStyle', scope ( editor ) );
      if ( config.get<boolean> ( 'enabled', false ) !== true ) return;
      style = vscode.window.createTextEditorDecorationType ( fontDecoration ( config.get ( 'hebrew' ) ) );
      styles.set ( editor, style );
    }

    const ranges: vscode.Range[] = [];
    for ( const run of hebrewRuns ( editor.document.getText () ) ) {
      ranges.push ( new vscode.Range ( editor.document.positionAt ( run.start ), editor.document.positionAt ( run.end ) ) );
    }
    editor.setDecorations ( style, ranges );
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
