import React from "react";
import "./AceAlignmentMode";
import "./App.css";
import ace, { Ace } from "ace-builds";
import { Sequence, AceEditorTypes } from "./App";

export interface IAceEditorComponentProps {
  editorLoaded(editor: Ace.Editor): void;
  targetSequence: Sequence;
  alignment: Sequence[];
  readonly id: string;
  readonly type: AceEditorTypes;
}

export class AceEditorComponent extends React.Component<IAceEditorComponentProps> {

  private editor?: Ace.Editor;


  /**
   * Generate a string axis (positional information) with one character per position
   * through the maxLength. Taken from alignmentviewer 1.0:
   *     https://github.com/sanderlab/alignmentviewer
   * May want to implement this better in the future (SVG + sliding tooltip for cursor?)
   * @param maxLength 
   */
  _generatePositionRuler(maxLength: number): string{
      let s = ''; // should be a better way to do this to be honest
      for (let i = 1; i <= maxLength+1; i++) {
          const Q = i % 10 === 0;
          const Q5 = !Q && i % 5 === 0;
          s += Q ? '|' : Q5 ? ':' : '.';
          if (!Q) {
              continue;
          }
          const sn = '' + i;
          const np = s.length - sn.length - 1; // where num starts
          if (np < 0) {
              continue;
          }
          s = s.substr(0, np) + sn + '|';
      }
      return (s); // this.hruler = s.replace(/ /g, '.');
  }

  //
  //setup ace editors
  //
  prepAceEditor(el: null | HTMLElement) {
    if (el === null){ return; }
    this.editor = ace.edit(el);
    this.editor.setShowPrintMargin(false);
    this.editor.setReadOnly(true);
    this.editor.setHighlightActiveLine(false);
    this.editor.setHighlightGutterLine(false);
    this.editor.setFontSize("12px");
    this.editor.renderer.setShowGutter(false);
    this.editor.renderer.setPadding(0);

    if ([AceEditorTypes.query, AceEditorTypes.alignment].includes(this.props.type)) {
      this.editor.session.setMode("ace/mode/alignment");
    }
    this.editor.renderer.$cursorLayer.element.style.display = "none";



    //
    // column highlighter
    //
    this.editor.on("mousemove", e => {
      if (!this.editor) {
        return;
      }
      var pos = e.getDocumentPosition();
      var extraPadding = 6;
      var screenCoordinates = this.editor.renderer.textToScreenCoordinates(
        pos.row,
        pos.column
      );
      var characterWidth = this.editor.renderer.characterWidth;
      const columnMouseover = document.getElementById("column_mouseover");
      if (columnMouseover){
        columnMouseover.style.left = screenCoordinates.pageX - extraPadding / 2 - 2 + "px";
        columnMouseover.style.width = characterWidth + extraPadding + "px";
        columnMouseover.style.display = "block";
      }
    });

    //
    // insert data
    //
    if (this.props.type === AceEditorTypes.query) {
      this.editor.insert(this.props.targetSequence.sequence);
    } else if (this.props.type === AceEditorTypes.alignment) {
      this.editor.insert(this.props.alignment.map(x => x.sequence).join("\n"));
    } else if (this.props.type === AceEditorTypes.position) {
      const maxSequenceLength = [this.props.targetSequence].concat(this.props.alignment).reduce((acc, current) =>{
        if (current.sequence.length>acc) { acc = current.sequence.length; }
        return acc;
      }, -1);
      
      this.editor.insert(this._generatePositionRuler(maxSequenceLength));
    } else {
      this.editor.insert("invalid type passed to AceEditorComponent");
    }

    el.style.visibility = "visible";
    this.props.editorLoaded(this.editor);
  }

  render() {
    return (
      <div
        id={this.props.id}
        ref={el => {
          if (!this.editor) {
            this.prepAceEditor(el);
          }
        }}
      ></div>
    );
  }
}
