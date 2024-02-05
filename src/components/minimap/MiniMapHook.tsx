/**
 * Minimap component - displays an alignment in a canvas, matching
 * the provided styling. No letters. Provides a means for navigating
 * the alignment (dragging, clicking, wheel) that are reported
 * to the redux store for synchronization.
 * Note: this component must be placed inside an absolute or relative
 * element - it will then take up the available space.
 */
import "./MiniMap.scss";
import * as React from "react";
import * as PIXI from "pixi.js";
import { useEffect, useCallback, useState, useMemo } from "react";

import { Alignment } from "../../common/Alignment";
import { SequenceSorterInstance } from "../../common/AlignmentSorter";
import {
  AminoAcidAlignmentTypeInstance,
  AminoAcidColorSchemes,
  AminoacidColorSchemeInstance,
  NucleotideAlignmentTypeInstance,
  NucleotideColorSchemeInstance,
  NucleotideColorSchemes,
  PositionsToStyleInstance,
  ResidueColoring
} from "../../common/MolecularStyles";
import { generateUUIDv4 } from "../../common/Utils";
import { IBounds, ReactResizeSensor } from "../ResizeSensorHook";
import { IControllerRole, IResponderRole, VirtualizationRole, VirtualizationStrategy } from "../virtualization/VirtualizationTypes";
import { VirtualizationInputParams, useReduxVirtualization } from "../virtualization/VirtualizedMatrixReduxHook";
import { ISearchMatchDetails } from "../search/SequenceSearchHook";
import { MSABlocks } from "../msa-blocks-and-letters/MSABlocks";
import { 
  IExposedStandaloneWebglFunctions,
  IExposedPairedWebglFunctions,
  IExposedCanvasFunctions,
} from "../msa-blocks-and-letters/MSABlockGenerator";

export interface IMiniMapProps {
  highlightPositionalMatches?: ISearchMatchDetails;
  canvasGenerator: IExposedStandaloneWebglFunctions |
                   IExposedPairedWebglFunctions |
                   IExposedCanvasFunctions; //acquire from MSABlockGenerator.ts

  //don't expose these props in the AlignmentViewer full component
  alignment: Alignment;
  sortBy: SequenceSorterInstance;
  positionsToStyle: PositionsToStyleInstance;
  alignmentType: AminoAcidAlignmentTypeInstance | NucleotideAlignmentTypeInstance;
  aaColorScheme?: AminoacidColorSchemeInstance;
  ntColorScheme?: NucleotideColorSchemeInstance;

  //maintain sync with this vertical scroller
  syncWithVerticalVirtualization?: IResponderRole;
}

//const blockgenerator = createMSABlockGenerator("canvas");

