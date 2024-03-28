/**
 * Hooks for pure webgl alignment details.
 */
import "./MSABlocksAndLetters.scss"
import React, { useCallback, useMemo, useState } from "react";
import {
  AminoAcidAlignmentTypeInstance,
  AminoAcidColorSchemes,
  AminoacidColorSchemeInstance,
  NucleotideAlignmentTypeInstance,
  NucleotideColorSchemeInstance,
  NucleotideColorSchemes,
  PositionsToStyleInstance,
  ResidueColoringInstance,
} from "../../common/MolecularStyles";
import { 
  VirtualizedHorizontalViewer, 
  VirtualizedMatrixViewer, 
  VirtualizedVerticalViewer 
} from "../virtualization/VirtualizedMatrixViewerHook";
import { 
  IControllerRole, 
  IResponderRole, 
  IVirtualizeParamBasics, 
  IVirtualizeParams, 
  IVirtualizedMatrixContent, 
  ScrollbarOptions, 
  VirtualizationRole, 
  VirtualizationStrategy 
} from "../virtualization/VirtualizationTypes";
import { generateUUIDv4, startEndIdxToArray } from "../../common/Utils";
import { Alignment } from "../../common/Alignment";
import { ISearchMatchDetails } from "../search/SequenceSearchHook";
import { SequenceSorterInstance } from "../../common/AlignmentSorter";
import { MSABlocks } from "./MSABlocks";
import { MSALetters } from "./MSALetters";
import { 
  IExposedPairedWebglFunctions, 
  IExposedStandaloneWebglFunctions,
  IExposedCanvasFunctions,
 } from "./MSABlockGenerator";


export type MSABlocksAndLettersProps = {
  canvasGenerator: IExposedStandaloneWebglFunctions |
                   IExposedPairedWebglFunctions |
                   IExposedCanvasFunctions; //acquire from MSABlockGenerator.ts
  
  sequenceSet: "query" | "consensus" | "alignment";

  alignment: Alignment;
  alignmentType: AminoAcidAlignmentTypeInstance | NucleotideAlignmentTypeInstance;
  aaColorScheme?: AminoacidColorSchemeInstance;
  ntColorScheme?: NucleotideColorSchemeInstance;
  sortBy: SequenceSorterInstance;
  positionsToStyle: PositionsToStyleInstance;
  residueColoring: ResidueColoringInstance;

  highlightPositionalMatches?: ISearchMatchDetails;

  residueHeight: number;
  residueWidth: number;
  fontSize: number;

  highlightedSequenceIdxs?: number[];
  highlightedPositionIdxs?: number[];

  //inform parent of viewport renders
  matrixRendered?: (visibleInViewport: {
    seqIdxStart: number, 
    seqIdxEnd: number,
    posIdxStart: number, 
    posIdxEnd: number
  }) => void;

  //virtualization
  horizVirtualization: IControllerRole | IResponderRole | "Automatic" | "None";
  vertVirtualization: IControllerRole | IResponderRole | "Automatic" | "None";
  verticalScrollbar?: ScrollbarOptions;
  horizontalScrollbar?: ScrollbarOptions;
  verticalHoverTracker?: IVirtualizeParamBasics["hoverTracker"];
  horizontalHoverTracker?: IVirtualizeParamBasics["hoverTracker"];
}

