import React from "react";
import "./AlignmentViewer.scss";
import { Ace } from "ace-builds";
import Alignment, { SequenceSortOptions } from "./Alignment";
import ScrollSync, { ScrollType } from "./ScrollSync";
import { AceMSAComponent, AceEditorTypes } from "./AceMSAComponent";
import { SequenceLogoComponent, LOGO_TYPES } from "./SequenceLogoComponent";
import { SequenceConservationComponent } from "./SequenceConservationComponent";
import { AlignmentCanvasComponent } from "./AlignmentCanvasComponent";
import {
  AminoAcidAlignmentStyle,
  NucleotideAlignmentStyle,
  PositionsToStyle
} from "./MolecularStyles";
import { MiniMap } from "./components/MiniMap";

export interface AppProps {
  alignment: Alignment;
  style: AminoAcidAlignmentStyle | NucleotideAlignmentStyle;
  logoPlotStyle: LOGO_TYPES;
  zoomLevel: number;
  sortBy: SequenceSortOptions;
}
export interface AppState {
  aceCharacterWidth: number;
  aceEditors: Ace.Editor[];
  alignmentEditorFirstRow?: number;
  alignmentEditorLastRow?: number;
}

export class AlignmentViewer extends React.Component<AppProps, AppState> {
  constructor(props: AppProps) {
    super(props);
    this.state = {
      aceEditors: [],
      aceCharacterWidth: 0
    };

    //setup scroll groups
    ScrollSync.getInstance().setScrollerGroup("horiz", ScrollType.horizontal);
  }

  _handleCharacterSizeChanged = (newCharSize: number) => {
    this.setState({
      aceCharacterWidth: newCharSize
    });
  };

  _aceEditorLoaded = (id: string, editor: Ace.Editor) => {
    console.log(
      "_aceEditorLoaded id =" + id + ", metrics:",
      //@ts-ignore
      editor.renderer.$fontMetrics
    );
    let scrollSync = ScrollSync.getInstance();
    scrollSync.registerScroller(editor, "horiz");
    this.setState({
      aceCharacterWidth: editor.renderer.characterWidth, //todo: check if the same always.
      aceEditors: [editor].concat(this.state.aceEditors)
    });

    console.log("");
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

  _elementLoaded(id: string, scroller: HTMLElement) {
    console.log("_elementLoaded id =" + id + ":", scroller);

    let scrollSync = ScrollSync.getInstance();
    scrollSync.registerScroller(scroller, "horiz");
  }

  protected generateWidget(
    className: string,
    desc: string,
    content: JSX.Element
  ) {
    return (
      <div
        className={`av-widget ${className}`}
        ref={e => {
          //TODO: move into separate component .. Ref can be null here and
          //      also good to keep track of removal / addition for scroll sync
          //console.log("the ref is:", e);
        }}
      >
        <div className="av-annotation">{desc}</div>
        <div className="av-content">{content}</div>
      </div>
    );
  }

  render() {
    return !this.props.alignment ? null : (
      <div className="alignment_viewer">
        {this.renderMiniMap()}
        {/*<div id="column_mouseover"></div>*/}

        {this.generateWidget(
          "av-conservation-gaps",
          "Conservation / gaps:",
          this.renderConservationBox()
        )}

        {this.generateWidget(
          "av-sequence-logo",
          "Logo:",
          this.renderSequenceLogo()
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
          "Individual sequence annotations go here..",
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
          logoLoaded={element => {
            //this._elementLoaded("sequence_logo", element as HTMLElement);
          }}
        />
      }
    </div>
  );

  protected renderConservationBox = () => (
    <SequenceConservationComponent
      id="sequence_conservation"
      alignment={this.props.alignment}
      characterWidth={this.state.aceCharacterWidth}
      conservationPlotLoaded={element => {
        //this._elementLoaded("sequence_conservation", element);
      }}
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
            this._aceEditorLoaded("ace-consensusseq", editor);
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
            this._aceEditorLoaded("ace-queryseq", editor);
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
            this._aceEditorLoaded("ace-positions", editor);
          }}
        />
      }
    </div>
  );

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
          this._aceEditorLoaded("ace-alignment", editor);
        }}
      />
    </div>
  );

  protected renderMiniMap() {
    const { alignment, sortBy, style } = this.props;
    return (
      alignment &&
      style && (
        <MiniMap
          width={alignment.getMaxSequenceLength()}
          height={500}
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
