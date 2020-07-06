import "./AlignmentViewer.scss";
import React from "react";
import { Provider } from "react-redux";
import { PositionalAxis } from "./PositionalAxisHook";
import {
  SequenceLogoComponent,
  LOGO_TYPES,
  ISequenceLogoProps,
} from "./SequenceLogoComponent";
import {
  SequenceBarplotComponent,
  ISequenceBarplotProps,
} from "./SequenceBarplotComponent";
import { MiniMap } from "./minimap/MiniMapHook";
import { IMiniMapProps } from "./minimap/MiniMapHook";
import { AlignmentDetails } from "./alignment-details/AlignmentDetailsHook";
import { Alignment } from "../common/Alignment";
import { SequenceSorter } from "../common/AlignmentSorter";
import { ScrollSync, ScrollType } from "../common/ScrollSync";
import { store } from "../common/ReduxStore";
import {
  AminoAcidAlignmentStyle,
  NucleotideAlignmentStyle,
} from "../common/MolecularStyles";
import { getAlignmentFontDetails } from "../common/Utils";
import {
  VirtualizedScrollSync,
  VirtualizedScrollType,
} from "../components/virtualization/VirtualizedScrollSync";

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

interface IAlignmentViewerState {
  msaEditorVewport?: {
    numberVisibleRows: number;
    firstFullyVisibleRow: number;
    lastFullyVisibleRow: number;
  };

  //windowWidth: number;
}

const CHARACTER_HEIGHT_TO_WIDTH_RATIO = 36 / 16;

export class AlignmentViewer extends React.Component<
  IAlignmentViewerProps,
  IAlignmentViewerState