export function MiniMap(props: IMiniMapProps) {
  const {
    canvasGenerator,
    highlightPositionalMatches,
    alignment,
    sortBy,
    alignmentType,
    aaColorScheme = AminoAcidColorSchemes.list[0],
    ntColorScheme = NucleotideColorSchemes.list[0],
    positionsToStyle,
    syncWithVerticalVirtualization,
  } = props;
  //const canvasGenerator = blockgenerator; 

  //
  //state
  //
  const [containerId] = useState<string>(generateUUIDv4()); //unique id for virtualization
  const [minimapHolderDimensions, setMinimapHolderDimensions] = useState<
    undefined | { 
      canvasWidthPx: number; 
      canvasHeightPx: number, 
      getYPx: ()=>number 
    }
  >(undefined);
  const isStandalone = syncWithVerticalVirtualization ? false : true;
  const scale = minimapHolderDimensions
    ? minimapHolderDimensions.canvasWidthPx / alignment.getSequenceLength()
    : undefined;

  //
  //virtualization - used to synchronize with viewport. also used as middleman for standalone
  //
  const vertVirtualizationParams: VirtualizationInputParams = useMemo(()=>{
    return {
        ...(
          syncWithVerticalVirtualization 
            ? syncWithVerticalVirtualization
            : { //virtualization if caller doesn't provide - for standalone use
              virtualizationId: `minimap-${alignment.getUUID()}`,
              role: VirtualizationRole.Controller,
              cellCount: alignment.getSequenceCount(),
              cellSizePx: 1
            } as IControllerRole
        ),
        virtualizationStrategy: VirtualizationStrategy.Manual //not sure why this is here
      };
  }, [
    alignment,
    syncWithVerticalVirtualization
  ]);

  const vertVirtualizationAxis = useReduxVirtualization(
    vertVirtualizationParams,
    containerId,
    !minimapHolderDimensions 
      ? undefined 
      : minimapHolderDimensions.canvasHeightPx * scale!
  );

  const minimapHolderResized = useCallback((bounds: IBounds) => {
    if (
      !minimapHolderDimensions ||
      minimapHolderDimensions.canvasWidthPx !== bounds.width ||
      minimapHolderDimensions.canvasHeightPx !== bounds.height
    ) {
      setMinimapHolderDimensions({
        canvasWidthPx: bounds.width,
        canvasHeightPx: bounds.height,
        getYPx: bounds.getLiveTop,
      });
    }
  }, [
    minimapHolderDimensions
  ]);


  //define these functions outside callback - upsets typescript to have the
  //question mark function in dependencies
  const setWorldOffsetFn = vertVirtualizationAxis?.setWorldOffsetPx;

  const viewportFullyRendersAlignment = !vertVirtualizationAxis
  ? false
  : vertVirtualizationAxis?.cellCount <= vertVirtualizationAxis.numIdxsToRender;

  //calculate the equivalent top offset for the minimap and minimap dragger,
  //each of which are on a different scale from the viewport 
  // (minimap world extends above and below the minimap container)
  // (minimap dragger world is the container)
  //
  // interpolate between scales [0, viewportMaxOffsetPx] and either [0, mmMaxOffsetPx] or [0, draggerMaxOffsetPx]
  //      y = y1 + ((x – x1)/(x2 - x1) * (y2 - y1))
  //      where: 
  //        x1 and y1 = 0
  //        x = viewport.worldOffsetPx
  //        x2 = viewportMaxOffsetPx
  //        y2 = mmMaxOffsetPx
  //      solve for y, which equals mmWorldOffsetPx
  //      y = 0 + ((viewport.worldOffsetPx - 0)/(viewportMaxOffsetPx - 0)) * (mmMaxOffsetPx - 0)
  //  ax.worldOffsetPx = (baseOffsetsOnAxis.worldOffsetPx / updatedAxisMaxOffset) * axMaxOffset;
  const interpolateEquivalentViewportTop = useCallback((props:{
    fixedWorldHeightPx: number,
    fixedContainerHeightPx: number,
    fixedWorldTopOffsetPx: number,
    targetWorldHeightPx: number, 
    targetContainerHeightPx: number
  })=>{
    const {
      fixedWorldHeightPx,
      fixedContainerHeightPx,
      fixedWorldTopOffsetPx,
      targetWorldHeightPx, 
      targetContainerHeightPx
    } = props;

    if(targetContainerHeightPx >= targetWorldHeightPx) {
      return 0;
    }
    const fixedMaxOffsetPx = fixedWorldHeightPx - fixedContainerHeightPx;
    const targetMaxOffsetPx = targetWorldHeightPx - targetContainerHeightPx;
    return fixedWorldTopOffsetPx / fixedMaxOffsetPx * targetMaxOffsetPx;
  }, []);

  const offsets = useMemo(()=>{
    if(!minimapHolderDimensions?.canvasWidthPx || !vertVirtualizationAxis?.numIdxsToRender || scale === undefined){
      return undefined;
    }
    const vpContainerHeightPx = vertVirtualizationAxis.subsetRenderSizePx;
    const vpWorldHeightPx = vertVirtualizationAxis.worldRenderSizePx;
    const vpWorldTopOffsetPx = vertVirtualizationAxis.worldOffsetPx;

    //the minimap width:height ratio is 1:1, scaled so width is the width of the alignment
    const mmWorldHeightPx = scale * alignment.getSequenceCount();
    const mmTopOffsetPx = interpolateEquivalentViewportTop({
      fixedWorldHeightPx: vpWorldHeightPx,
      fixedContainerHeightPx: vpContainerHeightPx,
      fixedWorldTopOffsetPx: vpWorldTopOffsetPx,
      targetWorldHeightPx: mmWorldHeightPx, 
      targetContainerHeightPx: minimapHolderDimensions.canvasHeightPx
    });

    const draggerWorldHeightPx = minimapHolderDimensions.canvasHeightPx < mmWorldHeightPx
      ? minimapHolderDimensions.canvasHeightPx
      : mmWorldHeightPx; //world all fits into the canvas and dragger should stop at top of world
    const draggerHeightPx = scale * vertVirtualizationAxis.numIdxsToRender;
    const draggerTopOffsetPx = interpolateEquivalentViewportTop({
      fixedWorldHeightPx: vpWorldHeightPx,
      fixedContainerHeightPx: vpContainerHeightPx,
      fixedWorldTopOffsetPx: vpWorldTopOffsetPx,
      targetWorldHeightPx: draggerWorldHeightPx, 
      targetContainerHeightPx: draggerHeightPx
    });
    
    const mmNumSeqsBelow = alignment.getSequenceCount() - Math.floor(
      (mmTopOffsetPx+minimapHolderDimensions.canvasHeightPx) / scale
    );

    return {
      mmWorldHeightPx: mmWorldHeightPx,
      mmWorldOffsetPx: mmTopOffsetPx, //shift fully renderer mm this amount
      mmNumSeqsAbove: Math.floor(mmTopOffsetPx / scale),
      mmNumSeqsBelow: mmNumSeqsBelow < 0 ? 0 : mmNumSeqsBelow,

      draggerOffsetPx: draggerTopOffsetPx,
      draggerHeightPx: draggerHeightPx,
      draggerWorldHeightPx: draggerWorldHeightPx,
    }
  }, [
    alignment,
    minimapHolderDimensions?.canvasWidthPx,
    minimapHolderDimensions?.canvasHeightPx,
    vertVirtualizationAxis?.numIdxsToRender,
    vertVirtualizationAxis?.subsetRenderSizePx,
    vertVirtualizationAxis?.worldOffsetPx,
    vertVirtualizationAxis?.worldRenderSizePx,
    interpolateEquivalentViewportTop,
    scale
  ]);


  //
  //effects
  //
  useEffect(() => {
    PIXI.settings.RENDER_OPTIONS!.hello = false;
    PIXI.BaseTexture.defaultOptions.scaleMode = PIXI.SCALE_MODES.NEAREST;

    //fix safari-specific bug - this function will tell the window to stop
    //blocking scroll events on the "minimap-canvas" class
    //stopSafariFromBlockingWindowWheel("minimap-canvas");
  }, []);

  //
  //callbacks
  //

  //move center of viewport to where mouse was clicked
  const mmClicked = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (offsets?.draggerHeightPx && setWorldOffsetFn && scale){
      const clickPx = e.pageY - e.currentTarget.getBoundingClientRect().top;
      setWorldOffsetFn(((
            clickPx //offset in minimap that was clicked
            + offsets.mmWorldOffsetPx //add to the shifted offset
            - (offsets.draggerHeightPx/2) //center the dragger / scrollbar --- dragger might
          ) / scale //convert to alignment units
        ) * vertVirtualizationAxis.cellSizePx //move main viewport
      );
    }
  }, [
    offsets?.draggerHeightPx,
    offsets?.mmWorldOffsetPx,
    scale,
    setWorldOffsetFn, 
    vertVirtualizationAxis?.cellSizePx
  ]);

  //handle wheel event
  const mmWheeled = useCallback((e: React.WheelEvent) => {
    if (
      scale && 
      setWorldOffsetFn && 
      e.deltaY !== 0 && 
      offsets?.draggerWorldHeightPx !== undefined
    ){
      setWorldOffsetFn(
        vertVirtualizationAxis.worldOffsetPx 
        + (((
          e.deltaY 
            / offsets.draggerWorldHeightPx //fraction of world height
          ) * vertVirtualizationAxis.worldRenderSizePx) //make relative to world
          / 10 //arbitrary slowdown
        )
      );
    }
  }, [
    scale,
    setWorldOffsetFn,
    offsets?.draggerWorldHeightPx,
    vertVirtualizationAxis?.worldOffsetPx,
    vertVirtualizationAxis?.worldRenderSizePx
  ]);

  //highlighter was dragged by the user
  const handleHighlighterMoved = useCallback((topYPx: number)=>{
    if (setWorldOffsetFn && offsets?.draggerHeightPx && minimapHolderDimensions?.canvasHeightPx){
      setWorldOffsetFn(
        interpolateEquivalentViewportTop({
          fixedWorldHeightPx: offsets.draggerWorldHeightPx,
          fixedContainerHeightPx: offsets.draggerHeightPx,
          fixedWorldTopOffsetPx: topYPx,
          targetWorldHeightPx: vertVirtualizationAxis.worldRenderSizePx, 
          targetContainerHeightPx: vertVirtualizationAxis.containerSizePx
        })
      );
    }
  }, [
    interpolateEquivalentViewportTop,
    minimapHolderDimensions?.canvasHeightPx,
    offsets?.draggerHeightPx,
    offsets?.draggerWorldHeightPx,
    setWorldOffsetFn,
    vertVirtualizationAxis?.containerSizePx,
    vertVirtualizationAxis?.worldRenderSizePx,
  ]);

  //
  // deal with pixijs directly:
  //   - mount
  //   - update with sizing changes
  //   - update with scale and position changes
  //   - update with alignment changes
  //
  //const handleCanvasLoadingChange = useCallback((loading: boolean)=>{
  //  if(loading && canvasElement){
  //    const bb = canvasElement.getBoundingClientRect();
  //    canvasElement.getContext("2d")?.clearRect(0, 0, bb.width, bb.height);
  //  }
  //}, [canvasElement]);

  
  //
  //memoized stuff
  //
  const renderedMinimapHeaderFooter = useMemo(()=>{
    return [
      offsets?.mmNumSeqsAbove === undefined
        ? undefined
        : (
          <div className="minimap-header">
            {`${offsets.mmNumSeqsAbove.toLocaleString()} hidden`}
          </div>
        ),
      offsets?.mmNumSeqsBelow === undefined
        ? undefined
        : (
          <div className="minimap-footer">
            {`${offsets.mmNumSeqsBelow.toLocaleString()} hidden`}
          </div>
        )
    ]
  }, [
    offsets?.mmNumSeqsAbove,
    offsets?.mmNumSeqsBelow
  ]);

  const sequences = useMemo(()=>{
    //NOTE - any additional changes to sequences (like sorting) must be propogated as
    //keys for MSAblocks
    return alignment.getSequences(sortBy).map(s=>s.sequence);
  }, [alignment, sortBy]);

  const renderedMinimapCanvasHolder = useMemo(()=>{
    return offsets?.mmWorldOffsetPx === undefined || !scale ? undefined : (
      <div className="minimap-canvas-holder">
        <MSABlocks
          canvasGenerator={canvasGenerator}
          showLoadingIndicator={true}
          isMinimap={true}
          sequenceSet={"alignment"}
          sequences={sequences}
          sortByKey={sortBy.key}
          querySequence={alignment.getQuery().sequence}
          consensusSequence={alignment.getConsensus().sequence}
          allCharsInAlignment={alignment.getAllRepresentedCharacters()}
          alignmentType={alignmentType}
          aaColorScheme={aaColorScheme}
          ntColorScheme={ntColorScheme}
          residueColoring={ResidueColoring.DARK}
          highlightPositionalMatches={highlightPositionalMatches}
          positionsToStyle={positionsToStyle}
          width={scale*alignment.getSequenceLength()}
          height={scale*alignment.getSequenceCount()}
          scaleX={scale}
          scaleY={scale}
          positionX={0}
          positionY={
            -offsets.mmWorldOffsetPx// / scale
          }
         />
      </div>
    )
  }, [
    alignment,
    alignmentType,
    canvasGenerator,
    aaColorScheme,
    ntColorScheme,
    positionsToStyle,
    highlightPositionalMatches,
    offsets?.mmWorldOffsetPx,
    scale,
    sequences,
    sortBy.key
  ]);

  const renderedMinimapCanvasInteraction = useMemo(()=>{
    return (
      <div 
        className="minimap-interaction" 
        onClick={mmClicked}
        onWheel={mmWheeled}>
      </div>
    )
  }, [
    mmClicked,
    mmWheeled
  ]);



  const mainContainerYOffset = minimapHolderDimensions?.getYPx();
  const renderedDragger = useMemo(()=>{
    return (
      viewportFullyRendersAlignment ||
      !offsets?.draggerHeightPx || 
      mainContainerYOffset === undefined
    )
      ? undefined 
      : <MinimapDragger
          fillColor={'#000000'}
          baselineOpacity={0.4}
          mouseoverOpacity={0.3}
          draggingOpacity={0.2}
          onWheel={mmWheeled}
          highlighterHeightPx={ 
            //since we render the minimap as single pixels the mapping is the same
            offsets.draggerHeightPx
          }
          highlighterYPx={
            offsets.draggerOffsetPx
          }
          highlighterMoved={handleHighlighterMoved}
          mainMinimapContainerY={mainContainerYOffset}
        />
  }, [
    handleHighlighterMoved,
    mmWheeled,
    offsets?.draggerHeightPx,
    offsets?.draggerOffsetPx,
    viewportFullyRendersAlignment,
    mainContainerYOffset
  ]);

  const renderedAlignment = useMemo(() => {
    return (
      <div className="minimap">

        { renderedMinimapHeaderFooter[0] }

        <div className="minimap-app-holder">
          <ReactResizeSensor onSizeChanged={minimapHolderResized} logId="minimap">
            { renderedMinimapCanvasHolder }
            { renderedMinimapCanvasInteraction }
            { renderedDragger }
          </ReactResizeSensor>
        </div>

        { renderedMinimapHeaderFooter[1] }

      </div>
    )
  }, [ 
    renderedMinimapCanvasInteraction,
    renderedMinimapHeaderFooter,
    renderedMinimapCanvasHolder,
    renderedDragger,
    minimapHolderResized,
  ]);

  //
  //update the viewport in standalone mode - very important 
  //
  //functions with quesiton marks must be defined outside the dependencies
  //otherwise typescript complains
  const setCellHeightFn = vertVirtualizationAxis?.updateCellSizePx;
  const setContainerHeightFn = vertVirtualizationAxis?.updateContainerSizePx;
  useEffect(()=>{
    //update viewport height as needed as also
    if(isStandalone && 
       setContainerHeightFn && 
       setCellHeightFn && 
       minimapHolderDimensions?.canvasHeightPx && 
       offsets?.mmWorldHeightPx &&
       scale){

      //update the height
      setCellHeightFn(scale);

      //dragger - height is container height
      setContainerHeightFn(
        minimapHolderDimensions.canvasHeightPx 
          / (scale * alignment.getSequenceCount())
          * minimapHolderDimensions.canvasHeightPx
      )
    }
  }, [
    alignment,
    isStandalone,
    minimapHolderDimensions?.canvasHeightPx,
    offsets?.mmWorldHeightPx,
    scale,
    setCellHeightFn,
    setContainerHeightFn,
    setWorldOffsetFn,
  ]);

  return renderedAlignment;
}


