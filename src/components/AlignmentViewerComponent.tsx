import React from "react";
import "./AlignmentViewer.scss";
import { Ace } from "ace-builds";
import { Alignment } from "../common/Alignment";
import { SequenceSorter } from "../common/AlignmentSorter";
import { ScrollSync, ScrollType } from "../common/ScrollSync";
import { store } from "../common/ReduxStore";
import {
  SequenceLogoComponent,
  LOGO_TYPES,
  ISequenceLogoProps,
} from "./SequenceLogoComponent";
import {
  SequenceBarplotComponent,
  ISequenceBarplotProps,
} from "./SequenceBarplotComponent";
import {
  AminoAcidAlignmentStyle,
  NucleotideAlignmentStyle,
} from "../common/MolecularStyles";
import { MiniMap } from "./minimap/MiniMapHook";
import { AceMultipleSequenceAlignmentComponent } from "./ace/AceMultipleSequenceAlignmentComponent";
import { AceConsensusSequenceComponent } from "./ace/AceConsensusSequenceComponent";
import { AceQuerySequenceComponent } from "./ace/AceQuerySequenceComponent";
import { AceTextualRulerComponent } from "./ace/AceTextualRulerComponent";
import { AceEditorComponent } from "./ace/AceEditorComponent";
import { IMiniMapProps } from "./minimap/MiniMapHook";
import { AlignmentDetails } from "./alignment-details/AlignmentDetailsHook";
import { Provider } from "react-redux";
import { getAlignmentFontDetails } from "../common/Utils";

export type IAlignmentViewerProps = {
  alignment: Alignment;
  style: AminoAcidAlignmentStyle | NucleotideAlignmentStyle;

  //event reporting
  minimapClicked?(mousePosition: IPosition): void;
} & Partial<DefaultPropsTypes>;

type DefaultPropsTypes = Readonly<typeof defaultProps>;
type IBarplotExposedProps = Pick<
  ISequenceBarplotProps,
  "dataSeriesSet" | "tooltipPlacement" | "height"
>;

const defaultProps = {
  zoomLevel: 13 as number,
  sortBy: SequenceSorter.INPUT as SequenceSorter,

  showAnnotations: true as boolean,
  showConsensus: true as boolean,
  showLogo: true as boolean,
  showMinimap: false as boolean,
  showQuery: true as boolean,
  showRuler: true as boolean,

  logoOptions: {
    logoType: LOGO_TYPES.LETTERS,
    height: "100px",
    tooltipPlacement: undefined,
  } as Partial<
    Pick<ISequenceLogoProps, "tooltipPlacement" | "logoType" | "height">
  >,

  minimapOptions: {
    alignHorizontal: "right",
    startingWidth: 100,
    resizable: "horizontal",
    verticalHeight: "div",
  } as Partial<
    Pick<
      IMiniMapProps,
      "alignHorizontal" | "startingWidth" | "resizable" | "verticalHeight"
    >
  >,

  //array of individual barplots. Each barplot can contain multiple
  //dataseries. Note that more than 2 dataseries in a single plot
  //is difficult to understand and more than 3 is pretty much impossible
  barplots: [
    {
      dataSeriesSet: [
        SequenceBarplotComponent.SHANNON_ENTROPY_BARPLOT,
        SequenceBarplotComponent.GAPS_BARPLOT,
      ],
      tooltipPlacement: undefined,
      height: "100px",
    },
    //[SequenceBarplotComponent.KULLBAC_LEIBLER_DIVERGENCE_BARPLOT],
  ] as undefined | IBarplotExposedProps[],
};

enum ACE_EDITOR_IDS {
  QUERY = "QUERY",
  CONSENSUS = "CONSENSUS",
  POSITIONAL_RULER = "POSITIONAL_RULER",
  MSA_SEQUENCES = "MSA_SEQUENCES",
  MSA_IDS = "MSA_IDS",
}

interface IAlignmentViewerState {
  aceEditors: { [editorId: string]: Ace.Editor };
  msaEditorVewport?: {
    numberVisibleRows: number;
    firstFullyVisibleRow: number;
    lastFullyVisibleRow: number;
  };

