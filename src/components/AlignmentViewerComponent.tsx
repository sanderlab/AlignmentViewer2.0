import React from "react";
import "./AlignmentViewer.scss";
import { Ace } from "ace-builds";
import Alignment, { SequenceSortOptions } from "../common/Alignment";
import ScrollSync, { ScrollType } from "../common/ScrollSync";
import { SequenceLogoComponent, LOGO_TYPES } from "./SequenceLogoComponent";
import { SequenceConservationComponent } from "./SequenceConservationComponent";
import {
  AminoAcidAlignmentStyle,
  NucleotideAlignmentStyle,
  PositionsToStyle,
} from "../common/MolecularStyles";
import MiniMapComponent from "./MiniMapComponent";
import AceMultipleSequenceAlignmentComponent from "./AceMultipleSequenceAlignmentComponent";
import AceConsensusSequenceComponent from "./AceConsensusSequenceComponent";
import AceTargetSequenceComponent from "./AceTargetSequenceComponent";
import AceTextualRulerComponent from "./AceTextualRulerComponent";
import { AceEditorComponent } from "./AceEditorComponent";

export interface IAlignmentViewerProps {
  alignment: Alignment;
  style: AminoAcidAlignmentStyle | NucleotideAlignmentStyle;
  logoPlotStyle: LOGO_TYPES;
  zoomLevel: number;
  sortBy: SequenceSortOptions;
  showMiniMap?: boolean;
  showAnnotations?: boolean;
}
export interface IAlignmentViewerState {
  aceCharacterWidth: number;
  aceEditors: Ace.Editor[];
  alignmentEditorVisibleFirstRow?: number;
  alignmentEditorVisibleLastRow?: number;

  windowWidth: number;
  windowHeight: number;
}

export class AlignmentViewer extends React.Component<
  IAlignmentViewerProps,
  IAlignmentViewerState
