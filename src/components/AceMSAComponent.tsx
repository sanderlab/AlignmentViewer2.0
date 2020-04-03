import React from "react";
import ace from "ace-builds";
import Alignment, { SequenceSortOptions } from "../common/Alignment";
import { Ace } from "ace-builds";
import { defineNewAlignmentMode } from "../common/AceAlignmentMode";

export enum AceEditorTypes {
  query,
  consensus,
  alignment,
  alignment_metadata,
  position
}

export interface IAceMSAComponentProps {
  editorLoaded(editor: Ace.Editor): void;
  characterSizeChanged?(newCharacterWidth: number): void;

  alignment: Alignment;
  sortBy: SequenceSortOptions;
  fontSize: number;

  topLevelClassNames?: string;

  readonly id: string;
  readonly type: AceEditorTypes;
}
export interface IAceMSAComponentState {
  mouseRow?: number;
  mouseColumn?: number;
  mousePageX?: number;
  mousePageY?: number;
  mouseContainerX?: number;
  mouseContainerY?: number;
  characterWidth?: number;
  zoomLevel: number;
}

export class AceMSAComponent extends React.Component<
  IAceMSAComponentProps,
  IAceMSAComponentState
> {
  private editor?: Ace.Editor;

  componentDidUpdate(prevProps: IAceMSAComponentProps) {
    if (this.props.fontSize + "px" !== this.editor?.getFontSize()) {
      this.editor?.setFontSize(this.props.fontSize + "px");
      if (
        this.props.characterSizeChanged &&
        this.editor?.renderer.characterWidth
      ) {
        this.props.characterSizeChanged(this.editor?.renderer.characterWidth);
      }
    }

    if (
      this.props.alignment !== prevProps.alignment ||
      (this.props.sortBy !== prevProps.sortBy &&
        this.props.type === AceEditorTypes.alignment)
    ) {
      this.editor!.selectAll();
      this.editor!.removeLines();
      this.insertDataIntoEditor();
    }
  }

  /**
   * Generate a string axis (positional information) with one character per position
   * through the maxLength. Taken from alignmentviewer 1.0:
   *     https://github.com/sanderlab/alignmentviewer
   * May want to implement this better in the future (SVG + sliding tooltip for cursor?)
   * @param maxLength
   */
  static generateTextualRuler(maxLength: number): string {
    let s = ""; // should be a better way to do this to be honest
    for (let i = 1; i <= maxLength + 1; i++) {
      const Q = i % 10 === 0;
      const Q5 = !Q && i % 5 === 0;
      s += Q ? "|" : Q5 ? ":" : ".";
      if (!Q) {
        continue;
      }
      const sn = "" + i;
      const np = s.length - sn.length - 1; // where num starts
      if (np < 0) {
        continue;
      }
      s = s.substr(0, np) + sn + "|";
    }
    return s; // this.hruler = s.replace(/ /g, '.');
  }

  //
  //setup ace editors
  //
  setupAndInsertAceEditor(el: HTMLElement) {
    this.editor = ace.edit(el);
    this.editor.setShowPrintMargin(false);
    this.editor.setReadOnly(true);
    this.editor.setHighlightActiveLine(false);
    this.editor.setHighlightGutterLine(false);
    this.editor.setFontSize(this.props.fontSize + "px");
    this.editor.renderer.setShowGutter(false);
    this.editor.renderer.setPadding(0);
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
      if (columnMouseover) {
        columnMouseover.style.left =
          screenCoordinates.pageX - extraPadding / 2 - 2 + "px";
        columnMouseover.style.width = characterWidth + extraPadding + "px";
        columnMouseover.style.display = "block";
      }

      this.setState({
        mouseRow: pos.row,
        mouseColumn: pos.column,
        mousePageX: screenCoordinates.pageX,
        mousePageY: screenCoordinates.pageY,
        mouseContainerX:
          characterWidth * pos.column - this.editor.session.getScrollLeft(),
        characterWidth: characterWidth
        //mouseContainerY: characterWidth * pos.row ???
      });
    });

    return this.editor;
  }

  insertDataIntoEditor() {
    if (this.editor) {
      if (
        [
          AceEditorTypes.query,
          AceEditorTypes.alignment,
          AceEditorTypes.consensus
        ].includes(this.props.type)
      ) {
        const modeName = "ace/mode/" + this.props.alignment.getName();
        defineNewAlignmentMode(modeName, this.props.alignment);
        this.editor.session.setMode(modeName);
      }

      if (this.props.type === AceEditorTypes.query) {
        this.editor.insert(this.props.alignment.getTargetSequence().sequence);
      } else if (this.props.type === AceEditorTypes.consensus) {
        this.editor.insert(
          this.props.alignment
            .getConsensus()
            .map(letter => {
              return letter.letter;
            })
            .join("")
        );
      } else if (this.props.type === AceEditorTypes.alignment) {
        this.editor.insert(
          this.props.alignment
            .getSequences(this.props.sortBy)
            .map(x => x.sequence)
            .join("\n")
        );
      } else if (this.props.type === AceEditorTypes.alignment_metadata) {
        this.editor.insert(
          this.props.alignment
            .getSequences(this.props.sortBy)
            .map(x => x.id)
            .join("\n")
        );
      } else if (this.props.type === AceEditorTypes.position) {
        const maxSequenceLength = this.props.alignment.getMaxSequenceLength();
        this.editor.insert(
          AceMSAComponent.generateTextualRuler(maxSequenceLength)
        );
      } else {
        this.editor.insert("invalid type passed to AceEditorComponent");
      }
    }
  }

  divLoaded(e: HTMLDivElement | null) {
    if (e && !this.editor) {
      //only run if editor not loaded
      this.setupAndInsertAceEditor(e);
      this.insertDataIntoEditor();

      //e.classList.add("loaded");
      this.props.editorLoaded(this.editor!); //inform parent of loading.
    }
  }

  mouseExited() {
    const columnMouseover = document.getElementById("column_mouseover");
    if (columnMouseover) {
      columnMouseover.style.display = "none";
    }
    this.setState({
      mouseContainerX: undefined
    });
  }

  changeZoom(zoomLevel: number) {}

  render() {
    let xOffsetIndicator;
    if (this.state && typeof this.state.mouseContainerX === "number") {
      /*xOffsetIndicator = (
        <div
          style={{
            position: "absolute",
            left:
              this.state.mouseContainerX +
              (this.state.characterWidth as number) / 2 -
              20,
            width: 40,
            bottom: -30,
            zIndex: 1100
          }}
        >
          <div
            style={{
              textAlign: "center",
              padding: 2,
              fontWeight: "bold",
              background: "white",
              border: "solid 1px black"
            }}
          >
            {(this.state.mouseColumn as number) + 1}
          </div>
        </div>
      );*/
    }

    return (
      <div
        className={this.props.topLevelClassNames}
        onMouseLeave={() => this.mouseExited()}
      >
        <div id={this.props.id} ref={e => this.divLoaded(e)}></div>
        {xOffsetIndicator}
      </div>
    );
  }
}
