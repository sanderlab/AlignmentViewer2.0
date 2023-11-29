import "./AlignmentViewer.scss";
import React from "react";
import { Provider } from "react-redux";
import { PositionalAxis } from "./PositionalAxisHook";
import {
  SequenceLogo,
  LOGO_TYPES,
  ISequenceLogoProps,
} from "./SequenceLogoHook";

import { IMiniMapProps, MiniMap } from "./minimap/MiniMapHook";
import { AlignmentDetails } from "./alignment-details/AlignmentDetailsHook";
import { AlignmentTextualMetadata } from "./alignment-metadata/AlignmentTextualMetadataHook";
import { Alignment } from "../common/Alignment";
import { SequenceSorter } from "../common/AlignmentSorter";
import { store } from "../common/ReduxStore";
import {
  AminoAcidAlignmentStyle,
  NucleotideAlignmentStyle,
  PositionsToStyle,
  ResidueColoring
} from "../common/MolecularStyles";
import { getAlignmentFontDetails } from "../common/Utils";
import { 
  IPositionalBarplotProps,
  PositionalBarplot, 
  PreconfiguredPositionalBarplots 
} from "./PositionalBarplotHook";

export type IAlignmentViewerProps = {
  alignment: Alignment;
  style: AminoAcidAlignmentStyle | NucleotideAlignmentStyle;
  positionsToStyle: PositionsToStyle;
  residueColoring: ResidueColoring;

  //event reporting
  //minimapClicked?(mousePosition: IPosition): void;
} & Partial<DefaultPropsTypes>;

