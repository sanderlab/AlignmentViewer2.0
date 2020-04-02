import React from "react";
import "./AlignmentViewer.scss";
import { Ace } from "ace-builds";
import Alignment, { SequenceSortOptions } from "./Alignment";
import ScrollSync, { ScrollType } from "./ScrollSync";
import { AceMSAComponent, AceEditorTypes } from "./AceMSAComponent";
import { SequenceLogoComponent, LOGO_TYPES } from "./SequenceLogoComponent";
import { SequenceConservationComponent } from "./SequenceConservationComponent";
import {
  AminoAcidAlignmentStyle,
  NucleotideAlignmentStyle,
  PositionsToStyle
} from "./MolecularStyles";
import { MiniMap } from "./components/MiniMap";

export interface AlignmentViewerProps {
  alignment: Alignment;
  style: AminoAcidAlignmentStyle | NucleotideAlignmentStyle;
  logoPlotStyle: LOGO_TYPES;
  zoomLevel: number;
  sortBy: SequenceSortOptions;
  showMiniMap?: boolean;
  showAnnotations?: boolean;
}
export interface AlignmentViewerState {
  aceCharacterWidth: number;
  aceEditors: Ace.Editor[];
  alignmentEditorFirstRow?: number;
  alignmentEditorLastRow?: number;
}

export class AlignmentViewer extends React.Component<
  AlignmentViewerProps,
  AlignmentViewerState
