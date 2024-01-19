import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Provider } from "react-redux";
import { PositionalAxis } from "./PositionalAxisHook";
import {
  SequenceLogo,
  LOGO_TYPES,
  ISequenceLogoProps,
} from "./SequenceLogoHook";

import { MiniMap } from "./minimap/MiniMapHook";
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
import { 
  AlignmentViewerLayout, 
  IAdjustableWidth, 
  IFixedWidth, 
  IMetadataAndContent 
} from "./layout/AlignmentViewerLayoutHook";
import { ISearchMatchDetails, SequenceSearch } from "./search/SequenceSearchHook";
import { useListenForSearchKeypresses } from "./search/SearchKeysListenerHook";
import { MSABlocksAndLetters } from "./msa-blocks-and-letters/MSABlocksAndLetters";
import { getCachedCanvasGenerators } from "./msa-blocks-and-letters/MSABlockGenerator";

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
  highlightPositionalMatches?: ISearchMatchDetails;
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
  "svgId" | "dataSeriesSet" | "tooltipPlacement" | "heightPx"
>;

//
// DEFAULT PROPS
//
const defaultProps = {
  disableSearch: false,
  disableSearchKeyboardShortcut: false,
  canvasGenerators: getCachedCanvasGenerators("primary"),

  zoomLevel: 13 as number,
  sortBy: SequenceSorter.INPUT as SequenceSorter,

  showAnnotations: true as boolean,
  showConsensus: true as boolean,
  showLogo: true as boolean,
  showMinimap: false as boolean,
  showQuery: true as boolean,
  showRuler: true as boolean,

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
    maxWidth: 600
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
      tooltipPlacement: undefined,
      heightPx: 75
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
    canvasGenerators,
    highlightPositionalMatches,
    whichViewer,

    alignment,
    barplots,
    style,
    logoOptions,
    logoHeightPx,

    disableSearch,
    disableSearchKeyboardShortcut,
    triggerShowSearch,

    mainViewportVisibleChanged,
    metadataSizing,
    minimapSizing,
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
  const singleLineHeight = residueHeight;
  
  
  //
  // search - listen for key events
  //
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const showSearchFn = useCallback(()=>{
    setShowSearch(true);
  }, [])
  useEffect(() => {
    if(triggerShowSearch){
      triggerShowSearch.current = showSearchFn;
    }
  }, [showSearchFn, triggerShowSearch]);

  useListenForSearchKeypresses({
    disableSearch: disableSearchKeyboardShortcut,
    searchDialogRequested: showSearchFn
  });

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
        searchDetails={highlightPositionalMatches}
        tooltipPlacement={barplotProps.tooltipPlacement}
        dataSeriesSet={barplotProps.dataSeriesSet}
        positionWidth={residueWidth}
        horizontalVirtualization={xViewportResponderVirtualization}
        heightPx={barplotProps.heightPx}
      ></PositionalBarplot>
    );
  }, [
    alignment,
    attachEventListeners,
    highlightPositionalMatches,
    residueWidth, 
    xViewportResponderVirtualization,
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
    sequenceType: "consensus" | "query"
  )=>{
    return attachEventListeners(
      <MSABlocksAndLetters
        canvasGenerator={
          sequenceType === "consensus" 
            ? canvasGenerators.consensusApp
            : canvasGenerators.queryApp
        }
        sequenceSet={sequenceType}

        alignment={alignment}
        sortBy={sortBy}
        horizVirtualization={xViewportResponderVirtualization}
        vertVirtualization={"None"}
        highlightPositionalMatches={highlightPositionalMatches}
        alignmentType={style.alignmentType}
        colorScheme={style.selectedColorScheme}
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
    canvasGenerators.consensusApp,
    canvasGenerators.queryApp,
    sortBy,
    fontSize, 
    highlightPositionalMatches,
    positionsToStyle,
    residueColoring,
    residueHeight,
    residueWidth,
    style,
    xViewportResponderVirtualization
  ]);

  //consensus
  const renderedConsensusSeq: IMetadataAndContent | undefined = useMemo(()=>{
    return !showConsensus ? undefined : {
      metadata: "Consensus",
      content: renderSingleSequence("consensus"),
      heightPx: singleLineHeight
    };
  }, [
    renderSingleSequence,
    showConsensus,
    singleLineHeight
  ]);

  //query
  const renderedQuerySeq: IMetadataAndContent | undefined = useMemo(()=>{
    return !showQuery ? undefined : {
      metadata: "Query",
      content: renderSingleSequence("query"),
      heightPx: singleLineHeight
    }
  }, [
    renderSingleSequence,
    showQuery,
    singleLineHeight
  ]);

  //minimap
  const renderedMinimap = useMemo(()=>{
    return ( !showMinimap ? undefined :
      <MiniMap
        canvasGenerator={canvasGenerators.minimapApp}
        alignment={alignment}
        alignmentType={style.alignmentType}
        colorScheme={style.selectedColorScheme}
        positionsToStyle={positionsToStyle}
        highlightPositionalMatches={highlightPositionalMatches}
        sortBy={sortBy}
        syncWithVerticalVirtualization={
          yViewportResponderVirtualization
        }
      />
    );
  }, [
    alignment, 
    canvasGenerators.minimapApp,
    highlightPositionalMatches,
    style,
    positionsToStyle,
    showMinimap,
    sortBy,
    yViewportResponderVirtualization
  ]);

  const closeSearch = useCallback(()=>{
    setShowSearch(false);
  }, []);

  //
  // final render
  //
  return (
    <Provider store={reduxStore}>
      {!alignment || disableSearch ? undefined : 
        <div style={{display: !showSearch ? "none" : undefined}}>
          <SequenceSearch
            searchVisible={showSearch}
            closePressed={closeSearch}
            mainAlignmentQuerySequence={alignment.getQuery()}
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

        metadataSizing={metadataSizing}
        minimapSizing={minimapSizing}
        titleFontSize={annotationFontSize}

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
            <MSABlocksAndLetters
              canvasGenerator={
                canvasGenerators.primaryViewportApp
              }
              sequenceSet={"alignment"}
              alignment={alignment}
              sortBy={sortBy}
              vertVirtualization={yViewportControllerVirtualization}
              horizVirtualization={xViewportControllerVirtualization}
              highlightPositionalMatches={highlightPositionalMatches}
              alignmentType={style.alignmentType}
              colorScheme={style.selectedColorScheme}
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
            ></MSABlocksAndLetters>
          )
        }}

        consensus={renderedConsensusSeq}

        query={renderedQuerySeq}

        positionalAxis={{
          metadata: "Position",
          content: renderedPositionAxis,
          heightPx: singleLineHeight
        }}

        barplots={!barplots || barplots.length < 1
          ? []
          : barplots.map((barplot) => {
            return {
              metadata: barplot.dataSeriesSet.map(
                (series) => series.name
              ).join(" / "),
              content: renderBarplot(barplot),
              heightPx: barplot.heightPx
            }
          })
        }

        logoPlot={{
          metadata: "Logo",
          content: renderedSequenceLogo,
          heightPx: logoHeightPx
        }}

        minimapPlot={renderedMinimap}
      /> 
    </Provider>
  );
}
