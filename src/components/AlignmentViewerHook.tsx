import "./AlignmentViewer.scss";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Provider } from "react-redux";
import { PositionalAxis } from "./PositionalAxisHook";
import {
  SequenceLogo,
  LOGO_TYPES,
  ISequenceLogoProps,
} from "./SequenceLogoHook";

import { MiniMap } from "./minimap/MiniMapHook";
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
import { generateUUIDv4, getAlignmentFontDetails } from "../common/Utils";
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
import { AlignmentViewerLayout, IAdjustableWidth, IFixedWidth, IMetadataAndContent } from "./layout/AlignmentViewerLayoutHook";
import { SequenceSearch } from "./search/SequenceSearchHook";
import { WebGlContexts, getWebGlContext } from "../common/WebGlContextFactory";

export enum AlignmentViewerType {
  PrimaryViewer = "PrimaryViewer",
  SearchViewer = "SearchViewer"
}

//
// TYPES / INTERFACES
//
export type IAlignmentViewerProps = {
  alignment: Alignment;
  style: AminoAcidAlignmentStyle | NucleotideAlignmentStyle;
  positionsToStyle: PositionsToStyle;
  residueColoring: ResidueColoring;
  whichViewer: AlignmentViewerType;
  triggerShowSearch?: React.MutableRefObject<(() => void) | undefined>;
  mainViewportVisibleChanged?: (props: {
    seqIdxStart: number,
    seqIdxEnd: number,
    posIdxStart: number,
    posIdxEnd: number
  }) => void;

} & Partial<Readonly<typeof defaultProps>>;

export type IBarplotExposedProps = Pick<
  IPositionalBarplotProps,
  "svgId" | "dataSeriesSet" | "tooltipPlacement"
>;