> {
  constructor(props: AlignmentViewerProps) {
    super(props);
    this.state = {
      aceEditors: [],
      aceCharacterWidth: 0
    };

    //setup scroll groups
    ScrollSync.getInstance().setScrollerGroup(
      "horizontal",
      ScrollType.horizontal
    );
    ScrollSync.getInstance().setScrollerGroup("vertical", ScrollType.vertical);
  }

  _handleCharacterSizeChanged = (newCharSize: number) => {
    this.setState({
      aceCharacterWidth: newCharSize
    });
  };

  _aceEditorLoaded = (
    id: string,
    editor: Ace.Editor,
    scrollSyncDirection: ScrollType
  ) => {
    //console.log("_aceEditorLoaded id =" + id);

    let scrollSync = ScrollSync.getInstance();
    if (
      scrollSyncDirection === ScrollType.horizontal ||
      scrollSyncDirection === ScrollType.both
    ) {
      scrollSync.registerScroller(editor, "horizontal");
    }
    if (
      scrollSyncDirection === ScrollType.vertical ||
      scrollSyncDirection === ScrollType.both
    ) {
      scrollSync.registerScroller(editor, "vertical");
    }
    this.setState({
      aceCharacterWidth: editor.renderer.characterWidth, //todo: check if the same always.
      aceEditors: [editor].concat(this.state.aceEditors)
    });

    //track visible rows to show in canvas MSA
    if (id === "ace-alignment") {
      editor.renderer.on("afterRender", () => {
        // BREAKS LOGO, rerenders everything below and kills performance. React lifecycle stuff.
        setTimeout(() => {
          this.setState({
            alignmentEditorFirstRow: editor.renderer.getFirstFullyVisibleRow(),
            alignmentEditorLastRow: editor.renderer.getLastFullyVisibleRow()
          });
        });
      });
    }
  };

  _elementLoaded(className: string, scroller: HTMLElement) {
    //console.log("_elementLoaded className =" + className + ":", scroller);

    let scrollSync = ScrollSync.getInstance();
    scrollSync.registerScroller(scroller, "horizontal", true);
  }

  protected generateWidget(
    className: string,
    annotation: string | JSX.Element,
    content: JSX.Element,
    addToScrollSync?: boolean
  ) {
    return (
      <div className={`av-widget ${className}`}>
        <div className="av-annotation">{annotation}</div>
        <div
          className="av-content"
          ref={e => {
            if (e && addToScrollSync) {
              //TODO: move into separate component .. Ref can be null here and
              //      also good to keep track of removal / addition for scroll sync
              //console.log("the ref is:", e);
              this._elementLoaded(className, e);
            }
          }}
        >
          {content}
        </div>
      </div>
    );
  }

  render() {
    const annotationClass = this.props.showAnnotations
      ? ""
      : " annotation-closed";

    return !this.props.alignment ? null : (
      <div className={`alignment_viewer${annotationClass}`}>
        {this.renderMiniMap()}
        {/*<div id="column_mouseover"></div>*/}

        {this.generateWidget(
          "av-conservation-gaps",
          "Conservation / gaps:",
          this.renderConservationBox(),
          true
        )}

        {this.generateWidget(
          "av-sequence-logo",
          "Logo:",
          this.renderSequenceLogo(),
          true
        )}

        {this.generateWidget(
          "av-consensus-seq",
          "Consensus sequence:",
          this.renderConsensusQueryBox()
        )}

        {this.generateWidget(
          "av-target-seq",
          "Query sequence:",
          this.renderQuerySeqBox()
        )}

        {this.generateWidget(
          "av-position-indicator",
          "Position:",
          this.renderPositionBox()
        )}

        {this.generateWidget(
          "av-ace-msa",
          this.renderAlignmentAnnotationBox(),
          this.renderAlignmentBox()
        )}

        {/*
        //this is where we would add the webgl msa ..
        this.generateWidget(
          "av-webgl-msa",
          "",
          this.renderDatatableBox()
        )*/}
      </div>
    );
  }

  protected renderSequenceLogo = () => (
    <div
      className={
        `logo_box ${this.props.style.alignmentType.className} ` +
        `${this.props.style.colorScheme.className} ` +
        `${PositionsToStyle.ALL.className}`
      }
    >
      {
        <SequenceLogoComponent
          id="sequence_logo"
          alignment={this.props.alignment}
          glyphWidth={this.state.aceCharacterWidth}
          logoType={this.props.logoPlotStyle}
        />
      }
    </div>
  );

  protected renderConservationBox = () => (
    <SequenceConservationComponent
      id="sequence_conservation"
      alignment={this.props.alignment}
      characterWidth={this.state.aceCharacterWidth}
    />
  );

  protected renderConsensusQueryBox = () => (
    <div className="consensusseq_box">
      {
        <AceMSAComponent
          id="ace-consensusseq"
          type={AceEditorTypes.consensus}
          alignment={this.props.alignment}
          fontSize={this.props.zoomLevel}
          sortBy={this.props.sortBy}
          topLevelClassNames={[
            this.props.style.residueDetail.className,
            this.props.style.alignmentType.className,
            this.props.style.positionsToStyle.className,
            this.props.style.colorScheme.className
          ].join(" ")}
          editorLoaded={editor => {
            this._aceEditorLoaded(
              "ace-consensusseq",
              editor,
              ScrollType.horizontal
            );
          }}
        />
      }
    </div>
  );

  protected renderQuerySeqBox = () => (
    <div className="queryseq_box">
      {
        <AceMSAComponent
          id="ace-queryseq"
          type={AceEditorTypes.query}
          alignment={this.props.alignment}
          fontSize={this.props.zoomLevel}
          sortBy={this.props.sortBy}
          topLevelClassNames={[
            this.props.style.residueDetail.className,
            this.props.style.alignmentType.className,
            this.props.style.positionsToStyle.className,
            this.props.style.colorScheme.className
          ].join(" ")}
          editorLoaded={editor => {
            this._aceEditorLoaded(
              "ace-queryseq",
              editor,
              ScrollType.horizontal
            );
          }}
        />
      }
    </div>
  );

  protected renderPositionBox = () => (
    <div className="position_box">
      {
        <AceMSAComponent
          id="ace-positions"
          type={AceEditorTypes.position}
          alignment={this.props.alignment}
          fontSize={this.props.zoomLevel}
          sortBy={this.props.sortBy}
          editorLoaded={editor => {
            this._aceEditorLoaded(
              "ace-positions",
              editor,
              ScrollType.horizontal
            );
          }}
        />
      }
    </div>
  );

  /*
  protected renderDatatableBox = () => (
    <div className="datatable_box" id="datatable">
      {
        <AlignmentCanvasComponent
          id="alignment_canvas"
          alignment={this.props.alignment}
          alignmentType={this.props.style.alignmentType}
          positionsToStyle={this.props.style.positionsToStyle}
          colorScheme={this.props.style.colorScheme}
          sortBy={this.props.sortBy}
          mouseDown={(x, y) => {
            console.log("someone clicked on the canvas:" + x + "," + y);
          }}
          highlightRows={
            this.state.alignmentEditorFirstRow !== undefined &&
            this.state.alignmentEditorLastRow !== undefined
              ? [
                  this.state.alignmentEditorFirstRow,
                  this.state.alignmentEditorLastRow
                ]
              : undefined
          }
        />
      }
    </div>
  );
*/
  protected renderAlignmentBox = () => (
    <div className="alignment_box">
      <AceMSAComponent
        id="ace-alignment"
        type={AceEditorTypes.alignment}
        alignment={this.props.alignment}
        fontSize={this.props.zoomLevel}
        sortBy={this.props.sortBy}
        topLevelClassNames={[
          this.props.style.residueDetail.className,
          this.props.style.alignmentType.className,
          this.props.style.positionsToStyle.className,
          this.props.style.colorScheme.className
        ].join(" ")}
        characterSizeChanged={this._handleCharacterSizeChanged}
        editorLoaded={editor => {
          this._aceEditorLoaded("ace-alignment", editor, ScrollType.both);
        }}
      />
    </div>
  );

  protected renderAlignmentAnnotationBox = () => (
    <div className="alignment_metadata_box">
      <AceMSAComponent
        id="ace-alignment-metadata"
        type={AceEditorTypes.alignment_metadata}
        alignment={this.props.alignment}
        fontSize={this.props.zoomLevel}
        sortBy={this.props.sortBy}
        characterSizeChanged={this._handleCharacterSizeChanged}
        editorLoaded={editor => {
          this._aceEditorLoaded(
            "ace-alignment-metadata",
            editor,
            ScrollType.vertical
          );
        }}
      />
    </div>
  );

  protected renderMiniMap() {
    const { alignment, sortBy, style, showMiniMap } = this.props;

    const mmClassName = showMiniMap ? "mini-map" : "mini-map hidden";

    return (
      alignment &&
      style && (
        <div className={mmClassName}>
          <MiniMap
            width={alignment.getMaxSequenceLength()}
            height={window.innerHeight}
            alignHorizontal={"right"}
            alignment={alignment}
            style={style}
            sortBy={sortBy}
            highlightRows={
              this.state.alignmentEditorFirstRow !== undefined &&
              this.state.alignmentEditorLastRow !== undefined
                ? [
                    this.state.alignmentEditorFirstRow,
                    this.state.alignmentEditorLastRow
                  ]
                : undefined
            }
            onClick={this.onMinimapClick}
          />
        </div>
      )
    );
  }

  protected onMinimapClick = (x: number, y: number) => {
    const {
      aceEditors,
      alignmentEditorFirstRow,
      alignmentEditorLastRow
    } = this.state;
    let rowCount = 40;
    if (alignmentEditorFirstRow && alignmentEditorLastRow) {
      rowCount = alignmentEditorLastRow - alignmentEditorFirstRow;
    }

    if (aceEditors.length >= 1) {
      aceEditors[0].scrollToRow(Math.floor(y - rowCount / 2));
    }
  };
}
