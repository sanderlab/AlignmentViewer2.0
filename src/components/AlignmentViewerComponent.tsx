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
import { AceTextualRulerComponent } from "./AceTextualRulerComponent";
import { AceEditorComponent } from "./AceEditorComponent";
import { ArrayOneOrMore } from "../common/Utils";
import { IMiniMapProps } from "./MiniMapComponent";

export type IAlignmentViewerProps = {
  alignment: Alignment;
  style: AminoAcidAlignmentStyle | NucleotideAlignmentStyle;
} & Partial<DefaultPropsTypes>;

type DefaultPropsTypes = Readonly<typeof defaultProps>;

const defaultProps = {
  logoPlotStyle: LOGO_TYPES.LETTERS as LOGO_TYPES,
  zoomLevel: 13 as number,
  sortBy: SequenceSortOptions.INPUT as SequenceSortOptions,
  showAnnotations: true as boolean,
  showConsensus: true as boolean,
  showQuery: true as boolean,
  showRuler: true as boolean,
  showLogo: true as boolean,

  minimapOptions: {
    showMinimap: false as boolean,
    alignHorizontal: "right" as IMiniMapProps["alignHorizontal"],
    startingWidth: 100 as IMiniMapProps["startingWidth"],
    resizable: "horizontal" as IMiniMapProps["resizable"],
    verticalHeight: "div" as IMiniMapProps["verticalHeight"],
  },

  //array of individual barplots. Each barplot can contain multiple
  //dataseries. Note that more than 2 dataseries in a single plot
  //is difficult to understand and more than 3 is pretty much impossible
  barplots: [
    [
      SequenceBarplotComponent.SHANNON_ENTROPY_BARPLOT,
      SequenceBarplotComponent.GAPS_BARPLOT,
    ],
    //[SequenceBarplotComponent.KULLBAC_LEIBLER_DIVERGENCE_BARPLOT],
  ] as undefined | ArrayOneOrMore<ISequenceBarplotDataSeries>[],
};

enum ACE_EDITOR_IDS {
  QUERY = "QUERY",
  CONSENSUS = "CONSENSUS",
  POSITIONAL_RULER = "POSITIONAL_RULER",
  MSA_SEQUENCES = "MSA_SEQUENCES",
  MSA_IDS = "MSA_IDS",
}

interface IAlignmentViewerState {
  aceCharacterWidth: number;
  aceEditors: { [editorId: string]: Ace.Editor };
  msaEditorVewport?: {
    numberVisibleRows: number;
    firstFullyVisibleRow: number;
    lastFullyVisibleRow: number;
  };

