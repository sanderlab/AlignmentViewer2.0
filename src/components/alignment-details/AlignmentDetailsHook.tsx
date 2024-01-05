/**
 * Hooks for pure webgl alignment details.
 */
import "./AlignmentDetails.scss";
import React, { useCallback, useMemo, useState } from "react";
import * as PIXI from "pixi.js";
import { Stage } from "@pixi/react";
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
import { CanvasAlignmentTiled } from "../CanvasAlignmentTiledHook";
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


export interface IAlignmentDetailsProps {
  alignmentUUID: string;
  sequences: string[];
  consensusSequence: string;
  querySequence: string;
  alignmentStyle: AminoAcidAlignmentStyle | NucleotideAlignmentStyle;
  positionsToStyle: PositionsToStyle;
  residueColoring: ResidueColoring;
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
    alignmentUUID,
    sequences,
    consensusSequence,
    querySequence,
    alignmentStyle,
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

  //user can either supply a virtualization, set it to be automatically created, or turn it off
  //completely. Initialize here based on user request.
  const containerId = useState<string>(generateUUIDv4());
  const horizVirtualization = useMemo(()=>{
    return props.horizVirtualization === "None"
      ? undefined
      : props.horizVirtualization === "Automatic"
        ? {
            virtualizationId: 
              `x_auto_generated_alignmentdetails_virtualization_${alignmentUUID}_${containerId}`,
            axisId: `x_auto_generated_alignmentdetails_axis_${alignmentUUID}_${containerId}`,
            role: VirtualizationRole.Controller,
            cellCount: sequences[0].length,
            cellSizePx: residueWidth,
          } as IControllerRole
        : props.horizVirtualization;
  }, [
    alignmentUUID,
    containerId,
    props.horizVirtualization,
    residueWidth,
    sequences,
  ]);

  const vertVirtualization = useMemo(()=>{
    return props.vertVirtualization === "None"
      ? undefined
      : props.vertVirtualization === "Automatic"
        ? {
            virtualizationId: 
              `y_auto_generated_alignmentdetails_virtualization_${alignmentUUID}_${containerId}`,
            axisId: `y_auto_generated_alignmentdetails_axis_${alignmentUUID}_${containerId}`,
            role: VirtualizationRole.Controller,
            cellCount: sequences.length,
            cellSizePx: residueHeight
          } as IControllerRole
        : props.vertVirtualization;
  }, [
    alignmentUUID,
    containerId,
    props.vertVirtualization,
    residueHeight,
    sequences
  ]);

  //
  //state
  //
  const [app, setApp] = useState<PIXI.Application<PIXI.ICanvas>>();

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
      [querySequence], 0, 0, firstColIdxToRender, lastColIdxToRender
    )[0];
    const consensusSliced = sliceSequences(
      [consensusSequence], 0, 0, firstColIdxToRender, lastColIdxToRender
    )[0];
    const fullSequencesInViewport = startEndIdxToArray(
      firstRowIdxToRender, lastRowIdxToRender).map((seqIdx) => {
      return sequences[seqIdx];
    }, []);

    if(app?.stage?.position && app.stage.scale){
      const xPos = worldShiftLeftPx ? -worldShiftLeftPx : 0;
      const yPos = worldShiftTopPx ? -worldShiftTopPx : 0;
      //move and scale the background "squares" of the alignment around based on
      //the scroll amount and residue sizing
      if(app.stage.position.x !== xPos || app.stage.position.y !== yPos){
        app.stage.position.set(xPos, yPos);
      }
      if(app.stage.scale.x !== residueWidth || app.stage.scale.y !== residueHeight){
        app.stage.scale.set(residueWidth, residueHeight);
      }
    }

    const finalHeight = renderHeightPx ? renderHeightPx : residueHeight * seqsSliced.length;
    const finalWidth = renderWidthPx ? renderWidthPx : residueWidth * seqsSliced[0].length;

    return (
      <div className="av2-viewport">
        <Stage 
          className={
            ["stage", ...(
              residueColoring === ResidueColoring.NO_BACKGROUND
                ? ["hidden"]
                : []
            )].join(" ")
          }
          width={finalWidth}
          height={finalHeight}
          raf={false}
          renderOnComponentChange={true}
          onMount={setApp}
          options={{ antialias: false, backgroundAlpha: 0 }}
        >
          <CanvasAlignmentTiled
            sequences={sequences}
            consensusSequence={consensusSequence}
            querySequence={querySequence}
            alignmentType={alignmentStyle.alignmentType}
            colorScheme={alignmentStyle.selectedColorScheme}
            positionsToStyle={positionsToStyle}
            residueColoring={residueColoring}
          />
        </Stage>
        
        <AlignmentDetailsLetters
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
    alignmentStyle,
    positionsToStyle,
    residueColoring,
    consensusSequence,
    matrixRendered,
    fontSize,
    querySequence,
    residueHeight,
    residueWidth,
    sequences,
    sliceSequences,
    app
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
    const msaColors = Alignment.getMSAColors(
      slicedSequences,
      querySequence,
      consensusSequence,
      alignmentStyle.alignmentType,
      positionsToStyle,
      residueColoring,
      alignmentStyle.selectedColorScheme
    );

    return msaColors.reduce((acc, seqColorArr, seqIdx)=>{
      seqColorArr.forEach((letterColor, posIdx) => {
        if(!acc[letterColor.letterColor.hexString]){
          acc[letterColor.letterColor.hexString] = {};
        }
        if(!acc[letterColor.letterColor.hexString][seqIdx]){
          acc[letterColor.letterColor.hexString][seqIdx] = [];
        }
        acc[letterColor.letterColor.hexString][seqIdx].push(posIdx);
      });
      return acc;
    }, {} as {[letterColor: string]: { [seqId: number]: number[] }});


    /*return slicedSequences.reduce((colorsAcc, seqStr, seqIdx)=>{
      for (let positionIdx=0, n = seqStr.length; positionIdx < n; ++positionIdx){
        const letter = seqStr[positionIdx];
        const color = getLetterColor(
          letter,
          positionIdx,
          consensusSequence,
          querySequence,
          alignmentStyle,
          positionsToStyle,
          residueColoring
        );
        if (!colorsAcc[color.hexString]) {
          colorsAcc[color.hexString] = {};
        }
        if (!colorsAcc[color.hexString][seqIdx]) {
          colorsAcc[color.hexString][seqIdx] = [];
        }
        colorsAcc[color.hexString][seqIdx].push(positionIdx);
      }
      return colorsAcc;
    }, {} as {[letterColor: string]: { [seqId: number]: number[] }})*/
  }, [
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
