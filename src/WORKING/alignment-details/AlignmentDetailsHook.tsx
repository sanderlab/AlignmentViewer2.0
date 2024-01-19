/**
 * Hooks for pure webgl alignment details.
 */
import "./AlignmentDetails.scss";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AminoAcidAlignmentStyle,
  NucleotideAlignmentStyle,
  ResidueColoring,
  PositionsToStyle,
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
import { Alignment, ISequence } from "../../common/Alignment";
import { ISearchMatchDetails } from "../search/SequenceSearchHook";
import { AlignmentViewerType } from "../AlignmentViewerHook";
import { useAlignmentCanvas } from "../AlignmentCanvasHook";
import { SequenceSorter } from "../../common/AlignmentSorter";


export interface IAlignmentDetailsProps {
  viewerType: AlignmentViewerType;
  sequenceSet: "query" | "consensus" | "alignment";

  alignment: Alignment,
  sortBy: SequenceSorter;
  alignmentStyle: AminoAcidAlignmentStyle | NucleotideAlignmentStyle;
  positionsToStyle: PositionsToStyle;
  residueColoring: ResidueColoring;
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

export function AlignmentDetails(props: IAlignmentDetailsProps) {
  //props
  const {
    viewerType,
    sequenceSet,

    alignment,
    sortBy,
    alignmentStyle,
    highlightPositionalMatches,
    positionsToStyle,
    residueColoring,
    residueHeight,
    residueWidth,
    fontSize,
    verticalScrollbar = ScrollbarOptions.OnHoverWhenOverflowed,
    horizontalScrollbar = ScrollbarOptions.OnHoverWhenOverflowed,
    verticalHoverTracker = "both",
    horizontalHoverTracker = "end",
    matrixRendered
  } = props;

  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement>();
  const [canvasSizing, setCanvasSizing] = useState<{
    positionX: number;
    positionY: number;
    width: number;
    height: number;
    scaleX: number;
    scaleY: number;
  }>();


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
            axisId: `x_auto_generated_alignmentdetails_axis_${alignment.getUUID()}_${containerId}`,
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
            axisId: `y_auto_generated_alignmentdetails_axis_${alignment.getUUID()}_${containerId}`,
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
    sequencesToSlice: ISequence[],
    firstRowIdx: number, lastRowIdx: number,
    firstColIdx: number, lastColIdx: number
  )=>{
    const toReturn: string[] = [];
    for(let seqIdx = firstRowIdx; seqIdx <= lastRowIdx; seqIdx++){
      const seq = sequencesToSlice[seqIdx];
      const slicedSeq = [];
      for(let posIdx = firstColIdx; posIdx <= lastColIdx; posIdx++){
        slicedSeq.push(seq.sequence[posIdx]);
      }
      toReturn.push(slicedSeq.join(""));
    }
    return toReturn;
  }, []);

  /**
   * Handle canvas updates
   */
  const handleCanvasLoadingChange = useCallback((loading: boolean)=>{
    if(loading && canvasElement){
      const bb = canvasElement.getBoundingClientRect();
      //canvasElement.getContext("2d")?.clearRect(0, 0, bb.width, bb.height);
    }
  }, [canvasElement]);

  const alignmentCanvas = useAlignmentCanvas({
    viewerType: viewerType, 
    alignment: alignment, 
    sortBy: sortBy,
    alignmentType: alignmentStyle.alignmentType,
    positionsToStyle: positionsToStyle,
    colorScheme: alignmentStyle.selectedColorScheme,
    highlightPositionalMatches: highlightPositionalMatches,
    loadingStateChanged: handleCanvasLoadingChange
  });

  /*useEffect(()=>{
    if(canvasElement && 
       alignmentCanvas &&
       canvasSizing?.height !== undefined){
      alignmentCanvas.drawIntoCanvas({
        visibleCanvas: canvasElement,
        sequenceSet: sequenceSet,
        width: canvasSizing.width,
        height: canvasSizing.height,
        scaleX: canvasSizing.scaleX,
        scaleY: canvasSizing.scaleY,
        positionX: canvasSizing.positionX,
        positionY: canvasSizing.positionY
      })
    }
  }, [
    alignmentCanvas,
    canvasElement,
    canvasSizing?.width,
    canvasSizing?.height,
    canvasSizing?.scaleX,
    canvasSizing?.scaleY,
    canvasSizing?.positionX,
    canvasSizing?.positionY,
    sequenceSet
  ]);*/
  const handleCanvasMounted = useCallback((canvas: HTMLCanvasElement) => {
    //do this in a function rather than a ref in order to react to changes
    setCanvasElement(canvas); 
  }, []);


  const sequences = useMemo(()=>{
    return sequenceSet === "alignment"
      ? alignment.getSequences(sortBy)
        : sequenceSet === "query"
          ? [alignment.getQuery()]
          : [alignment.getConsensus()];
  }, [
    alignment,
    sequenceSet,
    sortBy,
  ]);


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
      [alignment.getQuery()], 0, 0, firstColIdxToRender, lastColIdxToRender
    )[0];
    const consensusSliced = sliceSequences(
      [alignment.getConsensus()], 0, 0, firstColIdxToRender, lastColIdxToRender
    )[0];
    const fullSequencesInViewport = startEndIdxToArray(
      firstRowIdxToRender, lastRowIdxToRender
    ).map((seqIdx) => {
      return sequences[seqIdx].sequence;
    }, []);

    const seqLength = !seqsSliced[0] ? 0 : seqsSliced[0].length;
    if(alignmentCanvas && canvasElement){
      alignmentCanvas.drawIntoCanvas({
        visibleCanvas: canvasElement,
        sequenceSet: sequenceSet,
        width: (renderWidthPx ? renderWidthPx : residueWidth * seqLength),
        height: (renderHeightPx ? renderHeightPx : residueHeight * seqsSliced.length),
        scaleX: residueWidth,
        scaleY: residueHeight,
        positionX: worldShiftLeftPx ? -worldShiftLeftPx : 0,
        positionY: worldShiftTopPx ? -worldShiftTopPx : 0,
      })
    }
    console.log('WIDTH 1: '+(renderWidthPx ? renderWidthPx : residueWidth * seqLength));
    /*
    setCanvasSizing({
      positionX: worldShiftLeftPx ? -worldShiftLeftPx : 0,
      positionY: worldShiftTopPx ? -worldShiftTopPx : 0,
      width: (renderWidthPx ? renderWidthPx : residueWidth * seqLength),// - residueWidth/2,
      height: (renderHeightPx ? renderHeightPx : residueHeight * seqsSliced.length),// - residueHeight,
      scaleX: residueWidth,
      scaleY: residueHeight
    });*/

    const classNames = ["canvas-holder"];
    if(residueColoring === ResidueColoring.NO_BACKGROUND) classNames.push("hidden");

    return (
      <div className="av2-viewport">
        <div className={classNames.join(" ")} style={{
          opacity: residueColoring === ResidueColoring.LIGHT 
            ? alignmentStyle.selectedColorScheme.backgroundAlpha
            : 1
        }}>
          <canvas 
            ref={handleCanvasMounted} 
            width={canvasSizing?.width} 
            height={canvasSizing?.height}
            />
        </div>
        
        <AlignmentDetailsLetters
          allCharactersInAlignment={alignment.getAllRepresentedCharacters()}
          sequencesInViewport={fullSequencesInViewport}
          slicedSequences={seqsSliced}
          consensusSequence={consensusSliced}
          querySequence={querySliced}
          alignmentStyle={alignmentStyle}
          positionsToStyle={positionsToStyle}
          residueColoring={residueColoring}
          fontSize={fontSize}
          lineHeight={residueHeight}
          verticalOffset={renderShiftTopPx}
          horizontalOffset={renderShiftLeftPx}
          horizontalWorldOffset={worldShiftLeftPx}
        ></AlignmentDetailsLetters>

      </div>
    );
  }, [
    alignmentCanvas, 
    canvasElement, 
    sequenceSet,
    alignment,
    sequences,
    alignmentStyle,
    fontSize,
    handleCanvasMounted,
    matrixRendered,
    positionsToStyle,
    residueColoring,
    residueHeight,
    residueWidth,
    sliceSequences,
    canvasSizing?.height,
    canvasSizing?.width
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


/**
 * Hook to render the alignment details text. Generates a div for each
 * color rendered, each of which contain all the visible
 * sequences (sequencesToRender) -- those letters which are not
 * stylized will be put as spaces.
 * @param props
 */
export function AlignmentDetailsLetters(props: {
  allCharactersInAlignment: string[];
  sequencesInViewport: string[];
  slicedSequences: string[];
  consensusSequence: string;
  querySequence: string;
  alignmentStyle: AminoAcidAlignmentStyle | NucleotideAlignmentStyle;
  positionsToStyle: PositionsToStyle,
  residueColoring: ResidueColoring,
  fontSize: number;
  lineHeight: number;
  verticalOffset?: number;
  horizontalOffset?: number;
  horizontalWorldOffset?: number;
}) {
  const {
    allCharactersInAlignment,
    sequencesInViewport,
    slicedSequences,
    consensusSequence,
    querySequence,
    alignmentStyle,
    positionsToStyle,
    residueColoring,
    fontSize,
    lineHeight,
    verticalOffset,
    horizontalOffset,
    horizontalWorldOffset
  } = props;

  //each sequence style will be rendered as a single separate div.
  //munge the data first. letterColorToLocations contains:
  //  { 
  //    key = letter color as hex string: 
  //    value = [
  //        ordered array with each element representing a single sequence
  //        that contains an arrya of positions in that sequence with the
  //        given color
  //    ]
  //  }
  //with each letter color as key and each value is an array of
  //with each entry 
  const letterColorToLocations = useMemo(()=>{
    const msaColors = Alignment.getPositionalLetterColors(
      allCharactersInAlignment,
      slicedSequences,
      querySequence,
      consensusSequence,
      alignmentStyle.alignmentType,
      positionsToStyle,
      residueColoring,
      alignmentStyle.selectedColorScheme
    );

    const toReturn = {} as {
      [letterColor: string]: { 
        [seqIdx: number]: number[] 
    }};

    for(
      let seqIdx = 0, lenSeqs = slicedSequences.length;
      seqIdx < lenSeqs;
      seqIdx++
    ){
      const seq = slicedSequences[seqIdx];
      for(      
        let posIdx = 0, numPos = seq.length;
        posIdx < numPos;
        posIdx++
      ){
        const letter = seq[posIdx];
        const letterColorAtPos = msaColors[posIdx][letter];
        if(!toReturn[letterColorAtPos.letterColor.hexString]){
          toReturn[letterColorAtPos.letterColor.hexString] = {};
        }
        if(!toReturn[letterColorAtPos.letterColor.hexString][seqIdx]){
          toReturn[letterColorAtPos.letterColor.hexString][seqIdx] = [];
        }
        toReturn[letterColorAtPos.letterColor.hexString][seqIdx].push(posIdx)
      }
    }
    return toReturn;
  }, [
    allCharactersInAlignment,
    slicedSequences, //changes too frequently. what is that about?
    alignmentStyle, 
    positionsToStyle,
    residueColoring,
    consensusSequence, 
    querySequence
  ]);
  
  //Array of JSX elements - one for each letter color. Each contains
  //a character for every position in the rendered sequences, (each
  //position will be blank for all except one of the elemnets)
  const individualColors = useMemo(()=>{
    return Object.entries(letterColorToLocations).map(
      ([color, locations]) => {
        const colorStrings = slicedSequences.map((seqStr, seqIdx) => {
          return seqStr
            .split("")
            .map((letter, colIdx) => {
              if (seqIdx in locations && locations[seqIdx].indexOf(colIdx) >= 0) {
                return letter;
              }
              return "\u00A0";
            })
            .join("");
        });

        return (
          <div
            className={`letters-with-specific-color`}
            style={{ color: color }}
            key={`${color}_${colorStrings.join("")}`}
          >
            {colorStrings.map((seqStr, idx) => {
              return (
                <React.Fragment key={idx + seqStr}>
                  {seqStr}
                  <br />
                </React.Fragment>
              );
            })}
          </div>
        );
      }
    );
  }, [
    letterColorToLocations, 
    slicedSequences
  ]);

  return (
    <>
      <div
        className="sequence-text-holder"
        style={{
          top: verticalOffset,
          left: horizontalOffset,
        }}
      >
        <div
          className="letters-viewport"
          style={{ 
            fontSize: fontSize, 
            lineHeight: lineHeight + "px" 
          }}
        >
          {
            //output each color separately
          }
          {individualColors}
        </div>
      </div>

      {
        // add a hidden interaction element that contains all the displayed sequences
        // so users can copy paste
      }
      <div 
        className={"hidden-residues-for-copy-paste"} 
        style={{ 
          top: verticalOffset,
          left: horizontalWorldOffset 
            ? -1 * horizontalWorldOffset
            : undefined,
          fontSize: fontSize, 
          lineHeight: lineHeight + "px"
        }}>
        {sequencesInViewport.map((seqStr, idx) => {
          return (
            <React.Fragment key={idx + seqStr}>
              {seqStr} <br />
            </React.Fragment>
          );
        })}
      </div>
    </>
  );
}