export function MSABlocksAndLetters(props: MSABlocksAndLettersProps) {
  //props
  const {
    canvasGenerator,
    sequenceSet,

    alignment,
    alignmentType,
    aaColorScheme = AminoAcidColorSchemes.list[0],
    ntColorScheme = NucleotideColorSchemes.list[0],
    highlightPositionalMatches,
    positionsToStyle,
    residueColoring,
    sortBy,
    
    residueHeight,
    residueWidth,
    fontSize,
    verticalScrollbar = ScrollbarOptions.OnHoverWhenOverflowed,
    horizontalScrollbar = ScrollbarOptions.OnHoverWhenOverflowed,
    verticalHoverTracker = "both",
    horizontalHoverTracker = "end",
    matrixRendered
  } = props;

  //user can either supply a virtualization, set it to be automatically created, or turn it off
  //completely. Initialize here based on user request.
  const containerId = useState<string>(generateUUIDv4());
  const horizVirtualization = useMemo(()=>{
    return props.horizVirtualization === "None"
      ? undefined
      : props.horizVirtualization === "Automatic"
        ? {
            virtualizationId: 
              `x_auto_generated_alignmentdetails_virtualization_${alignment.getUUID()}_${containerId}`,
            role: VirtualizationRole.Controller,
            cellCount: alignment.getSequenceLength(),
            cellSizePx: residueWidth,
          } as IControllerRole
        : props.horizVirtualization;
  }, [
    alignment,
    containerId,
    props.horizVirtualization,
    residueWidth,
  ]);

  const vertVirtualization = useMemo(()=>{
    return props.vertVirtualization === "None"
      ? undefined
      : props.vertVirtualization === "Automatic"
        ? {
            virtualizationId: 
              `y_auto_generated_alignmentdetails_virtualization_${alignment.getUUID()}_${containerId}`,
            role: VirtualizationRole.Controller,
            cellCount: alignment.getSequenceCount(),
            cellSizePx: residueHeight
          } as IControllerRole
        : props.vertVirtualization;
  }, [
    alignment,
    containerId,
    props.vertVirtualization,
    residueHeight
  ]);

  //
  // useCallbacks
  //
  const sliceSequences = useCallback((
    sequencesToSlice: string[],
    firstRowIdx: number, lastRowIdx: number,
    firstColIdx: number, lastColIdx: number
  )=>{
    const toReturn: string[] = [];
    for(let seqIdx = firstRowIdx; seqIdx <= lastRowIdx; seqIdx++){
      const seq = sequencesToSlice[seqIdx];
      const slicedSeq = [];
      for(let posIdx = firstColIdx; posIdx <= lastColIdx; posIdx++){
        slicedSeq.push(seq[posIdx]);
      }
      toReturn.push(slicedSeq.join(""));
    }
    return toReturn;
  }, []);

  /**
   * Handle canvas updates
   */
  const sequences = useMemo(()=>{
    //NOTE - any additional changes to sequences (like sorting) must be propogated 
    //as keys for MSAblocks 
    return sequenceSet === "alignment"
      ? alignment.getSequences(sortBy).map(s=>s.sequence)
        : sequenceSet === "consensus"
          ? [alignment.getConsensus().sequence]
          : [alignment.getQuery().sequence];
  }, [
    alignment,
    sequenceSet,
    sortBy,
  ]);


  /**
   * The method passed to the virtualization
   */
  const renderMatrixContent = useCallback(({
    firstColIdxToRender, lastColIdxToRender,
    renderWidthPx, renderShiftLeftPx,
    worldWidthPx, worldShiftLeftPx,

    firstRowIdxToRender, lastRowIdxToRender,
    renderHeightPx, renderShiftTopPx,
    worldHeightPx, worldShiftTopPx,
  }: IVirtualizedMatrixContent) => {
    //called by vertical only, horizontal only, and full matrix - if vertical or hoizontal
    //only these would be undefined, so set to zero.
    firstColIdxToRender = firstColIdxToRender ? firstColIdxToRender : 0;
    lastColIdxToRender = lastColIdxToRender ? lastColIdxToRender : 0;
    firstRowIdxToRender = firstRowIdxToRender ? firstRowIdxToRender : 0;
    lastRowIdxToRender = lastRowIdxToRender ? lastRowIdxToRender : 0;
    renderShiftTopPx = renderShiftTopPx ? renderShiftTopPx : 0;

    if(matrixRendered){
      setTimeout(()=>{ //unclear why this is needed, but prevents a startup error
        matrixRendered({
          seqIdxStart: firstRowIdxToRender,
          seqIdxEnd: lastRowIdxToRender,
          posIdxStart: firstColIdxToRender,
          posIdxEnd: lastColIdxToRender
        });
      });
    }

    //issue with loading new alignment (a second alignment): virutalizedmatrix can end up 
    //not loading the redux store after calling getContent 
    const seqsSliced = sliceSequences(
      sequences, 
      firstRowIdxToRender, lastRowIdxToRender, 
      firstColIdxToRender, lastColIdxToRender
    );
    const querySliced = sliceSequences(
      [alignment.getQuery().sequence], 0, 0, firstColIdxToRender, lastColIdxToRender
    )[0];
    const consensusSliced = sliceSequences(
      [alignment.getConsensus().sequence], 0, 0, firstColIdxToRender, lastColIdxToRender
    )[0];
    const fullSequencesInViewport = startEndIdxToArray(
      firstRowIdxToRender, lastRowIdxToRender
    ).map((seqIdx) => {
      return sequences[seqIdx];
    }, []);

    return (
      <div className="av2-blocksandletters">
        <MSABlocks
          canvasGenerator={canvasGenerator}
          sequenceSet={sequenceSet}

          allCharsInAlignment={alignment.getAllRepresentedCharacters()}
          sequences={sequences}
          querySequence={alignment.getQuery().sequence}
          consensusSequence={alignment.getConsensus().sequence}
          
          sortByKey={sortBy.key}
          
          alignmentType={alignmentType}
          aaColorScheme={aaColorScheme}
          ntColorScheme={ntColorScheme}
          residueColoring={residueColoring}
          positionsToStyle={positionsToStyle}
          highlightPositionalMatches={highlightPositionalMatches}

          width={renderWidthPx}
          height={renderHeightPx}
          scaleX={residueWidth}
          scaleY={residueHeight}
          positionX={worldShiftLeftPx ? -worldShiftLeftPx : 0}
          positionY={worldShiftTopPx ? -worldShiftTopPx : 0}
        />
        
        <MSALetters
          allCharactersInAlignment={alignment.getAllRepresentedCharacters()}
          sequencesInViewport={fullSequencesInViewport}
          slicedSequences={seqsSliced}
          consensusSequence={consensusSliced}
          querySequence={querySliced}
          alignmentType={alignmentType}
          aaColorScheme={aaColorScheme}
          ntColorScheme={ntColorScheme}
          positionsToStyle={positionsToStyle}
          residueColoring={residueColoring}
          fontSize={fontSize}
          lineHeight={residueHeight}
          verticalOffset={renderShiftTopPx}
          horizontalOffset={renderShiftLeftPx}
          horizontalWorldOffset={worldShiftLeftPx}
        ></MSALetters>

      </div>
    );
  }, [
    canvasGenerator,
    highlightPositionalMatches,
    sequenceSet,
    alignment,
    alignmentType,
    aaColorScheme,
    ntColorScheme,
    sequences,
    fontSize,
    matrixRendered,
    positionsToStyle,
    residueColoring,
    residueHeight,
    residueWidth,
    sortBy,
    sliceSequences
  ]);

  const horizontalParams: IVirtualizeParams | undefined = useMemo(()=>{
    return !horizVirtualization ? undefined : {
      ...horizVirtualization,
      virtualizationStrategy: VirtualizationStrategy.Manual,
      scrollbar: horizontalScrollbar,
      hoverTracker: horizontalHoverTracker
    };
  }, [
    horizVirtualization, 
    horizontalScrollbar,
    horizontalHoverTracker
  ]);

  const verticalParams: IVirtualizeParams | undefined = useMemo(()=>{
    return !vertVirtualization ? undefined : {
      ...vertVirtualization,
      virtualizationStrategy: VirtualizationStrategy.Manual,
      scrollbar: verticalScrollbar,
      hoverTracker: verticalHoverTracker
    };
  }, [
    vertVirtualization, 
    verticalScrollbar,
    verticalHoverTracker
  ]);

  /**
   *
   *
   *
   * Render
   *
   *
   *
   */
  return (
    horizVirtualization && vertVirtualization
      ? <VirtualizedMatrixViewer
          horizontalParams={horizontalParams!}
          verticalParams={verticalParams!}
          getMatrixContent={renderMatrixContent}
        ></VirtualizedMatrixViewer>
      : horizVirtualization && !vertVirtualization
        ? <VirtualizedHorizontalViewer
            horizontalParams={horizontalParams!}
            getContentForColumns={renderMatrixContent}
          ></VirtualizedHorizontalViewer>
        : !horizVirtualization && vertVirtualization
          ? <VirtualizedVerticalViewer
              verticalParams={verticalParams!}
              getContentForRows={renderMatrixContent}
            ></VirtualizedVerticalViewer>
          : <div>initializing...</div> //TODO: create a getInitializationContent function
    
  );
}
