import "./AlignmentViewer.scss";
import React from "react";
import { Provider } from "react-redux";
import { PositionalAxis } from "./PositionalAxisHook";
//import {
//  SequenceLogoComponent,
//  LOGO_TYPES,
//  ISequenceLogoProps,
//} from "./SequenceLogoComponent";
import {
  SequenceLogo,
  LOGO_TYPES,
  ISequenceLogoProps,
} from "./SequenceLogoHook";

import {
  SequenceBarplotComponent,
  ISequenceBarplotProps,
} from "./SequenceBarplotComponent";
import { MiniMap } from "./minimap/MiniMapHook";
import { IMiniMapProps } from "./minimap/MiniMapHook";
import { AlignmentDetails } from "./alignment-details/AlignmentDetailsHook";
import { AlignmentTextualMetadata } from "./alignment-metadata/AlignmentTextualMetadataHook";
import { Alignment } from "../common/Alignment";
import { SequenceSorter } from "../common/AlignmentSorter";
import { ScrollSync, ScrollType } from "../common/ScrollSync";
import { store } from "../common/ReduxStore";
import {
  AminoAcidAlignmentStyle,
  NucleotideAlignmentStyle,
} from "../common/MolecularStyles";
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
    height: 100,
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
    FULL_MSA_METADATA_IDS: "full-alignment-metadata-ids",
    SEQUENCE_LOGO: "sequence-logo",
  };

  public static HORIZONTAL_SCROLLER_ID = "alignment-positions";
  public static VERTICAL_SCROLLER_ID = "sequence-indicies";

  static defaultProps = defaultProps;

  constructor(props: IAlignmentViewerProps) {
    super(props);

    this.windowDimensionsUpdated = this.windowDimensionsUpdated.bind(this);
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
    console.log("renderSequenceLogo:" + residueWidth);
    return (
      <Provider store={store}>
        <SequenceLogo
          id={AlignmentViewer.SCROLLER_COMPONENT_IDS.SEQUENCE_LOGO}
          alignment={alignment}
          style={style}
          glyphWidth={residueWidth}
          logoType={logoOpts.logoType}
          tooltipPlacement={logoOpts.tooltipPlacement}
          height={logoOpts.height}
          refUpdated={(ref) => {
            console.log("LOGO REF UPDATED:", ref);
          }}
        />
      </Provider>
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
          //this.horizontalScrollSync.registerElementScroller(scroller);
        }}
        scrollerUnloaded={(scroller) => {
          //this.horizontalScrollSync.unRegisterElementScroller(scroller);
        }}
      ></SequenceBarplotComponent>
    );
  };

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
                syncWithAlignmentDetailsId={
                  AlignmentViewer.VERTICAL_SCROLLER_ID
                }
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
              this.renderSequenceLogo(residueWidth),
              {
                height:
                  this.props.logoOptions && this.props.logoOptions.height
                    ? this.props.logoOptions.height
                    : defaultProps.logoOptions.height,
              }
            )}

        {!showConsensus
          ? null
          : this.renderWidget(
              "consensus-seq-holder",
              "Consensus:",
              <Provider store={store}>
                <AlignmentDetails
                  reduxHorizontalId={AlignmentViewer.HORIZONTAL_SCROLLER_ID}
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
                  reduxHorizontalId={AlignmentViewer.HORIZONTAL_SCROLLER_ID}
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
                    horizontalReduxId={AlignmentViewer.HORIZONTAL_SCROLLER_ID}
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

          <Provider store={store}>
            <div className="alignment-metadata-box">
              <AlignmentTextualMetadata
                verticalReduxId={AlignmentViewer.VERTICAL_SCROLLER_ID}
                textForEachSeq={this.props.alignment
                  .getSequences(
                    this.props.sortBy ? this.props.sortBy : defaultProps.sortBy
                  )
                  .map((iseq) => iseq.id)}
                fontSize={fontSize}
                letterHeight={residueHeight}
                letterWidth={residueWidth}
              />
            </div>
          </Provider>,
          <Provider store={store}>
            <AlignmentDetails
              reduxVerticalId={AlignmentViewer.VERTICAL_SCROLLER_ID}
              reduxHorizontalId={AlignmentViewer.HORIZONTAL_SCROLLER_ID}
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
          {}
        )}
      </div>
    );
  }
}