  windowWidth: number;
  //windowHeight: number;
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
      aceEditors: {},
      aceCharacterWidth: 0,
      windowWidth: window.innerWidth,
      //windowHeight: window.innerHeight,
    };

    this.verticalScrollSync = new ScrollSync(ScrollType.vertical);
    this.horizontalScrollSync = new ScrollSync(ScrollType.horizontal);

    this.minimapClicked = this.minimapClicked.bind(this);
    this.minimapRectHighlightMoved = this.minimapRectHighlightMoved.bind(this);
    this.handleCharacterSizeChanged = this.handleCharacterSizeChanged.bind(
      this
    );
    this.aceEditorLoaded = this.aceEditorLoaded.bind(this);
    this.windowDimensionsUpdated = this.windowDimensionsUpdated.bind(this);
  }

  private handleCharacterSizeChanged(newCharSize: number) {
    if (this.state.aceCharacterWidth !== newCharSize) {
      this.setState({
        aceCharacterWidth: newCharSize,
      });
    }
  }

  /**
   * Handle new ace editor. Add it to scroll sync.
   * @param id
   * @param editor
   * @param parentElem
   * @param scrollSyncDirection
   */
  private aceEditorLoaded(
    id: ACE_EDITOR_IDS,
    editor: Ace.Editor,
    parentElem: HTMLDivElement,
    scrollSyncDirection: ScrollType
  ) {
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

    this.setState((startState) => {
      const newAceEditors = { ...startState.aceEditors };
      newAceEditors[id] = editor;

      return {
        aceCharacterWidth: editor.renderer.characterWidth, //todo: check if the same always.
        aceEditors: newAceEditors,
      };
    });

    //track visible rows to show in canvas MSA
    if (id === ACE_EDITOR_IDS.MSA_SEQUENCES) {
      editor.renderer.on("afterRender", () => {
        // BREAKS LOGO, rerenders everything below and kills performance. React lifecycle stuff.
        //setTimeout(() => {

        this.setState({
          msaEditorVewport: {
            numberVisibleRows:
              editor.renderer.getLastFullyVisibleRow() -
              editor.renderer.getFirstFullyVisibleRow() +
              1,
            firstFullyVisibleRow: editor.renderer.getFirstFullyVisibleRow(),
            lastFullyVisibleRow: editor.renderer.getLastFullyVisibleRow(),
          },
        });
        //});
      });
    }
  }

  /**
   * React to window dimension changes
   */
  protected windowDimensionsUpdated() {
    this.setState({
      windowWidth: window.innerWidth,
      //windowHeight: window.innerHeight,
    });
  }

  /**
   * scroll the aceEditors to a specific position when user clicks on the minimap
   * the editor should center around the click, which will be calculated here.
   *
   * TODO: this might be better delt with in the scroll sync class and only have
   *       one of the editors deal with the rectangles. It works fine right now
   *       when there is only one vertical scroll sync and the minimap widget
   *       spans the entire row, but it will be trickier if e.g., we have
   *       the rectangle take up only the visible horizontal space also.
   *
   * @param mousePosition
   */
  protected minimapClicked(mousePosition: IPosition) {
    const { aceEditors, msaEditorVewport } = this.state;

    //the ace editor should center around the click. calculate height
    const numRowsVisibleInAceEditor = msaEditorVewport
      ? msaEditorVewport.numberVisibleRows
      : 0;
    let newY = Math.round(mousePosition.y - numRowsVisibleInAceEditor / 2);
    newY = newY < 0 ? 0 : newY;

    if (aceEditors[ACE_EDITOR_IDS.MSA_SEQUENCES] !== undefined) {
      aceEditors[ACE_EDITOR_IDS.MSA_SEQUENCES]!.scrollToRow(newY);
    }
    if (aceEditors[ACE_EDITOR_IDS.MSA_IDS] !== undefined) {
      aceEditors[ACE_EDITOR_IDS.MSA_IDS]!.scrollToRow(newY);
    }
  }

  /**
   * scroll to specific position when user moves the highlight indicator on minimap
   * by dragging the rectangle itself.
   *
   * TODO: this might be better delt with in the scroll sync class and only have
   *       one of the editors deal with the rectangles. It works fine right now
   *       when there is only one vertical scroll sync and the minimap widget
   *       spans the entire row, but it will be trickier if e.g., we have
   *       the rectangle take up only the visible horizontal space also.
   */
  protected minimapRectHighlightMoved(
    rectBounds: IRectangle,
    mousePosition: IPosition
  ) {
    const { aceEditors } = this.state;

    if (aceEditors[ACE_EDITOR_IDS.MSA_SEQUENCES] !== undefined) {
      aceEditors[ACE_EDITOR_IDS.MSA_SEQUENCES]!.scrollToRow(rectBounds.y);
    }
    if (aceEditors[ACE_EDITOR_IDS.MSA_IDS] !== undefined) {
      aceEditors[ACE_EDITOR_IDS.MSA_IDS]!.scrollToRow(rectBounds.y);
    }
  }

  /*
   *
   *
   * RENDER DIFFERENT COMPONENTS
   *
   *
   */

  /**
   * Generate a single widget that contains an annotation and content
   * @param className
   * @param annotation
   * @param content
   * @param addAsElementToScrollSync
   */
  protected renderWidget(
    className: string,
    annotation: string | JSX.Element,
    content: JSX.Element | null,
    addAsElementToScrollSync?: boolean,
    key?: string
  ) {
    return (
      <div className={`av-widget ${className}`} key={key}>
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

  protected renderSequenceLogo = () => {
    const { alignment, logoPlotStyle, style } = this.props;
    return (
      <div
        className={
          `${style.alignmentType.className} ` +
          `${style.colorScheme.className} ` +
          `${PositionsToStyle.ALL.className}`
        }
      >
        {
          <SequenceLogoComponent
            alignment={alignment}
            glyphWidth={this.state.aceCharacterWidth}
            logoType={logoPlotStyle}
            alignmentType={style.alignmentType}
          />
        }
      </div>
    );
  };

  protected renderBarplot = (
    barplot: ArrayOneOrMore<ISequenceBarplotDataSeries>
  ) => {
    return (
      <SequenceBarplotComponent
        alignment={this.props.alignment}
        dataSeries={barplot}
        positionWidth={this.state.aceCharacterWidth}
      ></SequenceBarplotComponent>
    );
  };

  protected renderConsensusQueryBox = () => (
    <div className="consensusseq-box">
      <AceConsensusSequenceComponent
        alignment={this.props.alignment}
        fontSize={this.props.zoomLevel}
        classNames={[
          "ace-consensusseq",
          this.props.style.residueDetail.className,
          this.props.style.alignmentType.className,
          this.props.style.positionsToStyle.className,
          this.props.style.colorScheme.className,
        ].join(" ")}
        editorLoaded={(editor, parentElem) => {
          this.aceEditorLoaded(
            ACE_EDITOR_IDS.CONSENSUS,
            editor,
            parentElem,
            ScrollType.horizontal
          );
        }}
      ></AceConsensusSequenceComponent>
    </div>
  );

  protected renderQuerySeqBox = () => (
    <div className="queryseq-box">
      <AceTargetSequenceComponent
        alignment={this.props.alignment}
        fontSize={this.props.zoomLevel}
        sortBy={this.props.sortBy}
        classNames={[
          "ace-queryseq",
          this.props.style.residueDetail.className,
          this.props.style.alignmentType.className,
          this.props.style.positionsToStyle.className,
          this.props.style.colorScheme.className,
        ].join(" ")}
        editorLoaded={(editor, parentElem) => {
          this.aceEditorLoaded(
            ACE_EDITOR_IDS.QUERY,
            editor,
            parentElem,
            ScrollType.horizontal
          );
        }}
      ></AceTargetSequenceComponent>
    </div>
  );

  protected renderPositionBox = () => (
    <div className="position-box">
      {
        <AceTextualRulerComponent
          classNames="ace-positions"
          alignment={this.props.alignment}
          fontSize={this.props.zoomLevel}
          editorLoaded={(editor, parentElem) => {
            this.aceEditorLoaded(
              ACE_EDITOR_IDS.POSITIONAL_RULER,
              editor,
              parentElem,
              ScrollType.horizontal
            );
          }}
        />
      }
    </div>
  );

  protected renderAlignmentBox = () => (
    <div className="alignment-box">
      <AceMultipleSequenceAlignmentComponent
        alignment={this.props.alignment}
        fontSize={this.props.zoomLevel}
        sortBy={this.props.sortBy}
        classNames={[
          "ace-alignment",
          this.props.style.residueDetail.className,
          this.props.style.alignmentType.className,
          this.props.style.positionsToStyle.className,
          this.props.style.colorScheme.className,
        ].join(" ")}
        characterSizeChanged={this.handleCharacterSizeChanged}
        editorLoaded={(editor, parentElem) => {
          this.aceEditorLoaded(
            ACE_EDITOR_IDS.MSA_SEQUENCES,
            editor,
            parentElem,
            ScrollType.both
          );
        }}
      ></AceMultipleSequenceAlignmentComponent>
    </div>
  );

  protected renderAlignmentAnnotationBox = () => (
    <div className="alignment-metadata-box">
      <AceEditorComponent
        classNames="ace-alignment-metadata"
        text={this.props.alignment
          .getSequences(this.props.sortBy)
          .map((x) => x.id)
          .join("\n")}
        fontSize={this.props.zoomLevel}
        editorLoaded={(editor, parentElem) => {
          this.aceEditorLoaded(
            ACE_EDITOR_IDS.MSA_IDS,
            editor,
            parentElem,
            ScrollType.vertical
          );
        }}
      ></AceEditorComponent>
    </div>
  );

  protected renderMiniMap() {
    const { alignment, sortBy, style } = this.props;
    const { msaEditorVewport } = this.state;

    let mmOptions = this.props.minimapOptions
      ? this.props.minimapOptions
      : defaultProps.minimapOptions;
    const mmClassName = mmOptions.showMinimap ? "minimap" : "minimap hidden";
    return (
      alignment &&
      style && (
        <div className={mmClassName}>
          <MiniMapComponent
            //not exposed to instantiator
            alignment={alignment}
            alignmentStyle={style}
            sortBy={sortBy!}
            highlightRows={
              !msaEditorVewport
                ? undefined
                : {
                    rowStart: msaEditorVewport.firstFullyVisibleRow,
                    rowEnd: msaEditorVewport.lastFullyVisibleRow,
                  }
            }
            //exposed by prop to instantiator
            alignHorizontal={mmOptions.alignHorizontal}
            resizable={mmOptions.resizable}
            startingWidth={mmOptions.startingWidth}
            verticalHeight={mmOptions.verticalHeight}
            //not exposed yet to instantiator, but should in the future
            onClick={this.minimapClicked}
            onIndicatorDrag={this.minimapRectHighlightMoved}
          />
        </div>
      )
    );
  }

  /*
   *
   *
   * REACT FUNCTIONS
   *
   *
   */

  componentDidMount() {
    window.addEventListener("resize", this.windowDimensionsUpdated);
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.windowDimensionsUpdated);
  }

  render() {
    const {
      alignment,
      barplots,
      showAnnotations,
      showConsensus,
      showLogo,
      showQuery,
      showRuler,
    } = this.props;
    if (!alignment) {
      return null;
    }

    const classes = ["alignment-viewer"];
    if (!showAnnotations) {
      classes.push("annotation-closed");
    }

    return (
      <div className={classes.join(" ")}>
        {this.renderMiniMap()}

        {/*<div id="column_mouseover"></div>*/}

        {!barplots
          ? null
          : barplots.map((barplot, idx) =>
              this.renderWidget(
                "av-barplot-holder",
                barplot.map((series) => series.name).join(" / "),
                this.renderBarplot(barplot),
                true,
                `${idx}-${barplot.map((dataseries) => dataseries.id).join("|")}`
              )
            )}

        {!showLogo
          ? null
          : this.renderWidget(
              "av-sequence-logo-holder",
              "Logo:",
              this.renderSequenceLogo(),
              true
            )}

        {!showConsensus
          ? null
          : this.renderWidget(
              "av-consensus-seq-holder",
              "Consensus sequence:",
              this.renderConsensusQueryBox()
            )}

        {!showQuery
          ? null
          : this.renderWidget(
              "av-target-seq-holder",
              "Query sequence:",
              this.renderQuerySeqBox()
            )}

        {!showRuler
          ? null
          : this.renderWidget(
              "av-position-indicator-holder",
              "Position:",
              this.renderPositionBox()
            )}

        {this.renderWidget(
          "av-ace-msa-holder",
          this.renderAlignmentAnnotationBox(),
          this.renderAlignmentBox()
        )}
      </div>
    );
  }
}