type DefaultPropsTypes = Readonly<typeof defaultProps>;
export type IBarplotExposedProps = Pick<
  IPositionalBarplotProps,
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
    minWidth: 100,
    resizable: "horizontal",
    verticalHeight: "div",
  } as Partial<
    Pick<
      IMiniMapProps,
      "alignHorizontal" | "startingWidth" | "minWidth" | "resizable" | "verticalHeight"
    >
  >,

  //array of individual barplots. Each barplot can contain multiple
  //dataseries. Note that more than 2 dataseries in a single plot
  //is difficult to understand and more than 3 is pretty much impossible
  barplots: [
    {
      dataSeriesSet: [
        PreconfiguredPositionalBarplots.ShannonEntropy,
        PreconfiguredPositionalBarplots.Gaps,
      ],
      tooltipPlacement: undefined,
      height: "100px",
    },
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
  public static getScrollerReduxId(alignmentUUID: string, direction: 'x' | 'y'){
    return direction+'_scroller_'+alignmentUUID;
  }
  
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
   * Generate a single widget (logo, barplot, alignment details, positional axis,
   * metadat) that contains an annotation and content
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

  protected renderSequenceLogo = (
    residueWidth: number, sharedHorizontalReduxId: string
  ) => {
    const { alignment, logoOptions, style } = this.props;
    const logoOpts = logoOptions ? logoOptions : defaultProps.logoOptions;
    return (
      <SequenceLogo
        alignment={alignment}
        style={style}
        glyphWidth={residueWidth}
        logoType={logoOpts.logoType}
        tooltipPlacement={logoOpts.tooltipPlacement}
        height={logoOpts.height}
        horizontalReduxId={sharedHorizontalReduxId}
        //refUpdated={(ref) => {
          //console.log("LOGO REF UPDATED:", ref);
        //}}
      />
    );
  };

  protected renderBarplot = (
    barplotProps: IBarplotExposedProps,
    residueWidth: number,
    sharedHorizontalReduxId: string
  ) => {
    return (
      <PositionalBarplot
        alignment={this.props.alignment}
        tooltipPlacement={barplotProps.tooltipPlacement}
        dataSeriesSet={barplotProps.dataSeriesSet}
        positionWidth={residueWidth}
        height={barplotProps.height}
        horizontalReduxId={sharedHorizontalReduxId}
      ></PositionalBarplot>
    );
  };

  /*componentDidUpdate(prevProps: IAlignmentViewerProps) {
    if (prevProps.alignment !== this.props.alignment ||
        prevProps.alignment.getSequenceLength() !== this.props.alignment.getSequenceLength() ||
        prevProps.alignment.getSequences().length !== this.props.alignment.getSequences().length) {
      console.log('alignment changed:', prevProps.alignment); 
    }
  }*/

  protected renderMiniMap(alignmentDetailsReduxId: string) {
    const { alignment, positionsToStyle, showMinimap, sortBy, style, minimapOptions } = this.props;
    let mmOptions = minimapOptions ? minimapOptions : defaultProps.minimapOptions;
    //const mmClassName = showMinimap ? "minimap" : "minimap hidden";
    return (
      alignment &&
      style && (
        <div
          className="minimap"
          style={{ display: showMinimap ? "flex" : "none" }}
        >
          {
            <MiniMap
              alignment={alignment}
              alignmentStyle={style}
              positionsToStyle={positionsToStyle}
              sortBy={sortBy ? sortBy : defaultProps.sortBy}
              //exposed by prop to instantiator
              alignHorizontal={mmOptions.alignHorizontal}
              resizable={mmOptions.resizable}
              startingWidth={mmOptions.startingWidth}
              minWidth={mmOptions.minWidth}
              verticalHeight={mmOptions.verticalHeight}
              //sync
              verticalReduxId={alignmentDetailsReduxId}
            />
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
      logoOptions,
      showAnnotations,
      showConsensus,
      showLogo,
      showQuery,
      showRuler,
      sortBy,
      style,
      positionsToStyle,
      residueColoring
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

    const sharedHorizontalReduxId = AlignmentViewer.getScrollerReduxId(
      alignment.getUUID(), 'x'
    );
    const sharedVerticalReduxId = AlignmentViewer.getScrollerReduxId(
      alignment.getUUID(), 'y'
    );
    const metadataReduxId = 'metadata_scroller_x'+alignment.getUUID();

    return (
      <div className={classes.join(" ")} key={alignment.getUUID()}>
        <Provider store={store}>
           
          {this.renderMiniMap(sharedVerticalReduxId)}

          {/*<div id="column_mouseover"></div>*/}

          {!barplots || barplots.length < 1 
            ? null
            : barplots.map((barplot, idx) =>
                this.renderWidget(
                  "av2-barplot-render",
                  barplot.dataSeriesSet.map((series) => series.name).join(" / ") +
                    ":",
                  this.renderBarplot(barplot, residueWidth, sharedHorizontalReduxId),
                  undefined,
                  `${idx}-${barplot.dataSeriesSet
                    .map((dataseries) => dataseries.id)
                    .join("|")}`
                )
              )}

          {!showLogo || !logoOptions 
            ? null
            : this.renderWidget(
                "av2-sequence-logo-render",
                "Logo:",
                this.renderSequenceLogo(residueWidth, sharedHorizontalReduxId),
                {
                  height:
                    logoOptions && logoOptions.height
                      ? logoOptions.height
                      : defaultProps.logoOptions.height,
                }
              )}

          {!showConsensus
            ? null
            : this.renderWidget(
                "av2-consensus-seq-render",
                "Consensus:",
                <AlignmentDetails
                  reduxHorizontalId={sharedHorizontalReduxId}
                  sequences={[alignment.getConsensus().sequence]}
                  consensusSequence={
                    alignment.getConsensus().sequence
                  }
                  querySequence={
                    alignment.getQuerySequence().sequence
                  }
                  alignmentStyle={style}
                  positionsToStyle={positionsToStyle}
                  residueColoring={residueColoring}
                  fontSize={fontSize}
                  residueHeight={residueHeight}
                  residueWidth={residueWidth}
                  suppressVerticalScrollbar={true}
                  suppressHorizontalScrollbar={true}
                />,
                { height: singleSeqDivHeight }
              )}

          {!showQuery
            ? null
            : this.renderWidget(
                "av2-query-seq-render",
                "Query:",
                <AlignmentDetails
                  reduxHorizontalId={sharedHorizontalReduxId}
                  sequences={[alignment.getQuerySequence().sequence]}
                  consensusSequence={
                    alignment.getConsensus().sequence
                  }
                  querySequence={
                    alignment.getQuerySequence().sequence
                  }
                  alignmentStyle={style}
                  positionsToStyle={positionsToStyle}
                  residueColoring={residueColoring}
                  fontSize={fontSize}
                  residueHeight={residueHeight}
                  residueWidth={residueWidth}
                  suppressVerticalScrollbar={true}
                  suppressHorizontalScrollbar={true}
                />,
                { height: singleSeqDivHeight }
              )}

          {!showRuler 
            ? null
            : this.renderWidget(
                "av2-position-indicator-render",
                "Position:",
                <div className="position-box">
                  <PositionalAxis
                    horizontalReduxId={sharedHorizontalReduxId}
                    positions={[...Array(alignment.getSequenceLength()).keys()]}
                    fontSize={fontSize}
                    residueHeight={residueHeight}
                    residueWidth={residueWidth}
                  />
                </div>,
                { height: singleSeqDivHeight }
              )}

          {this.renderWidget(
            "av2-alignment-details-render",
            <div className="alignment-metadata-box">
              { <AlignmentTextualMetadata
                horizontalReduxId={metadataReduxId}
                verticalReduxId={sharedVerticalReduxId}
                textForEachSeq={alignment
                  .getSequences(
                    sortBy ? sortBy : defaultProps.sortBy
                  )
                  .map((iseq) => iseq.id)}
                fontSize={fontSize}
                letterHeight={residueHeight}
                letterWidth={residueWidth}
              /> }
            </div>,
            <AlignmentDetails
              reduxVerticalId={sharedVerticalReduxId}
              reduxHorizontalId={sharedHorizontalReduxId}
              sequences={alignment
                .getSequences(
                  sortBy ? sortBy : defaultProps.sortBy
                )
                .map((iseq) => iseq.sequence)}
              consensusSequence={alignment.getConsensus().sequence}
              querySequence={alignment.getQuerySequence().sequence}
              alignmentStyle={style}
              positionsToStyle={positionsToStyle}
              residueColoring={residueColoring}
              fontSize={fontSize}
              residueHeight={residueHeight}
              residueWidth={residueWidth}
            ></AlignmentDetails>,
            {}
          )}
        </Provider>
      </div>
    );
  }
}