  windowWidth: number;
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
      windowWidth: window.innerWidth,
    };

    this.verticalScrollSync = new ScrollSync(ScrollType.vertical);
    this.horizontalScrollSync = new ScrollSync(ScrollType.horizontal);

    this.aceEditorLoaded = this.aceEditorLoaded.bind(this);
    this.windowDimensionsUpdated = this.windowDimensionsUpdated.bind(this);
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
        <div className="av-content">{content}</div>
      </div>
    );
  }

  protected renderSequenceLogo = (residueWidth: number) => {
    const { alignment, logoOptions, style } = this.props;
    const logoOpts = logoOptions ? logoOptions : defaultProps.logoOptions;

    return (
      <SequenceLogoComponent
        alignment={alignment}
        style={style}
        glyphWidth={residueWidth}
        logoType={logoOpts.logoType}
        tooltipPlacement={logoOpts.tooltipPlacement}
        height={logoOpts.height}
        scrollerLoaded={(scroller) => {
          this.horizontalScrollSync.registerElementScroller(scroller);
        }}
        scrollerUnloaded={(scroller) => {
          this.horizontalScrollSync.unRegisterElementScroller(scroller);
        }}
      />
    );
  };

  protected renderBarplot = (
    barplotProps: IBarplotExposedProps,
    residueWidth: number
  ) => {
    return (
      <SequenceBarplotComponent
        alignment={this.props.alignment}
        tooltipPlacement={barplotProps.tooltipPlacement}
        dataSeriesSet={barplotProps.dataSeriesSet}
        positionWidth={residueWidth}
        height={barplotProps.height}
        scrollerLoaded={(scroller) => {
          this.horizontalScrollSync.registerElementScroller(scroller);
        }}
        scrollerUnloaded={(scroller) => {
          this.horizontalScrollSync.unRegisterElementScroller(scroller);
        }}
      ></SequenceBarplotComponent>
    );
  };

  protected renderConsensusQueryBox = () => (
    <div className="consensusseq-box">
      <AceConsensusSequenceComponent
        alignment={this.props.alignment}
        fontSize={
          this.props.zoomLevel ? this.props.zoomLevel : defaultProps.zoomLevel
        }
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
      <AceQuerySequenceComponent
        alignment={this.props.alignment}
        fontSize={
          this.props.zoomLevel ? this.props.zoomLevel : defaultProps.zoomLevel
        }
        sortBy={this.props.sortBy ? this.props.sortBy : defaultProps.sortBy}
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
      ></AceQuerySequenceComponent>
    </div>
  );

  protected renderPositionBox = () => (
    <div className="position-box">
      {
        <AceTextualRulerComponent
          classNames="ace-positions"
          alignment={this.props.alignment}
          fontSize={
            this.props.zoomLevel ? this.props.zoomLevel : defaultProps.zoomLevel
          }
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
        fontSize={
          this.props.zoomLevel ? this.props.zoomLevel : defaultProps.zoomLevel
        }
        sortBy={this.props.sortBy ? this.props.sortBy : defaultProps.sortBy}
        classNames={[
          "ace-alignment",
          this.props.style.residueDetail.className,
          this.props.style.alignmentType.className,
          this.props.style.positionsToStyle.className,
          this.props.style.colorScheme.className,
        ].join(" ")}
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
          .getSequences(
            this.props.sortBy ? this.props.sortBy : defaultProps.sortBy
          )
          .map((x) => x.id)
          .join("\n")}
        fontSize={
          this.props.zoomLevel ? this.props.zoomLevel : defaultProps.zoomLevel
        }
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
    const { alignment, showMinimap, sortBy, style } = this.props;

    let mmOptions = this.props.minimapOptions
      ? this.props.minimapOptions
      : defaultProps.minimapOptions;
    //const mmClassName = showMinimap ? "minimap" : "minimap hidden";
    return (
      alignment &&
      style && (
        <div
          className="minimap"
          style={{ display: showMinimap ? "flex" : "none" }}
        >
          {
            <Provider store={store}>
              <MiniMap
                alignment={alignment}
                alignmentStyle={style}
                sortBy={sortBy ? sortBy : defaultProps.sortBy}
                //exposed by prop to instantiator
                alignHorizontal={mmOptions.alignHorizontal}
                resizable={mmOptions.resizable}
                startingWidth={mmOptions.startingWidth}
                verticalHeight={mmOptions.verticalHeight}
                onClick={this.props.minimapClicked}
                //sync
                syncWithAlignmentDetailsId="full-alignment-details"
              />
            </Provider>
          }
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
      showQuery,
      showRuler,
      zoomLevel,
    } = this.props;
    if (!alignment) {
      return null;
    }

    const classes = ["alignment-viewer"];
    if (!showAnnotations) {
      classes.push("annotation-closed");
    }

    const residueWidth = getAlignmentFontDetails(
      zoomLevel !== undefined ? zoomLevel : defaultProps.zoomLevel
    ).width;

    return (
      <div className={classes.join(" ")}>
        {this.renderMiniMap()}

        {/*<div id="column_mouseover"></div>*/}

        {!barplots || barplots.length < 1
          ? null
          : barplots.map((barplot, idx) =>
              this.renderWidget(
                "av-barplot-holder",
                barplot.dataSeriesSet.map((series) => series.name).join(" / "),
                this.renderBarplot(barplot, residueWidth),
                true,
                `${idx}-${barplot.dataSeriesSet
                  .map((dataseries) => dataseries.id)
                  .join("|")}`
              )
            )}

        {!this.props.showLogo || !this.props.logoOptions
          ? null
          : this.renderWidget(
              "av-sequence-logo-holder",
              "Logo:",
              this.renderSequenceLogo(residueWidth),
              true
            )}

        {!showConsensus
          ? null
          : this.renderWidget(
              "av-consensus-seq-holder",
              "Consensus:",
              this.renderConsensusQueryBox()
            )}

        {!showQuery
          ? null
          : this.renderWidget(
              "av-query-seq-holder",
              "Query:",
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
          "alignment-details-holder",
          "details:",
          <Provider store={store}>
            <AlignmentDetails
              id="full-alignment-details"
              alignment={this.props.alignment}
              alignmentStyle={this.props.style}
              fontSize={
                this.props.zoomLevel
                  ? this.props.zoomLevel
                  : defaultProps.zoomLevel
              }
              residueWidth={residueWidth}
              sortBy={
                this.props.sortBy ? this.props.sortBy : defaultProps.sortBy
              }
              scrollerLoaded={(scroller) => {
                this.horizontalScrollSync.registerElementScroller(scroller);
              }}
              scrollerUnloaded={(scroller) => {
                this.horizontalScrollSync.unRegisterElementScroller(scroller);
              }}
            />
          </Provider>,
          true
        )}
      </div>
    );
  }
}
