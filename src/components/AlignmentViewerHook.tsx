import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Provider } from "react-redux";
import { PositionalAxis } from "./PositionalAxisHook";
import {
  SequenceLogo,
  ISequenceLogoProps,
  LogoType,
} from "./SequenceLogoHook";

import { MiniMap } from "./minimap/MiniMapHook";
import { AlignmentTextualMetadata } from "./alignment-metadata/AlignmentTextualMetadataHook";
import { Alignment } from "../common/Alignment";
import { SequenceSorter, SequenceSorterInstance } from "../common/AlignmentSorter";
import { reduxStore } from "../redux/ReduxStore";
import {
  AlignmentTypes,
  AminoAcidAlignmentTypeInstance,
  AminoAcidColorSchemes,
  AminoacidColorSchemeInstance,
  NucleotideAlignmentTypeInstance,
  NucleotideColorSchemeInstance,
  NucleotideColorSchemes,
  PositionsToStyleInstance,
  ResidueColoringInstance
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
  IAdjustableHeight, 
  IAdjustableWidth, 
  IFixedHeight, 
  IFixedWidth, 
  IMetadataContentAndHeight
} from "./layout/AlignmentViewerLayoutHook";
import { ISearchMatchDetails, SequenceSearch } from "./search/SequenceSearchHook";
import { useListenForSearchKeypresses } from "./search/SearchKeysListenerHook";
import { MSABlocksAndLetters } from "./msa-blocks-and-letters/MSABlocksAndLetters";
import { getCachedCanvasGenerators } from "./msa-blocks-and-letters/MSABlockGenerator";


//
// TYPES / INTERFACES
//
export type IAlignmentViewerProps = {
  alignment: Alignment;
  alignmentType: AminoAcidAlignmentTypeInstance | NucleotideAlignmentTypeInstance;
  positionsToStyle: PositionsToStyleInstance;
  residueColoring: ResidueColoringInstance;
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
  "svgId" | "dataSeriesSet" | "tooltipPlacement" //TODO remove height prop
>;


//
// DEFAULT PROPS
//
const defaultProps = {
  disableSearch: false,
  disableSearchKeyboardShortcut: false,
  canvasGenerators: getCachedCanvasGenerators("primary"),

  zoomLevel: 13 as number,
  sortBy: SequenceSorter.INPUT as SequenceSorterInstance,
  aaColorScheme: AminoAcidColorSchemes.list[0] as AminoacidColorSchemeInstance,
  ntColorScheme: NucleotideColorSchemes.list[0] as NucleotideColorSchemeInstance,

  showAnnotations: true as boolean,
  showConsensus: true as boolean,
  showLogo: true as boolean,
  showMinimap: false as boolean,
  showQuery: true as boolean,
  showRuler: true as boolean,

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

  barplotSizing: {
    //type: "fixed-height",
    //height: 75
    type: "adjustable-height", 
    startingHeight: 60,
    minHeight: 25, 
    maxHeight: 200
  } as IFixedHeight | IAdjustableHeight,

  logoSizing: {
    //type: "fixed-height",
    //height: 150
    type: "adjustable-height", 
    startingHeight: 100,
    minHeight: 50, 
    maxHeight: 300
  } as IFixedHeight | IAdjustableHeight,

  logoOptions: {
    logoType: LogoType.LETTERS
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
    canvasGenerators,
    highlightPositionalMatches,

    alignment,
    alignmentType,
    aaColorScheme,
    ntColorScheme,
    barplots,
    logoOptions,

    disableSearch,
    disableSearchKeyboardShortcut,
    triggerShowSearch,

    mainViewportVisibleChanged,
    metadataSizing,
    minimapSizing,
    logoSizing,
    barplotSizing,
    positionsToStyle,
    residueColoring,
    showAnnotations,
    showConsensus,
    showLogo,
    showMinimap,
    showQuery,
    showRuler,
    zoomLevel,
  } = {
    ...defaultProps,
    ...props
  };

  //error check color scheme and sort are congruant with passed alignment type
  //if not, reset.
  let {sortBy} = {
    ...defaultProps,
    ...props
  }
  if(
    (alignmentType === AlignmentTypes.AMINOACID && 
     !SequenceSorter.ALL_AMINO_ACID_SORTERS.includes(sortBy)) ||
    (alignmentType === AlignmentTypes.NUCLEOTIDE &&
     !SequenceSorter.ALL_NUCLEOTIDE_SORTERS.includes(sortBy))
  ){
    console.error(
      `Misconfiguration - invalid sortBy (${sortBy.description}) passed to AlignmentViewer for
       alignmentType "${alignmentType.description}". Setting to input sort order.`
    );
    sortBy = SequenceSorter.INPUT;
  }

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
        alignmentType={alignmentType}
        aaColorScheme={aaColorScheme}
        ntColorScheme={ntColorScheme}
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
    alignmentType,
    aaColorScheme,
    ntColorScheme,
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
        alignmentType={alignmentType}
        aaColorScheme={aaColorScheme}
        ntColorScheme={ntColorScheme}
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
    alignmentType,
    aaColorScheme,
    ntColorScheme,
    xViewportResponderVirtualization
  ]);

  //consensus
  const renderedConsensusSeq: IMetadataContentAndHeight | undefined = useMemo(()=>{
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
  const renderedQuerySeq: IMetadataContentAndHeight | undefined = useMemo(()=>{
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
        alignmentType={alignmentType}
        aaColorScheme={aaColorScheme}
        ntColorScheme={ntColorScheme}
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
    alignmentType,
    aaColorScheme,
    ntColorScheme,
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
            alignmentType={alignmentType}
            aaColorScheme={aaColorScheme}
            ntColorScheme={ntColorScheme}
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
        logoSizing={logoSizing}
        barplotSizing={barplotSizing}
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
              alignmentType={alignmentType}
              aaColorScheme={aaColorScheme}
              ntColorScheme={ntColorScheme}
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
                (series) => series.description
              ).join(" / "),
              content: renderBarplot(barplot),
              contentKey: barplot.svgId
            }
          })
        }

        logoPlot={{
          metadata: "Logo",
          content: renderedSequenceLogo
        }}

        minimapPlot={renderedMinimap}
      /> 
    </Provider>
  );
}
