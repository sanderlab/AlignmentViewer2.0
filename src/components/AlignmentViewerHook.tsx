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
import { reduxStore } from "../redux/ReduxStore";
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
import { ScrollbarOptions } from "./virtualization/VirtualizationTypes";
import { 
  IControllerRole, 
  IResponderRole, 
  VirtualizationRole
} from "./virtualization/VirtualizationTypes";


//
// TYPES / INTERFACES
//
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

//
// DEFAULT PROPS
//
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



/**
 * Main react hook for generating the entire alignment viewer visualization.
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

  const MIN_WIDTH = 150;
  const MAX_WIDTH = 500;

  const verticalPaddingAroundContent = 2; // in px

  const fontSize = zoomLevel;
  const annotationFontSize = zoomLevel + 4;
  const residueWidth = getAlignmentFontDetails(fontSize).width;
  const residueHeight = getAlignmentFontDetails(fontSize).height;
  
  //
  //virtualization 
  //

  //load virtualization states from redux - there are 4 virtualizations
  const alignmentUUID = alignment.getUUID();

  //primary x-axis virtualization - main viewport, logo, positional axis, logo, barplots
  const [
    xViewportResponderVirtualization,
    xViewportControllerVirtualization,
  ]: [IResponderRole, IControllerRole] = useMemo(()=>{
    const responder = {
      virtualizationId: `x_viewport_virtualization_${alignmentUUID}`,
      role: VirtualizationRole.Responder
    } as IResponderRole;

    return [responder, {
      ...responder,
      role: VirtualizationRole.Controller,
      cellCount: alignment.getSequenceLength(),
      cellSizePx: residueWidth
    } as IControllerRole]
  }, [alignment, alignmentUUID, residueWidth]);

  //primary y-axis virtualization - main viewport, logo, positional axis, logo, barplots
  const [
    yViewportResponderVirtualization,
    yViewportControllerVirtualization,
  ]: [IResponderRole, IControllerRole] = useMemo(()=>{
    const responder = {
      virtualizationId: `y_viewport_virtualization_${alignmentUUID}`,
      role: VirtualizationRole.Responder
    } as IResponderRole;

    return [responder, {
      ...responder,
      role: VirtualizationRole.Controller,
      cellCount: alignment.getSequenceCount(),
      cellSizePx: residueHeight
    } as IControllerRole]
  }, [alignment, alignmentUUID, residueHeight]);

  //
  // state
  //
  const [mouseHoveringContent, setMouseHoveringContent] = useState<boolean>(false);
  const [annotationResizeBarHovered, setAnnotationResizeBarHovered] = useState<boolean>(false);
  const [annotationResizeDragging, setAnnotationResizeDragging] = useState<boolean>(false);

  //
  // state
  //
  const classes = ["alignment-viewer"];
  if (!showAnnotations) classes.push("annotation-closed");
  if (annotationResizeDragging) classes.push("annotations-being-resized");
  if (annotationResizeBarHovered) classes.push("annotation-resize-hovered");
  
  //custom callback that enables us to call function (draggerMoved) only
  //after the state has been set.
  const mouseLastXPx = useRef<number|undefined>();
  const annotationWidth = useRef<number>(220);
  const oneDraggerRef = useRef<HTMLDivElement | null>(null);

  const getCorrectedAnnotationWidth = useCallback((
    proposedWith: number
  ) => {
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

  const sequenceIds = useMemo(()=>{
    return alignment.getSequences(
      sortBy ? sortBy : defaultProps.sortBy
    )
    .map((iseq) => iseq.id)
  }, [alignment, sortBy]);

  const singleQuerySequenceArray = useMemo(()=>{
    return [alignment.getQuery().sequence]
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
  // resize dragging - TODO: need to move this into its own component
  //
  const handleAnnotationResizeBarMouseenter = useCallback(()=>{
    setAnnotationResizeBarHovered(true);
  }, []);
  const handleAnnotationResizeBarMouseleave = useCallback(()=>{
    setAnnotationResizeBarHovered(false);
  }, []);

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

  //Render a single row in the alignment viewer. This consists
  //of a title or annotation and the content.
  const renderWidget = useCallback((params: {
    className: string,
    titleOrAnnotation: string | JSX.Element,
    content: JSX.Element | null,
    contentHeightPx?: number, //height of the content
    noBottomMarginOnTitle?: boolean, 
    key?: string,
  })=>{
    const {
      className,
      titleOrAnnotation,
      content,
      contentHeightPx,
      key,
      noBottomMarginOnTitle
    } = params;

    const holderHeight = contentHeightPx 
      ? contentHeightPx+(2*verticalPaddingAroundContent) 
      : undefined;

    //kind of a hack, but content doesn't center well so we add padding to the title 
    //to keep the title centered with the conten. However, this doesn't work for the 
    //metadata/annotation block, hence a "noBottomMarginOnTitle" flag.
    const marginBottom = noBottomMarginOnTitle ? 0 : verticalPaddingAroundContent*2;

    return (
      <div className={`av2-widget ${className}`} key={key} style={{
        height: holderHeight
      }}>
        <div
          className="av2-title-or-annotation"
          style={{ 
            fontSize: annotationFontSize,
            flexBasis: `${getCorrectedAnnotationWidth(annotationWidth.current)}px`,
            marginBottom: `${marginBottom}px`
          }}
        >
          {titleOrAnnotation}
        </div>
        <div 
          style={{
            display: showAnnotations ? "block" : "none"
          }}
          ref={oneDraggerRef}
          className="av2-metadata-resize-separator"
          onMouseDown={startAnnotationResizeDragging}
          onMouseEnter={handleAnnotationResizeBarMouseenter}
          onMouseLeave={handleAnnotationResizeBarMouseleave}/>
        <div 
          className="av2-content-holder" //a flex div, which doesn't deal well with padding/margin, 
          onMouseEnter={handleMouseHovering}
          onMouseLeave={handleMouseStoppedHovering}>
          <div className="av2-content">
            {content}
          </div>
        </div>
        <div className="av2-close-metadata-option" onMouseEnter={()=>{console.log('MOUSE ENTER');}}></div>
      </div>
    );
  }, [
    annotationFontSize, 
    getCorrectedAnnotationWidth,
    handleAnnotationResizeBarMouseenter,
    handleAnnotationResizeBarMouseleave,
    handleMouseHovering,
    handleMouseStoppedHovering,
    verticalPaddingAroundContent, 
    showAnnotations,
    startAnnotationResizeDragging
  ]);

  const renderedSequenceLogo = useMemo(() => {
    return (
      <SequenceLogo
        alignment={alignment}
        style={style}
        positionsToStyle={positionsToStyle}
        glyphWidth={residueWidth}
        logoType={logoOptions.logoType}
        tooltipPlacement={logoOptions.tooltipPlacement}
        height={logoOptions.height}
        horizontalVirtualization={xViewportResponderVirtualization}
      />
    );
  }, [
    alignment,
    logoOptions,
    positionsToStyle,
    residueWidth,
    xViewportResponderVirtualization,
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
              syncWithVerticalVirtualization={
                yViewportResponderVirtualization
              }
            />
          }
        </div>
      )
    );
  }, [
    alignment,
    minimapOptions, 
    positionsToStyle, 
    showMinimap, 
    sortBy,
    style,
    yViewportResponderVirtualization
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
        horizontalVirtualization={xViewportResponderVirtualization}
      ></PositionalBarplot>
    );
  }, [
    alignment,
    residueWidth, 
    xViewportResponderVirtualization
  ]);

  //
  // final render
  //
  return (
    <div 
      className={classes.join(" ")} 
      key={alignmentUUID}
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
      <Provider store={reduxStore}>
          
        { renderedMinimap }

        {
          //<div id="column_mouseover"></div>
        }

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
                  alignmentUUID={alignmentUUID}
                  horizVirtualization={xViewportResponderVirtualization}
                  vertVirtualization={"None"}
                  sequences={singleConsensusSequenceArray}
                  consensusSequence={
                    alignment.getConsensus().sequence
                  }
                  querySequence={
                    alignment.getQuery().sequence
                  }
                  alignmentStyle={style}
                  positionsToStyle={positionsToStyle}
                  residueColoring={residueColoring}
                  fontSize={fontSize}
                  residueHeight={residueHeight}
                  residueWidth={residueWidth}
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
                  alignmentUUID={alignmentUUID}
                  //horizVirtualization={xViewportControllerVirtualization}
                  horizVirtualization={xViewportResponderVirtualization}
                  vertVirtualization={"None"}
                  sequences={singleQuerySequenceArray}
                  consensusSequence={
                    alignment.getConsensus().sequence
                  }
                  querySequence={
                    alignment.getQuery().sequence
                  }
                  alignmentStyle={style}
                  positionsToStyle={positionsToStyle}
                  residueColoring={residueColoring}
                  fontSize={fontSize}
                  residueHeight={residueHeight}
                  residueWidth={residueWidth}
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
                    alignmentUUID={alignmentUUID}
                    horizVirtualization={xViewportResponderVirtualization}
                    positions={[...Array(alignment.getSequenceLength()).keys()]}
                    fontSize={fontSize}
                    residueWidth={residueWidth}
                  />
                </div>,
              contentHeightPx: residueHeight,
            })}

        {renderWidget({
          className: "av2-alignment-details-render",
          noBottomMarginOnTitle:true,
          titleOrAnnotation: 
            <AlignmentTextualMetadata
              alignmentUUID={alignmentUUID}
              vertVirtualization={yViewportResponderVirtualization}
              genenameHorizVirtualization={"Automatic"} 
              annotationHorizVirtualization={"Automatic"}
              textForEachSeq={sequenceIds}
              fontSize={fontSize}
              tabFontSize={annotationFontSize}
              letterHeight={residueHeight}
              letterWidth={residueWidth}
            />,
          content:
            <AlignmentDetails
              alignmentUUID={alignmentUUID}
              vertVirtualization={yViewportControllerVirtualization}
              horizVirtualization={xViewportControllerVirtualization}
              sequences={sequences}
              consensusSequence={alignment.getConsensus().sequence}
              querySequence={alignment.getQuery().sequence}
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