> {
  constructor(props: IAlignmentViewerProps) {
    super(props);
    this.state = {
      aceEditors: [],
      aceCharacterWidth: 0,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
    };

    //setup scroll groups
    ScrollSync.getInstance().setScrollerGroup(
      "horizontal",
      ScrollType.horizontal
    );
    ScrollSync.getInstance().setScrollerGroup("vertical", ScrollType.vertical);
  }

  private handleCharacterSizeChanged = (newCharSize: number) => {
    if (this.state.aceCharacterWidth !== newCharSize) {
      this.setState({
        aceCharacterWidth: newCharSize,
      });
    }
  };

  private aceEditorLoaded = (
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
      aceEditors: [editor].concat(this.state.aceEditors),
    });

    //track visible rows to show in canvas MSA
    if (id === "ace-alignment") {
      editor.renderer.on("afterRender", () => {
        // BREAKS LOGO, rerenders everything below and kills performance. React lifecycle stuff.
        setTimeout(() => {
          this.setState({
            alignmentEditorVisibleFirstRow: editor.renderer.getFirstFullyVisibleRow(),
            alignmentEditorVisibleLastRow: editor.renderer.getLastFullyVisibleRow(),
          });
        });
      });
    }
  };

  private generateWidget(
    className: string,
    annotation: string | JSX.Element,
    content: JSX.Element,
    addAsElementToScrollSync?: boolean
  ) {
    return (
      <div className={`av-widget ${className}`}>
        <div className="av-annotation">{annotation}</div>
        <div
          className="av-content"
          ref={(e) => {
            if (e && addAsElementToScrollSync) {
              //TODO: move into separate component .. Ref can be null here and
              //      also good to keep track of removal / addition for scroll sync
              //console.log("the ref is:", e);
              let scrollSync = ScrollSync.getInstance();
              scrollSync.registerScroller(e, "horizontal", true);
            }
          }}
        >
          {content}
        </div>
      </div>
    );
  }

  protected windowDimensionsUpdated = () => {
    this.setState({
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
    });
  };

  componentDidMount() {
    window.addEventListener("resize", this.windowDimensionsUpdated);
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.windowDimensionsUpdated);
  }

  render() {
    if (!this.props.alignment) {
      return null;
    }

    const annotationClass = this.props.showAnnotations
      ? ""
      : " annotation-closed";

    return (
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
      <AceConsensusSequenceComponent
        id="ace-consensusseq"
        alignment={this.props.alignment}
        fontSize={this.props.zoomLevel}
        sortBy={this.props.sortBy}
        classNames={[
          this.props.style.residueDetail.className,
          this.props.style.alignmentType.className,
          this.props.style.positionsToStyle.className,
          this.props.style.colorScheme.className,
        ].join(" ")}
        editorLoaded={(editor) => {
          this.aceEditorLoaded(
            "ace-consensusseq",
            editor,
            ScrollType.horizontal
          );
        }}
      ></AceConsensusSequenceComponent>
    </div>
  );

  protected renderQuerySeqBox = () => (
    <div className="queryseq_box">
      <AceTargetSequenceComponent
        id="ace-queryseq"
        alignment={this.props.alignment}
        fontSize={this.props.zoomLevel}
        sortBy={this.props.sortBy}
        classNames={[
          this.props.style.residueDetail.className,
          this.props.style.alignmentType.className,
          this.props.style.positionsToStyle.className,
          this.props.style.colorScheme.className,
        ].join(" ")}
        editorLoaded={(editor) => {
          this.aceEditorLoaded("ace-queryseq", editor, ScrollType.horizontal);
        }}
      ></AceTargetSequenceComponent>
    </div>
  );

  protected renderPositionBox = () => (
    <div className="position_box">
      {
        <AceTextualRulerComponent
          id="ace-positions"
          alignment={this.props.alignment}
          fontSize={this.props.zoomLevel}
          editorLoaded={(editor) => {
            this.aceEditorLoaded(
              "ace-positions",
              editor,
              ScrollType.horizontal
            );
          }}
          mouseEnter={() => {
            //console.log("mouse entered position box");
          }}
          mouseLeave={() => {
            //console.log("mouse left position box");
          }}
          mouseMove={(e) => {
            //console.log("mouse moved in position box", e);
          }}
          mouseDown={(e) => {
            //console.log("mouse down in position box", e);
          }}
        />
      }
    </div>
  );

  protected renderAlignmentBox = () => (
    <div className="alignment_box">
      <AceMultipleSequenceAlignmentComponent
        id="ace-alignment"
        alignment={this.props.alignment}
        fontSize={this.props.zoomLevel}
        sortBy={this.props.sortBy}
        classNames={[
          this.props.style.residueDetail.className,
          this.props.style.alignmentType.className,
          this.props.style.positionsToStyle.className,
          this.props.style.colorScheme.className,
        ].join(" ")}
        characterSizeChanged={this.handleCharacterSizeChanged}
        editorLoaded={(editor) => {
          this.aceEditorLoaded("ace-alignment", editor, ScrollType.both);
        }}
      ></AceMultipleSequenceAlignmentComponent>
    </div>
  );

  protected renderAlignmentAnnotationBox = () => (
    <div className="alignment_metadata_box">
      <AceEditorComponent
        id="ace-alignment-metadata"
        text={this.props.alignment
          .getSequences(this.props.sortBy)
          .map((x) => x.id)
          .join("\n")}
        fontSize={this.props.zoomLevel}
        editorLoaded={(editor) => {
          this.aceEditorLoaded(
            "ace-alignment-metadata",
            editor,
            ScrollType.vertical
          );
        }}
      ></AceEditorComponent>
    </div>
  );

  protected renderMiniMap() {
    const { alignment, sortBy, style, showMiniMap } = this.props;
    const { windowWidth, windowHeight } = this.state;

    const mmClassName = showMiniMap ? "mini-map" : "mini-map hidden";
    return (
      alignment &&
      style && (
        <div className={mmClassName}>
          <MiniMapComponent
            width={Math.min(400, alignment.getMaxSequenceLength())}
            height={windowHeight}
            alignHorizontal={"right"}
            alignment={alignment}
            style={style}
            sortBy={sortBy}
            highlightRows={
              this.state.alignmentEditorVisibleFirstRow !== undefined &&
              this.state.alignmentEditorVisibleLastRow !== undefined
                ? [
                    this.state.alignmentEditorVisibleFirstRow,
                    this.state.alignmentEditorVisibleLastRow,
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
      alignmentEditorVisibleFirstRow: alignmentEditorFirstRow,
      alignmentEditorVisibleLastRow: alignmentEditorLastRow,
    } = this.state;
    let rowCount = 40;
    if (
      alignmentEditorFirstRow !== undefined &&
      alignmentEditorLastRow !== undefined
    ) {
      rowCount = alignmentEditorLastRow - alignmentEditorFirstRow;
    }

    if (aceEditors.length >= 1) {
      aceEditors[0].scrollToRow(Math.floor(y - rowCount / 2));
    }
  };
}
