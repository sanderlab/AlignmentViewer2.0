import React from "react";
import "./AlignmentViewer.scss";
import { Ace } from "ace-builds";
import { Alignment, SequenceSortOptions } from "../common/Alignment";
import { ScrollSync, ScrollType } from "../common/ScrollSync";
import { SequenceLogoComponent, LOGO_TYPES } from "./SequenceLogoComponent";
import {
  ISequenceBarplotDataSeries,
  SequenceBarplotComponent,
} from "./SequenceBarplotComponent";
import {
  AminoAcidAlignmentStyle,
  NucleotideAlignmentStyle,
  PositionsToStyle,
} from "../common/MolecularStyles";
import { MiniMapComponent } from "./MiniMapComponent";
import { AceMultipleSequenceAlignmentComponent } from "./AceMultipleSequenceAlignmentComponent";
import { AceConsensusSequenceComponent } from "./AceConsensusSequenceComponent";
import { AceTargetSequenceComponent } from "./AceTargetSequenceComponent";
import AceTextualRulerComponent from "./AceTextualRulerComponent";
import { AceEditorComponent } from "./AceEditorComponent";

export type IAlignmentViewerProps = {
  alignment: Alignment;
  style: AminoAcidAlignmentStyle | NucleotideAlignmentStyle;
} & Partial<DefaultPropsTypes>;

type DefaultPropsTypes = Readonly<typeof defaultProps>;

const defaultProps = {
  logoPlotStyle: LOGO_TYPES.LETTERS as LOGO_TYPES,
  zoomLevel: 13 as number,
  sortBy: SequenceSortOptions.INPUT as SequenceSortOptions,
  showMiniMap: false as boolean,
  showAnnotations: true as boolean,
};

interface IAlignmentViewerState {
  aceCharacterWidth: number;
  aceEditors: Ace.Editor[];
  alignmentEditorVisibleFirstRow?: number;
  alignmentEditorVisibleLastRow?: number;

  defaultBarplotData: ISequenceBarplotDataSeries[];

  windowWidth: number;
  windowHeight: number;
}

export class AlignmentViewer extends React.Component<
  IAlignmentViewerProps,
  IAlignmentViewerState
> {
  private verticalScrollSync: ScrollSync;
  private horizontalScrollSync: ScrollSync;

  static defaultProps = defaultProps;

  constructor(props: IAlignmentViewerProps) {
    super(props);

    this.state = {
      aceEditors: [],
      aceCharacterWidth: 0,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      defaultBarplotData: [
        {
          id: "entropy",
          name: "Entropy",
          cssClass: "barplot-entropy",
          getPositionalInfo: (pos, al) => {
            const plc = al
              .getPositionalLetterCounts(true, al.getSortedUpperAlphaLetters())
              .get(pos);
            return {
              height:
                !plc || Object.keys(plc).length === 0
                  ? 0
                  : -1 *
                    Object.values(plc).reduce((acc, frac) => {
                      return acc + frac * Math.log2(frac);
                    }, 0),
            };
          },
        },
        {
          id: "gaps",
          name: "Gaps",
          cssClass: "barplot-gaps",
          plotOptions: {
            fixYMax: (alignment) => alignment.getSequences().length,
          },
          getPositionalInfo: (pos, al) => {
            return {
              height: al.getGapCountAtColumn(pos),
            };
          },
        },
      ],
    };

    this.verticalScrollSync = new ScrollSync(ScrollType.vertical);
    this.horizontalScrollSync = new ScrollSync(ScrollType.horizontal);

    //setup scroll groups
    //ScrollSync.getInstance().setScrollerGroup(
    //  "horizontal",
    //  ScrollType.horizontal
    //);
    //ScrollSync.getInstance().setScrollerGroup("vertical", ScrollType.vertical);
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
    parentElem: HTMLDivElement,
    scrollSyncDirection: ScrollType
  ) => {
    //console.log("_aceEditorLoaded id =" + id);
    if (
      scrollSyncDirection === ScrollType.horizontal ||
      scrollSyncDirection === ScrollType.both
    ) {
      this.horizontalScrollSync.registerAceScroller(editor, parentElem);
    }
    if (
      scrollSyncDirection === ScrollType.vertical ||
      scrollSyncDirection === ScrollType.both
    ) {
      this.verticalScrollSync.registerAceScroller(editor, parentElem);
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
              this.horizontalScrollSync.registerElementScroller(e);
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

  protected renderConservationBox = () => {
    const { defaultBarplotData } = this.state;
    return (
      <SequenceBarplotComponent
        alignment={this.props.alignment}
        dataSeries={defaultBarplotData}
        positionWidth={this.state.aceCharacterWidth}
      ></SequenceBarplotComponent>
    );
  };

  protected renderConsensusQueryBox = () => (
    <div className="consensusseq_box">
      <AceConsensusSequenceComponent
        id="ace-consensusseq"
        alignment={this.props.alignment}
        fontSize={this.props.zoomLevel}
        classNames={[
          this.props.style.residueDetail.className,
          this.props.style.alignmentType.className,
          this.props.style.positionsToStyle.className,
          this.props.style.colorScheme.className,
        ].join(" ")}
        editorLoaded={(editor, parentElem) => {
          this.aceEditorLoaded(
            "ace-consensusseq",
            editor,
            parentElem,
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
        editorLoaded={(editor, parentElem) => {
          this.aceEditorLoaded(
            "ace-queryseq",
            editor,
            parentElem,
            ScrollType.horizontal
          );
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
          editorLoaded={(editor, parentElem) => {
            this.aceEditorLoaded(
              "ace-positions",
              editor,
              parentElem,
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
        editorLoaded={(editor, parentElem) => {
          this.aceEditorLoaded(
            "ace-alignment",
            editor,
            parentElem,
            ScrollType.both
          );
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
        editorLoaded={(editor, parentElem) => {
          this.aceEditorLoaded(
            "ace-alignment-metadata",
            editor,
            parentElem,
            ScrollType.vertical
          );
        }}
      ></AceEditorComponent>
    </div>
  );

  protected renderMiniMap() {
    const {
      alignment,
      sortBy,
      showMiniMap,
      style,
      //minimapOptions,
    } = this.props;
    const { windowHeight } = this.state;

    //let width, height;
    //if (minimapOptions) {
    //width = minimapOptions.width ?
    //}
    const width = Math.max(
      300,
      Math.min(450, alignment.getMaxSequenceLength())
    );

    const mmClassName = showMiniMap ? "mini-map" : "mini-map hidden";
    return (
      alignment &&
      style && (
        <div className={mmClassName}>
          <MiniMapComponent
            width={width}
            height={windowHeight}
            alignHorizontal={"right"}
            alignment={alignment}
            style={style}
            sortBy={sortBy!}
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