//
// DEFAULT PROPS
//
const defaultProps = {
  disableSearch: false,

  zoomLevel: 13 as number,
  sortBy: SequenceSorter.INPUT as SequenceSorter,

  showAnnotations: true as boolean,
  showConsensus: true as boolean,
  showLogo: true as boolean,
  showMinimap: false as boolean,
  showQuery: true as boolean,
  showRuler: true as boolean,

  barplotsHeightPx: 75,
  logoHeightPx: 100,

  metadataSizing: {
    type: "adjustable-width",
    startingWidth: 150,
    minWidth: 100,
    maxWidth: 400
  } as IAdjustableWidth | IFixedWidth,

  minimapSizing: {
    type: "adjustable-width",
    startingWidth: 100,
    minWidth: 75,
    maxWidth: 300
  } as IAdjustableWidth | IFixedWidth,

  logoOptions: {
    logoType: LOGO_TYPES.LETTERS
  } as Pick<
    ISequenceLogoProps, 
    "svgId" | "tooltipPlacement" | "logoType"
  >,

  //array of individual barplots. Each barplot can contain multiple
  //dataseries. Note that more than 2 dataseries in a single plot
  //is difficult to understand and more than 3 is pretty much impossible
  barplots: [
    {
      svgId: `shannon-entropy-plus-gaps-${generateUUIDv4()}`,
      dataSeriesSet: [
        PreconfiguredPositionalBarplots.ShannonEntropy,
        PreconfiguredPositionalBarplots.Gaps,
      ],
      tooltipPlacement: undefined
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
    whichViewer,

    alignment,
    barplots,
    style,
    logoOptions,

    disableSearch,
    triggerShowSearch,

    mainViewportVisibleChanged,
    metadataSizing,
    minimapSizing,
    barplotsHeightPx,
    logoHeightPx,
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

  const fontSize = zoomLevel;
  const annotationFontSize = zoomLevel + 3;
  const residueWidth = getAlignmentFontDetails(fontSize).width;
  const residueHeight = getAlignmentFontDetails(fontSize).height;
  
  
  //
  // search - listen for key events
  //
  const [cmdPressed, setCmdPressed] = useState<boolean>(false);
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const showSearchFn = useCallback(()=>{
    setShowSearch(true);
  }, [])
  React.useEffect(() => {
    if(triggerShowSearch){
      triggerShowSearch.current = showSearchFn;
    }
  }, [showSearchFn, triggerShowSearch]);

  const keyDownFn = useCallback((e: KeyboardEvent)=>{
    if(e){
      if ((e.ctrlKey || cmdPressed) && e.key === "f") {
        e.preventDefault();
        setShowSearch(true);
        setCmdPressed(false);
      }
      if(e.key === "Meta"){
        e.preventDefault();
        setCmdPressed(true);
      }
    }
  }, [cmdPressed]);

  const keyUpFn = useCallback((e: KeyboardEvent)=>{
    if (e && (e.key === "Meta")) {
      e.preventDefault();
      setCmdPressed(false);
    }
  }, []);

  useEffect(()=>{
    window.removeEventListener("keydown", keyDownFn);
    window.removeEventListener("keyup", keyUpFn);

    if(!disableSearch){
      window.addEventListener("keydown", keyDownFn);
      window.addEventListener("keyup", keyUpFn);
    }

    return () => {
      window.removeEventListener("keydown", keyDownFn);
      window.removeEventListener("keyup", keyUpFn);
    }
  }, [
    disableSearch, 
    keyDownFn,
    keyUpFn
  ]);


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
  const [
    mouseHoveringContent, 
    setMouseHoveringContent
  ] = useState<boolean>(false);


  //events
  const handleMouseHovering = useCallback(()=>{
    setMouseHoveringContent(true); 
  }, []);

  const handleMouseStoppedHovering = useCallback(()=>{
    setMouseHoveringContent(false); 
  }, []);

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
  

  //
  // renders
  //

  //general event listeners
  const attachEventListeners = useCallback((
    content: React.JSX.Element, className?: string
  )=>{
    return (
      <div className={className}
        onMouseEnter={handleMouseHovering}
        onMouseLeave={handleMouseStoppedHovering}>
        {content}
      </div>
    );
  }, [
    handleMouseHovering,
    handleMouseStoppedHovering
  ]);

  //logos
  const renderedSequenceLogo = useMemo(() => {
    return attachEventListeners(
      <SequenceLogo
        svgId={logoOptions.svgId}
        alignment={alignment}
        style={style}
        positionsToStyle={positionsToStyle}
        glyphWidth={residueWidth}
        logoType={logoOptions.logoType}
        tooltipPlacement={logoOptions.tooltipPlacement}
        horizontalVirtualization={xViewportResponderVirtualization}
      />
    );
  }, [
    alignment,
    logoOptions,
    positionsToStyle,
    residueWidth,
    xViewportResponderVirtualization,
    style,
    attachEventListeners
  ]);

  //barplots
  const renderBarplot = useCallback((
    barplotProps: IBarplotExposedProps
  ) => {
    return attachEventListeners(
      <PositionalBarplot
        svgId={barplotProps.svgId}
        alignment={alignment}
        tooltipPlacement={barplotProps.tooltipPlacement}
        dataSeriesSet={barplotProps.dataSeriesSet}
        positionWidth={residueWidth}
        horizontalVirtualization={xViewportResponderVirtualization}
      ></PositionalBarplot>
    );
  }, [
    alignment,
    residueWidth, 
    xViewportResponderVirtualization,
    attachEventListeners
  ]);

  //positionaxis
  const renderedPositionAxis = useMemo(()=>{
    return attachEventListeners(
      <PositionalAxis
        alignmentUUID={alignment.getUUID()}
        horizVirtualization={xViewportResponderVirtualization}
        positions={[...Array(alignment.getSequenceLength()).keys()]}
        fontSize={fontSize}
        residueWidth={residueWidth}
      />,
      "position-box"
    )
  }, [
    attachEventListeners, 
    alignment,
    fontSize, 
    residueWidth,
    xViewportResponderVirtualization
  ]);

  //helper as we use this for both query and consensus
  const renderSingleSequence = useCallback((
    sequence: string,
    sequenceType: "consensus" | "query"
  )=>{
    return attachEventListeners(
      <AlignmentDetails
        webGlApp={
          whichViewer === AlignmentViewerType.PrimaryViewer 
            ? sequenceType === 'query'
              ? getWebGlContext(WebGlContexts.PrimaryQuerySeq)
              : getWebGlContext(WebGlContexts.PrimaryConsensusSeq)
            : sequenceType === 'query'
              ? getWebGlContext(WebGlContexts.SearchQuerySeq)
              : getWebGlContext(WebGlContexts.SearchConsensusSeq)
        }

        alignmentUUID={alignment.getUUID()}
        horizVirtualization={xViewportResponderVirtualization}
        vertVirtualization={"None"}
        sequences={[sequence]}
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
      />
    );
  }, [
    alignment,
    attachEventListeners,
    fontSize, 
    positionsToStyle,
    residueColoring,
    residueHeight,
    residueWidth,
    style,
    whichViewer,
    xViewportResponderVirtualization
  ]);

  //consensus
  const renderedConsensusSeq: IMetadataAndContent | undefined = useMemo(()=>{
    return !showConsensus ? undefined : {
      metadata: "Consensus",
      content: renderSingleSequence(
        alignment.getConsensus().sequence, "consensus"
      )
    };
  }, [
    alignment,
    renderSingleSequence,
    showConsensus
  ]);

  //query
  const renderedQuerySeq: IMetadataAndContent | undefined = useMemo(()=>{
    return !showQuery ? undefined : {
      metadata: "Query",
      content: renderSingleSequence(
        alignment.getQuery().sequence, "query"
      )
    }
  }, [
    alignment,
    renderSingleSequence,
    showQuery
  ]);

  //minimap
  const renderedMinimap = useMemo(()=>{
    return ( !showMinimap ? undefined :
      <MiniMap
        alignment={alignment}
        alignmentStyle={style}
        positionsToStyle={positionsToStyle}
        sortBy={sortBy}
        syncWithVerticalVirtualization={
          yViewportResponderVirtualization
        }
        webGlApp={
          whichViewer === AlignmentViewerType.PrimaryViewer
            ? getWebGlContext(WebGlContexts.PrimaryMinimap)
            : getWebGlContext(WebGlContexts.SearchMinimap)
        }
      />
    );
  }, [
    alignment, 
    style,
    positionsToStyle,
    showMinimap,
    sortBy,
    whichViewer,
    yViewportResponderVirtualization
  ]);

  //
  // final render
  //
  return (
    <Provider store={reduxStore}>
      {!alignment || disableSearch ? undefined : 
        <div style={{display: !showSearch ? "none" : undefined}}>
          <SequenceSearch
            closePressed={()=>{setShowSearch(false);}}
            sortedSequences={sequences}
            sortedSequenceIds={sequenceIds}
            style={style}
            residueColoring={residueColoring}
            positionsToStyle={positionsToStyle}
          />
        </div>
      }
      <AlignmentViewerLayout
        showMetadata={showAnnotations}
        showPositionalAxis={showRuler}
        showLogoPlot={showLogo}
        showQuery={showQuery}
        showConsensus={showConsensus}
        showMinimap={showMinimap}

        rulerConsensusQueryHeightPx={residueHeight}

        metadataSizing={metadataSizing}
        minimapSizing={minimapSizing}

        barplotsHeightPx={barplotsHeightPx}
        logoHeightPx={logoHeightPx}

        alignmentDetails={{
          metadata: (
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
            />
          ),
          content: attachEventListeners(
            <AlignmentDetails
              webGlApp={
                whichViewer === AlignmentViewerType.PrimaryViewer
                  ? getWebGlContext(WebGlContexts.PrimaryViewport)
                  : getWebGlContext(WebGlContexts.SearchViewport)
              }
              alignmentUUID={alignment.getUUID()}
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
              matrixRendered={(props)=>{
                if (mainViewportVisibleChanged){
                  mainViewportVisibleChanged(props)
                }
              }}
            ></AlignmentDetails>
          )
        }}

        consensus={renderedConsensusSeq}

        query={renderedQuerySeq}

        positionalAxis={{
          metadata: "Position",
          content: renderedPositionAxis
        }}

        barplots={!barplots || barplots.length < 1
          ? []
          : barplots.map((barplot) => {
            return {
              metadata: barplot.dataSeriesSet.map(
                (series) => series.name
              ).join(" / "),
              content: renderBarplot(barplot)
            }
          })
        }

        logoPlot={{
          metadata: "Logo",
          content: renderedSequenceLogo,
        }}

        minimapPlot={renderedMinimap}
      /> 
    </Provider>
  );
}
