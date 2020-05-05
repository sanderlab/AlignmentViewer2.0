/**
 * Base class for Ace Editor Components
 */
import React from "react";
import ace from "ace-builds";
import { Ace } from "ace-builds";

export interface IAceEditorProps {
  readonly id: string;

  text?: string;
  fontSize?: number;
  editorMode?: string;
  classNames?: string;

  editorLoaded?(editor: Ace.Editor, parentElem: HTMLDivElement): void;
  characterSizeChanged?(newCharacterWidth: number): void;

  mouseDown?(e: {
    mouseRow: number;
    mouseColumn: number;
    mousePageX: number;
    mousePageY: number;
    //mouseContainerX: number;
    //mouseContainerY: number;
  }): void;

  mouseMove?(e: {
    mouseRow: number;
    mouseColumn: number;
    mousePageX: number;
    mousePageY: number;
    //mouseContainerX: number;
    //mouseContainerY: number;
  }): void;

  mouseEnter?(): void;
  mouseLeave?(): void;
}

interface IChangeCharacterSizeEvent {
  data: { height: number; width: number };
  preventDefault(): void;
  stopPropagation(): void;
}

export class AceEditorComponent<
  P extends IAceEditorProps,
  S = {}
> extends React.Component<P, S> {
  private editor?: Ace.Editor;
  private lastText?: string;
  private lastMode?: string;
  private element?: HTMLElement;
  private lastElementWidth?: number;
  private lastElementHeight?: number;
  static defaultProps = {
    fontSize: 14,
  };

  /**************************
   *
   *
   * METHODS REQUIRED FROM SUBCLASSES
   *
   *
   **************************/
  getText(): string {
    if (this.props.text) {
      return this.props.text!;
    }
    throw Error(
      "Internal error: 'text' attribute must be provided or subclasses must implement getText()"
    );
  }
  getEditorMode(): string | undefined {
    return this.props.editorMode;
  }

  /**************************
   *
   *
   * PROTECTED METHODS
   *
   *
   **************************/
  /**
   * Load and setup the ace editor
   * @param el the element that will hold the ace editor.
   */
  protected setupEditor(el: HTMLElement) {
    this.editor = ace.edit(el);
    this.editor.setShowPrintMargin(false);
    this.editor.setReadOnly(true);
    this.editor.setHighlightActiveLine(false);
    this.editor.setHighlightGutterLine(false);
    this.editor.setFontSize(this.props.fontSize + "px");
    this.editor.renderer.setShowGutter(false);
    this.editor.renderer.setPadding(0);
    this.editor.renderer.$cursorLayer.element.style.display = "none";
  }

  /**
   * listen to mouse events and report them to instantiator
   */
  protected addEventListeners() {
    if (!this.editor) {
      throw Error("Editor must be defined before adding listeners.");
    }
    const { characterSizeChanged, mouseDown, mouseMove } = this.props;

    function getMousePosition(editor: Ace.Editor, event: Ace.AceEvent) {
      var pos = event.getDocumentPosition();
      var screenCoordinates = editor.renderer.textToScreenCoordinates(
        pos.row,
        pos.column
      );
      return {
        mouseRow: pos.row,
        mouseColumn: pos.column,
        mousePageX: screenCoordinates.pageX,
        mousePageY: screenCoordinates.pageY,
        //mouseContainerX:
        //  characterWidth * pos.column - this.editor.session.getScrollLeft(),
        //mouseContainerY: characterWidth * pos.row ???
      };
    }

    this.editor!.on("mousemove", (e) => {
      if (mouseMove) {
        mouseMove(getMousePosition(this.editor!, e));
      }
    });

    this.editor!.on("mousedown", (e) => {
      if (mouseDown) {
        mouseDown(getMousePosition(this.editor!, e));
      }
    });

    this.editor.renderer.on(
      "changeCharacterSize",
      (e: IChangeCharacterSizeEvent) => {
        if (characterSizeChanged) {
          characterSizeChanged(e.data.width);
        }
      }
    );
  }

  /**
   * update the text in the editor and set the editor to use that
   * mode (if provided).
   * @param newText
   * @param modeName the mode name for highlighting this ace editor. For alignments, this can
   *                 be defined as follows:
   *    const modeName = "ace/mode/" + this.props.alignment.getName();
   *    defineNewAlignmentMode(modeName, this.props.alignment);
   *    setText()
   * @throws an error if the editor is not yet defined.
   */
  protected setText() {
    if (!this.editor) {
      throw Error("Editor must be defined to call setText()");
    }
    //only update if needed
    if (this.props.fontSize + "px" !== this.editor.getFontSize()) {
      this.editor.setFontSize(this.props.fontSize + "px");
    }
    if (this.lastMode !== this.getEditorMode()) {
      const newMode = this.getEditorMode();
      this.editor.session.setMode(newMode!);
      this.lastMode = newMode;
    }
    if (!this.lastText || this.lastText !== this.getText()) {
      this.editor.selectAll();
      this.editor.removeLines();
      const newText = this.getText();
      this.editor.insert(newText);
      this.lastText = newText;
    }
  }

  /**
   * The initial editor load function. Will only run a single time.
   * @param e the HTMLelment that will hold the ace editor
   */
  protected initialLoad(e: HTMLDivElement | null) {
    if (e && !this.editor) {
      //only run if editor not loaded
      this.element = e;
      this.lastElementWidth = e.clientWidth;
      this.lastElementHeight = e.clientHeight;
      this.setupEditor(e);
      this.addEventListeners();
      this.setText();
      if (this.props.editorLoaded) {
        this.props.editorLoaded(this.editor!, e); //inform parent of loading.
      }
    }
  }

  /**************************
   *
   *
   * REACT METHODS
   *
   *
   **************************/
  componentDidUpdate() {
    if (!this.editor || !this.element) {
      throw Error(
        "internal error - componentDidUpdate called before editor initialized"
      );
    }
    this.setText(); //smart and will update only if needed.
    if (
      this.element.clientWidth !== this.lastElementWidth ||
      this.element.clientHeight !== this.lastElementHeight
    ) {
      this.lastElementWidth = this.element.clientWidth;
      this.lastElementHeight = this.element.clientHeight;
      this.editor.resize();
    }
    return false;
  }

  render() {
    return (
      <div
        className={this.props.classNames}
        onMouseEnter={() => {
          if (this.props.mouseEnter) {
            this.props.mouseEnter();
          }
        }}
        onMouseLeave={() => {
          if (this.props.mouseLeave) {
            this.props.mouseLeave();
          }
        }}
      >
        <div id={this.props.id} ref={(e) => this.initialLoad(e)}></div>
      </div>
    );
  }
}
