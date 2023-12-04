import "./AlignmentViewer.scss";
import React, { useCallback, useMemo, useRef, useState } from "react";
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
import { ScrollbarOptions } from "./virtualization/VirtualizedMatrixViewerHook";


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
      height: 100,
    },
  ] as IBarplotExposedProps[],
};

export type IAlignmentViewerProps = {
  alignment: Alignment;
  style: AminoAcidAlignmentStyle | NucleotideAlignmentStyle;
  positionsToStyle: PositionsToStyle;
  residueColoring: ResidueColoring;
} & Partial<Readonly<typeof defaultProps>>;

export type IBarplotExposedProps = Pick<
  IPositionalBarplotProps,
  "dataSeriesSet" | "tooltipPlacement" | "height"
>;


/**
 * 
 * @param props 
 * @returns 
 */
export function AlignmentViewer(props: IAlignmentViewerProps) {

  const {
    alignment,
    barplots,
    style,
    logoOptions,
    minimapOptions,
    positionsToStyle,
    residueColoring,
    showAnnotations,
    showConsensus,
    showLogo,
    showMinimap,
    showQuery,
    showRuler,
    sortBy,
    zoomLevel,
  } = {
    ...defaultProps,
    ...props
  };

  //TODO: this should probably be calculated right?
  const CHARACTER_HEIGHT_TO_WIDTH_RATIO = 36 / 16;
  const MIN_WIDTH = 200;
  const MAX_WIDTH = 500;

  const verticalPaddingAroundContent = 2; // in px
  const sharedHorizontalReduxId = 'x_scroller_'+alignment.getUUID();
  const sharedVerticalReduxId = 'y_scroller_'+alignment.getUUID();
  const fontSize = zoomLevel;
  const annotationFontSize = zoomLevel + 4;
  const residueWidth = getAlignmentFontDetails(fontSize).width;
  const residueHeight = Math.round(
    residueWidth * CHARACTER_HEIGHT_TO_WIDTH_RATIO
  );

  const classes = ["alignment-viewer"];
  if (!showAnnotations) {
    classes.push("annotation-closed");
  }

  //
  // state
  //
  const [mouseHoveringContent, setMouseHoveringContent] = useState<boolean>(false);
  const [annotationResizeDragging, setAnnotationResizeDragging] = useState<boolean>(false);
  //custom callback that enables us to call function (draggerMoved) only
  //after the state has been set.
  const mouseLastXPx = useRef<number|undefined>();
  const annotationWidth = useRef<number>(220);
  const oneDraggerRef = useRef<HTMLDivElement | null>(null);

  const getCorrectedAnnotationWidth = useCallback((proposedWith: number) => {
    return proposedWith < MIN_WIDTH 
      ? MIN_WIDTH 
      : proposedWith > MAX_WIDTH
        ? MAX_WIDTH
        : proposedWith;
  }, [MIN_WIDTH, MAX_WIDTH]);

  //
  // cache
  //
  const sequences = useMemo(()=>{
    return alignment.getSequences(
      sortBy ? sortBy : defaultProps.sortBy
    )
    .map((iseq) => iseq.sequence)
  }, [alignment, sortBy]);

  const singleQuerySequenceArray = useMemo(()=>{
    return [alignment.getQuerySequence().sequence]
  }, [alignment]);

  const singleConsensusSequenceArray = useMemo(()=>{
    return [alignment.getConsensus().sequence]
  }, [alignment]);

  const handleMouseHovering = useCallback(()=>{
    setMouseHoveringContent(true); 
  }, []);

  const handleMouseStoppedHovering = useCallback(()=>{
    setMouseHoveringContent(false); 
  }, []);

  //
  // resize dragging
  //
  const startAnnotationResizeDragging = useCallback((
    e: React.MouseEvent<HTMLDivElement, MouseEvent>
  )=>{
    e.stopPropagation();
    e.preventDefault();
    setAnnotationResizeDragging(true);
    mouseLastXPx.current=e.pageX;
  }, []);

  const endAnnotationResizeDragging = useCallback((
    e: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setAnnotationResizeDragging(false);
    mouseLastXPx.current=undefined;
  }, []);

  const annotationResizeDragged = useCallback((
    e: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (annotationResizeDragging && 
        mouseLastXPx.current !== undefined){
      const delta = e.pageX - mouseLastXPx.current;
      mouseLastXPx.current = e.pageX < MIN_WIDTH 
        ? MIN_WIDTH 
        : e.pageX > MAX_WIDTH
          ? MAX_WIDTH 
          : e.pageX;

      const proposedNewWidth = annotationWidth.current + delta;
      annotationWidth.current = getCorrectedAnnotationWidth(
        proposedNewWidth
      );

      //Directly mutate DOM. All other attempted methods - setting state variables, using 
      //useStateCallback - fail due to sync issues with state changes happening after the
      //mousevents fire too quickly.
      var annotationElements = document.querySelectorAll('.av2-title-or-annotation');
      for(let i = 0; i < annotationElements.length; i++) {
        (annotationElements[i] as HTMLElement).style['flexBasis'] = 
          getCorrectedAnnotationWidth(annotationWidth.current)+'px';
      }
    }
  }, [
    annotationResizeDragging,
    getCorrectedAnnotationWidth,
    MIN_WIDTH, MAX_WIDTH
  ]);

  //
  // render functions
  //

  /**
   * Render a single row in the alignment viewer. This consists
   * of a title or annotation and the content.
   */
  const renderWidget = useCallback((params: {
    className: string,
    titleOrAnnotation: string | JSX.Element,
    content: JSX.Element | null,
    contentHeightPx?: number, //height of the content
    key?: string
  })=>{
    const {
      className,
      titleOrAnnotation,
      content,
      contentHeightPx,
      key
    } = params;

    const holderHeight = contentHeightPx 
      ? contentHeightPx+(2*verticalPaddingAroundContent) 
      : undefined;

    return (
      <div className={`av2-widget ${className}`} key={key} style={{
        height: holderHeight
      }}>
        <div
          className="av2-title-or-annotation"
          style={{ 
            fontSize: annotationFontSize,
            flexBasis: getCorrectedAnnotationWidth(annotationWidth.current)+"px"
          }}
        >
          {titleOrAnnotation}
        </div>
       {<div 
          ref={oneDraggerRef}
          className="av2-title-resize-separator"
          onMouseDown={startAnnotationResizeDragging}
        />}
        <div 
          className="av2-content-holder" //a flex div, which doesn't deal well with padding/margin, 
          onMouseEnter={handleMouseHovering}
          onMouseLeave={handleMouseStoppedHovering}
        >
            <div className="av2-content" style={{
              //padding: `${verticalPaddingAroundContent}px 0`,
              //height: holderHeight
            }}>
              {content}
            </div>
          </div>
      </div>
    );
  }, [
    annotationFontSize, 
    getCorrectedAnnotationWidth,
    handleMouseHovering,
    handleMouseStoppedHovering,
    verticalPaddingAroundContent, 
    startAnnotationResizeDragging
  ]);

  const renderedSequenceLogo = useMemo(() => {
    return (
      <SequenceLogo
        alignment={alignment}
        style={style}
        glyphWidth={residueWidth}
        logoType={logoOptions.logoType}
        tooltipPlacement={logoOptions.tooltipPlacement}
        height={logoOptions.height}
        horizontalReduxId={sharedHorizontalReduxId}
      />
    );
  }, [
    alignment,
    logoOptions,
    residueWidth,
    sharedHorizontalReduxId,
    style
  ]);


  const renderedMinimap = useMemo(() => {
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
              sortBy={sortBy}
              //exposed by prop to instantiator
              alignHorizontal={minimapOptions.alignHorizontal}
              resizable={minimapOptions.resizable}
              startingWidth={minimapOptions.startingWidth}
              minWidth={minimapOptions.minWidth}
              verticalHeight={minimapOptions.verticalHeight}
              //sync
              verticalReduxId={sharedVerticalReduxId}
            />
          }
        </div>
      )
    );
  }, [
    alignment,
    minimapOptions, 
    positionsToStyle, 
    sharedVerticalReduxId,
    showMinimap, 
    sortBy,
    style
  ]);

  const renderBarplot = useCallback((
    barplotProps: IBarplotExposedProps
  ) => {
    return (
      <PositionalBarplot
        alignment={alignment}
        tooltipPlacement={barplotProps.tooltipPlacement}
        dataSeriesSet={barplotProps.dataSeriesSet}
        positionWidth={residueWidth}
        height={barplotProps.height}
        horizontalReduxId={sharedHorizontalReduxId}
      ></PositionalBarplot>
    );
  }, [
    alignment,
    residueWidth, 
    sharedHorizontalReduxId
  ]);

  //
  // final render
  //
  return (
    <div 
      className={classes.join(" ")} 
      key={alignment.getUUID()}
    > 
      <div 
        className="full-screen-annotation-resize-dragger"
        style={{
          display: !annotationResizeDragging ? "none" : "block"
        }}
        onMouseMove={annotationResizeDragged}
        onMouseUp={endAnnotationResizeDragging}
        onMouseOut={endAnnotationResizeDragging}
        onMouseLeave={endAnnotationResizeDragging}
      />
      <Provider store={store}>
          
        {renderedMinimap}

        {/*<div id="column_mouseover"></div>*/}

        {!barplots || barplots.length < 1 
          ? null
          : barplots.map((barplot, idx) =>
              renderWidget({
                className: "av2-barplot-render",
                titleOrAnnotation: barplot.dataSeriesSet.map(
                  (series) => series.name
                ).join(" / ") + ":",
                content: renderBarplot(barplot),
                contentHeightPx: barplot.height,
                key: `${idx}-${barplot.dataSeriesSet.map(
                    (dataseries) => dataseries.id
                  ).join("|")}`
              })
            )}

        {!showLogo || !logoOptions 
          ? null
          : renderWidget({
              className: "av2-sequence-logo-render",
              titleOrAnnotation: "Logo:",
              content: renderedSequenceLogo,
              contentHeightPx: logoOptions && logoOptions.height
                ? logoOptions.height
                : defaultProps.logoOptions.height,
            })}

        {!showConsensus
          ? null
          : renderWidget({
              className: "av2-consensus-seq-render",
              titleOrAnnotation: "Consensus:",
              content: 
                <AlignmentDetails
                  reduxHorizontalId={sharedHorizontalReduxId}
                  sequences={singleConsensusSequenceArray}
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
                  verticalScrollbar={ScrollbarOptions.NeverOn}
                  horizontalScrollbar={ScrollbarOptions.NeverOn}
                />,
              contentHeightPx: residueHeight,
            })}

        {!showQuery
          ? null
          : renderWidget({
              className: "av2-query-seq-render",
              titleOrAnnotation: "Query:",
              content: 
                <AlignmentDetails
                  reduxHorizontalId={sharedHorizontalReduxId}
                  sequences={singleQuerySequenceArray}
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
                  verticalScrollbar={ScrollbarOptions.NeverOn}
                  horizontalScrollbar={ScrollbarOptions.NeverOn}
                />,
              contentHeightPx: residueHeight,
            })}

        {!showRuler 
          ? null
          : renderWidget({
              className: "av2-position-indicator-render",
              titleOrAnnotation: "Position:",
              content: 
                <div className="position-box">
                  <PositionalAxis
                    horizontalReduxId={sharedHorizontalReduxId}
                    positions={[...Array(alignment.getSequenceLength()).keys()]}
                    fontSize={fontSize}
                    residueHeight={residueHeight}
                    residueWidth={residueWidth}
                  />
                </div>,
              contentHeightPx: residueHeight,
            })}

        {renderWidget({
          className: "av2-alignment-details-render",
          titleOrAnnotation: 
            <AlignmentTextualMetadata
              alignmentUUID={alignment.getUUID()}
              verticalReduxId={sharedVerticalReduxId}
              textForEachSeq={alignment
                .getSequences(
                  sortBy ? sortBy : defaultProps.sortBy
                )
                .map((iseq) => iseq.id)}
              fontSize={fontSize}
              tabFontSize={annotationFontSize}
              letterHeight={residueHeight}
              letterWidth={residueWidth}
            />,
          content:
            <AlignmentDetails
              reduxVerticalId={sharedVerticalReduxId}
              reduxHorizontalId={sharedHorizontalReduxId}
              sequences={sequences}
              consensusSequence={alignment.getConsensus().sequence}
              querySequence={alignment.getQuerySequence().sequence}
              alignmentStyle={style}
              positionsToStyle={positionsToStyle}
              residueColoring={residueColoring}
              fontSize={fontSize}
              residueHeight={residueHeight}
              residueWidth={residueWidth}
              verticalScrollbar={
                ScrollbarOptions.OnHoverWhenOverflowed
              }
              horizontalScrollbar={
                mouseHoveringContent
                  ? ScrollbarOptions.AlwaysOnWhenOverflowed
                  : ScrollbarOptions.OnHoverWhenOverflowed
              }
            ></AlignmentDetails>
        })}
      </Provider>
    </div>
  );
}
