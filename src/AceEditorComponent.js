import React from "react";
import logo from "./logo.svg";
import "./App.css";
import ace from "ace-builds";
import { RawLogo } from "logojs-react";
import "./AceAlignmentMode";

export class AceEditorComponent extends React.Component {
  //
  //setup ace editors
  //
  prepAceEditor(el) {
    this.editor = ace.edit(el);
    this.editor.setShowPrintMargin(false);
    this.editor.setReadOnly(true);
    this.editor.setHighlightActiveLine(false);
    this.editor.setHighlightGutterLine(false);
    this.editor.renderer.setShowGutter(false);
    this.editor.setFontSize("10px");

    if (["query", "alignment"].includes(this.props.type)) {
      this.editor.session.setMode("ace/mode/alignment");
    }
    this.editor.renderer.$cursorLayer.element.style.display = "none";

    //
    // column highlighter
    //
    this.editor.on("mousemove", e => {
      var pos = e.getDocumentPosition();
      var extraPadding = 6;
      var screenCoordinates = this.editor.renderer.textToScreenCoordinates(
        pos.row,
        pos.column
      );
      var characterWidth = this.editor.renderer.characterWidth;

      document.getElementById("column_mouseover").style.left =
        screenCoordinates.pageX - characterWidth - extraPadding / 2 - 2 + "px";
      document.getElementById("column_mouseover").style.width =
        characterWidth + extraPadding + "px";
      document.getElementById("column_mouseover").style.display = "block";
    });


    //
    // listen for scroll changes
    //
    this.editor.session.on("changeScrollLeft", e => {
      this.props.onHorizScroll(e);
    });

    //
    // insert data
    //
    if (this.props.type === "query") {
      this.editor.insert(this.props.targetSequence.seq);
    } else if (this.props.type === "alignment") {
      this.editor.insert(this.props.alignment.map(x => x.seq).join("\n"));
    } else if (this.props.type === "position") {
      this.editor.insert("positions");
    } else {
      this.editor.insert("invalid type passed to AceEditorComponent");
    }

    el.style.visibility = "visible";
  }

  componentDidUpdate(prevProps) {
    if (prevProps.horizPos !== this.props.horizPos) {
      this.editor.session.setScrollLeft(this.props.horizPos);
    }
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