> {
  private static SCROLLER_COMPONENT_IDS = {
    FULL_MSA: "full-alignment-details",
    QUERY: "query-alignment-details",
    CONSENSUS: "consensus-alignment-details",
    POSITIONAL_AXIS: "positional-axis",
  };

  private verticalVirtualizedScrollSync: VirtualizedScrollSync;
  private horizontalVirtualizedScrollSync: VirtualizedScrollSync;

  private horizontalScrollSync: ScrollSync;

  static defaultProps = defaultProps;

  constructor(props: IAlignmentViewerProps) {
    super(props);

    this.state = {
      //windowWidth: window.innerWidth,
    };
    this.horizontalScrollSync = new ScrollSync(ScrollType.horizontal);

    this.windowDimensionsUpdated = this.windowDimensionsUpdated.bind(this);

    this.verticalVirtualizedScrollSync = new VirtualizedScrollSync(
      VirtualizedScrollType.vertical
    );
    this.horizontalVirtualizedScrollSync = new VirtualizedScrollSync(
      VirtualizedScrollType.horizontal
    );

    this.horizontalVirtualizedScrollSync.registerScrollers([
      AlignmentViewer.SCROLLER_COMPONENT_IDS.FULL_MSA,
      AlignmentViewer.SCROLLER_COMPONENT_IDS.QUERY,
      AlignmentViewer.SCROLLER_COMPONENT_IDS.CONSENSUS,
      AlignmentViewer.SCROLLER_COMPONENT_IDS.POSITIONAL_AXIS,
    ]);
  }

  /**
   * React to window dimension changes
   */
  protected windowDimensionsUpdated() {
    this.setState({
      //windowWidth: window.innerWidth,
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

  protected getFontSize(forAnnotation?: boolean) {
    const fontSize = this.props.zoomLevel
      ? this.props.zoomLevel
      : defaultProps.zoomLevel;

    return forAnnotation ? fontSize + 4 : fontSize;
  }

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
    style?: React.CSSProperties,
    key?: string
  ) {
    return (
      <div className={`av-widget ${className}`} key={key} style={style}>
        <div
          className="av-annotation"
          style={{ fontSize: this.getFontSize(true) }}
        >
          {annotation}
        </div>
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

  protected renderAlignmentAnnotationBox = () => (
    <div className="alignment-metadata-box"></div>
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
    //window.addEventListener("resize", this.windowDimensionsUpdated);
  }

  componentWillUnmount() {
    //window.removeEventListener("resize", this.windowDimensionsUpdated);
  }

  render() {
    const {
      alignment,
      barplots,
      showAnnotations,
      showConsensus,
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

    const fontSize = this.getFontSize();
    const residueWidth = getAlignmentFontDetails(fontSize).width;
    const residueHeight = Math.round(
      residueWidth * CHARACTER_HEIGHT_TO_WIDTH_RATIO
    );
    const singleSeqDivHeight = residueHeight;
    /*DEFAULT_SINGLE_SEQUENCE_HEIGHT < residueHeight
        ? residueHeight
        : DEFAULT_SINGLE_SEQUENCE_HEIGHT;*/

    return (
      <div className={classes.join(" ")}>
        {this.renderMiniMap()}

        {/*<div id="column_mouseover"></div>*/}

        {!barplots || barplots.length < 1
          ? null
          : barplots.map((barplot, idx) =>
              this.renderWidget(
                "av-barplot-holder",
                barplot.dataSeriesSet.map((series) => series.name).join(" / ") +
                  ":",
                this.renderBarplot(barplot, residueWidth),
                undefined,
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
              this.renderSequenceLogo(residueWidth)
            )}

        {!showConsensus
          ? null
          : this.renderWidget(
              "consensus-seq-holder",
              "Consensus:",
              <Provider store={store}>
                <AlignmentDetails
                  id={AlignmentViewer.SCROLLER_COMPONENT_IDS.CONSENSUS}
                  sequences={[this.props.alignment.getConsensus().sequence]}
                  consensusSequence={
                    this.props.alignment.getConsensus().sequence
                  }
                  querySequence={
                    this.props.alignment.getQuerySequence().sequence
                  }
                  alignmentStyle={this.props.style}
                  fontSize={fontSize}
                  residueHeight={residueHeight}
                  residueWidth={residueWidth}
                />
              </Provider>,
              { height: singleSeqDivHeight }
            )}

        {!showQuery
          ? null
          : this.renderWidget(
              "query-seq-holder",
              "Query:",
              <Provider store={store}>
                <AlignmentDetails
                  id={AlignmentViewer.SCROLLER_COMPONENT_IDS.QUERY}
                  sequences={[this.props.alignment.getQuerySequence().sequence]}
                  consensusSequence={
                    this.props.alignment.getConsensus().sequence
                  }
                  querySequence={
                    this.props.alignment.getQuerySequence().sequence
                  }
                  alignmentStyle={this.props.style}
                  fontSize={fontSize}
                  residueHeight={residueHeight}
                  residueWidth={residueWidth}
                />
              </Provider>,
              { height: singleSeqDivHeight }
            )}

        {!showRuler
          ? null
          : this.renderWidget(
              "position-indicator-holder",
              "Position:",
              <Provider store={store}>
                <div className="position-box">
                  <PositionalAxis
                    id={AlignmentViewer.SCROLLER_COMPONENT_IDS.POSITIONAL_AXIS}
                    positions={[...Array(alignment.getSequenceLength()).keys()]}
                    fontSize={fontSize}
                    residueHeight={residueHeight}
                    residueWidth={residueWidth}
                  />
                </div>
              </Provider>,
              { height: singleSeqDivHeight }
            )}

        {this.renderWidget(
          "alignment-details-holder",
          "details:",
          <Provider store={store}>
            <AlignmentDetails
              id={AlignmentViewer.SCROLLER_COMPONENT_IDS.FULL_MSA}
              sequences={this.props.alignment
                .getSequences(
                  this.props.sortBy ? this.props.sortBy : defaultProps.sortBy
                )
                .map((iseq) => iseq.sequence)}
              consensusSequence={this.props.alignment.getConsensus().sequence}
              querySequence={this.props.alignment.getQuerySequence().sequence}
              alignmentStyle={this.props.style}
              fontSize={fontSize}
              residueHeight={residueHeight}
              residueWidth={residueWidth}
            ></AlignmentDetails>
          </Provider>,
          { height: singleSeqDivHeight }
        )}
      </div>
    );
  }
}
