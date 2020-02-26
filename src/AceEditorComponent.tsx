import React from "react";
import ace, { Ace } from "ace-builds";

export interface IAceEditorComponentProps {
  text: string;
  /*
  editorOptions: {
    showPrintMargin?: boolean;
    readOnly?: boolean;
    highlightActiveLine?: boolean;
    highlightGutterLine?: boolean;
    showGutter?: boolean;
    fontSize?: number;
    padding?: number;
    cursorStyle?: string;
  };*/

  mouseMove(e: {
    row: number;
    column: number;
    pageX: number;
    pageY: number;
  }): void;
}

export class AceEditorComponent extends React.Component<
  IAceEditorComponentProps
> {
  private editor?: Ace.Editor;

  componentDidUpdate(nextProps: IAceEditorComponentProps) {}

  //
  //setup ace editors
  //
  setupAndInsertAceEditor(el: HTMLElement): Ace.Editor {
    this.editor = ace.edit(el);
    this.editor.setShowPrintMargin(false);
    this.editor.setReadOnly(true);
    this.editor.setHighlightActiveLine(false);
    this.editor.setHighlightGutterLine(false);
    this.editor.setFontSize("12px");
    this.editor.renderer.setShowGutter(false);
    this.editor.renderer.setPadding(0);
    this.editor.renderer.$cursorLayer.element.style.display = "none";

    //
    // pass events to caller
    //
    this.editor.on("mousemove", e => {
      if (!this.editor) {
        return;
      }
      const pos = e.getDocumentPosition();
      var screenCoordinates = this.editor.renderer.textToScreenCoordinates(
        pos.row,
        pos.column
      );
      this.props.mouseMove({
        row: pos.row,
        column: pos.column,
        pageX: screenCoordinates.pageX,
        pageY: screenCoordinates.pageY
      });
    });

    this.editor.on("mousedown", e => {
      //console.log("mousedown");
    });

    return this.editor;
  }

  render() {
    return <div></div>;
  }
}