/***********************************
 * 
 * 
 * MinimapDragger 
 * An overlay the size of the main viewport that can be dragged
 * up and down.
 * 
 * 
 ***********************************/
interface IMinimapDraggerProps {
  highlighterHeightPx: number;
  highlighterYPx: number;
  fillColor: string;
  baselineOpacity: number;
  mouseoverOpacity: number;
  draggingOpacity: number;

  mainMinimapContainerY: number;

  highlighterMoved: (topHighlighterPx: number) => void;

  //passthrough wheel event - otherwise wheeling minimap stops in safari 
  //when dragger passes under mouse
  onWheel: (e: React.WheelEvent) => void;
}

export function MinimapDragger(props: IMinimapDraggerProps){
  const {
    highlighterHeightPx, 
    highlighterYPx,
    highlighterMoved,
    mainMinimapContainerY,
    fillColor,
    baselineOpacity,
    mouseoverOpacity,
    draggingOpacity,
    onWheel
  } = props;  
  const [dragging, setDragging] = useState<boolean>(false);
  const [mouseover, setMouseover] = useState<boolean>(false);
  const [dragStartFraction, setDragStartFraction] = useState<number>(0);
  
  /*
   *
   *
   * EVENT FUNCTIONS
   *
   *
   */
  const dragMove = useCallback((
    e: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (dragging) {
      highlighterMoved(
        e.pageY 
        - mainMinimapContainerY 
        - (highlighterHeightPx * dragStartFraction)
      );
    }
  }, [
    dragging,
    dragStartFraction,
    highlighterHeightPx,
    highlighterMoved,
    mainMinimapContainerY,
  ]);

  const dragStart = useCallback((
    e: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    e.stopPropagation();
    e.preventDefault();
    let rect = e.currentTarget.getBoundingClientRect();
    let y = e.clientY - rect.top;
    setDragging(true);
    setDragStartFraction(y/rect.height);
  }, []);

  const dragEnd = useCallback((
    e: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setDragging(false);
  }, []);
  
  return (
    <>
      <div
        className="minimap-dragger"
        style={{
          top: highlighterYPx, 
          height: highlighterHeightPx,
          opacity: dragging ? draggingOpacity
            : mouseover ? mouseoverOpacity
            : baselineOpacity,
          backgroundColor: fillColor,
        }}
        onWheel={(e)=>{onWheel(e)}}
        onMouseEnter={()=>{setMouseover(true);}}
        onMouseLeave={()=>{setMouseover(false);}}
        onMouseDown={dragStart}
        //onTouchStart={(dragStart)}
      />
      {!dragging ? undefined : 
        //secondary div takes over the entire page during dragging. this enables the
        //mouse to move out of the dragger as long is it is pressed. dragging stops
        //when the mouse button is lived up.
        <div 
          className="minimap-full-page-drag-detector"
          onMouseMove={dragMove}
          //onPointerMove={dragMove}
          //onTouchMove={dragMove}

          onMouseUp={dragEnd}
          onMouseOut={dragEnd}
          onMouseLeave={dragEnd}
          //onPointerUp={dragEnd}
          //onPointerOut={dragEnd}
          //onPointerLeave={dragEnd}
        />
      }
    </>
  );
};
