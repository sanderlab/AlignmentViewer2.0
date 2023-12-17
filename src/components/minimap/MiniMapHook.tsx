import * as React from "react";
import "./MiniMap.scss";
import * as PIXI from "pixi.js";
import { useEffect, useCallback, useState, useMemo } from "react";
import { Stage } from "@pixi/react";

import { CanvasAlignmentTiled } from "../CanvasAlignmentTiledHook";

import { Alignment } from "../../common/Alignment";
import { SequenceSorter } from "../../common/AlignmentSorter";
import {
  AminoAcidAlignmentStyle,
  NucleotideAlignmentStyle,
  PositionsToStyle,
  ResidueColoring
} from "../../common/MolecularStyles";
import { generateUUIDv4, stopSafariFromBlockingWindowWheel, useStateCallback } from "../../common/Utils";
import { IBounds, ReactResizeSensor } from "../ResizeSensorHook";
import { IResponderRole, VirtualizationStrategy } from "../virtualization/VirtualizationTypes";
import { useReduxVirtualization } from "../virtualization/VirtualizedMatrixReduxHook";

export interface IMiniMapProps {
  //don't expose these props in the AlignmentViewer full component
  alignment: Alignment;
  sortBy: SequenceSorter;
  positionsToStyle: PositionsToStyle;
  alignmentStyle: AminoAcidAlignmentStyle | NucleotideAlignmentStyle;

  //props that should be exposed in AlignmentViewer full component:
  alignHorizontal?: "left" | "right";
  startingWidth?: number;
  minWidth?: number;
  resizable?: "none" | "horizontal";
  verticalHeight?: "div" | "window";

  //maintain sync with this vertical scroller
  syncWithVerticalVirtualization: IResponderRole;
}

export function MiniMap(props: IMiniMapProps) {
  const {
    alignment,
    sortBy,
    alignmentStyle,
    positionsToStyle,
    syncWithVerticalVirtualization,
  } = props;

  //default props
  const {
    alignHorizontal = "20px",
    resizable = "none",
    startingWidth = 200,
    minWidth = 100,
    verticalHeight = "div"
  } = props;

  //
  //state
  //
  const [containerId] = useState<string>(generateUUIDv4()); //unique id for virtualization
  const [app, setApp] = useState<PIXI.Application<PIXI.ICanvas>>();
  const [minimapRef, setMinimapRef] = useState<HTMLDivElement>();
  const [minimapHolderDimensions, setMinimapHolderDimensions] = useState<
    undefined | { width: number; height: number }
  >(undefined);

  //
  // load virtualization for sync with main viewport. it is also possible
  // for this to be standalone (if syncWithVerticalVirtualization === undefined)
  //
  //const vertVirtualizationParams = useMemo(()=>{
  //  return yncWithVerticalVirtualization === undefined
  //    ? {
  //        virtualizationId: 
  //          `y_minimap_virtualization_${alignment.getUUID()}_${containerId}`,
  //        role: VirtualizationRole.Controller,
  //        cellCount: alignment.getSequenceCount(),
  //        cellSizePx: 1,
  //      } as IControllerRole
  //    : syncWithVerticalVirtualization;
  //}, [alignment, syncWithVerticalVirtualization]);

  const vertVirtualizationParams = useMemo(()=>{
    return {
      ...syncWithVerticalVirtualization,
      virtualizationStrategy: VirtualizationStrategy.Manual //not sure why this is here
    }
  }, [syncWithVerticalVirtualization])

  const vertVirtualizationAxis = useReduxVirtualization(
    vertVirtualizationParams,
    containerId,
    minimapHolderDimensions?.height
  );

  const viewportFullyRendersAlignment = !vertVirtualizationAxis
    ? false
    : vertVirtualizationAxis?.cellCount <= vertVirtualizationAxis?.offsets.numIdxsToRender;

  //
  //cache
  //
  const sequences = useMemo(()=>{
    return alignment.getSequences(sortBy).map((seq) => seq.sequence)
  }, [alignment, sortBy]);

  const frameSizing = useMemo(()=>{
    return !minimapHolderDimensions?.height || !minimapHolderDimensions?.width 
      ? undefined : 
      {
        borderWidth: 1, // in pixels
        margin: 2,      // in pixels
        frameHeight: minimapHolderDimensions.height,
        frameWidth: minimapHolderDimensions.width
          ? minimapHolderDimensions.width
          : startingWidth
      }
  }, [
    minimapHolderDimensions?.height, 
    minimapHolderDimensions?.width, 
    startingWidth,
  ]);

  const mmOffsets = useMemo(()=>{
    //calculate offset of the minimap and minmap dragger 
    if (vertVirtualizationAxis?.offsets.numIdxsToRender === undefined ||
        vertVirtualizationAxis.offsets.numIdxsToRender < 1 ||
        !(frameSizing?.frameHeight) ||
        !(frameSizing?.frameWidth)
    ){
      return undefined;
    }
    
    //the y offset of the minimap takes into account its scrollable height as well
    //as the fraction of sequences hidden in the viewport.
    const scale = frameSizing.frameWidth / alignment.getSequenceLength();
    const totalSeqCount = alignment.getSequenceCount();

    const vpVisibleSeqCount = vertVirtualizationAxis.offsets.numIdxsToRender;
    const vpNumSeqsHiddenAbove = vertVirtualizationAxis.offsets.firstIdxToRender;
    
    const mmVisibleSeqCount = (frameSizing.frameHeight / scale) > totalSeqCount 
      ? totalSeqCount 
      : (frameSizing.frameHeight / scale);
    const mmVisibleProportionalToHidden = (
      //scrollable height: total minimap height - dragger (=viewport height)
      mmVisibleSeqCount-vpVisibleSeqCount 
    ) * (
      //fraction of sequences hidden above the 
      vpNumSeqsHiddenAbove/totalSeqCount
    );
    const mmPreferredY = vpNumSeqsHiddenAbove - mmVisibleProportionalToHidden;

    const minimapY = mmPreferredY <= 0 
      ? 0 //out of bounds at top of mm
      : mmPreferredY + mmVisibleSeqCount >= totalSeqCount 
      ? totalSeqCount - mmVisibleSeqCount //out of bounds at bottom of mm
      : mmPreferredY;
      
    return {
      scale: scale,
      minimapY: minimapY, //the minimap includes sequences hidden in the viewport
      minimapDraggerHeight: vpVisibleSeqCount,
      minimapDraggerY: vpNumSeqsHiddenAbove - minimapY,
      minimapPixelToWorldOffset: totalSeqCount / (mmVisibleSeqCount-vpVisibleSeqCount),
      minimapDraggerSequenceOffset: vpNumSeqsHiddenAbove
    };
  }, [
    alignment,
    frameSizing?.frameHeight, 
    frameSizing?.frameWidth,
    vertVirtualizationAxis?.offsets
  ]); //TODO: always changing because of mouseover stuff. move mouseover top new state?

  //
  //effects
  //
  useEffect(() => {
    PIXI.settings.RENDER_OPTIONS!.hello = false;
    PIXI.BaseTexture.defaultOptions.scaleMode = PIXI.SCALE_MODES.NEAREST;

    //fix safari-specific bug - this function will tell the window to stop
    //blocking scroll events on the "minimap-canvas" class
    stopSafariFromBlockingWindowWheel("minimap-canvas");
  }, []);

  //
  //callbacks
  //
  const setRefElement = useCallback((ref: HTMLDivElement) => {
    setMinimapRef(ref);
  }, []);

  const minimapHolderResized = useCallback((bounds: IBounds) => {
    if (
      !minimapHolderDimensions ||
      minimapHolderDimensions.width !== bounds.width ||
      minimapHolderDimensions.height !== bounds.height
    ) {
      setMinimapHolderDimensions(!minimapRef ? undefined : {
        width: minimapRef.clientWidth,
        height: minimapRef.clientHeight,
      });
    }
  }, [minimapHolderDimensions, minimapRef]);

  //define setWorldOffsetPx outside callback - upsets typescript otherwise
  const setWorldOffsetPx = vertVirtualizationAxis?.setWorldOffsetPx;

  //move center of viewport to where mouse was clicked
  const mmClicked = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (mmOffsets && setWorldOffsetPx){
      const clickTopPx = e.pageY - e.currentTarget.getBoundingClientRect().top;
      setWorldOffsetPx(
        (
          (clickTopPx / mmOffsets.scale)     //alignment row offset of the click on the minimap
          + mmOffsets.minimapY               //add the existing offset
          - mmOffsets.minimapDraggerHeight/2 //center the dragger / scrollbar
        ) * vertVirtualizationAxis.cellSizePx
      )
    }
  }, [
    setWorldOffsetPx, 
    vertVirtualizationAxis?.cellSizePx,
    mmOffsets
  ]);


  const mmWheeled = useCallback((e: React.WheelEvent) => {
    if (
      mmOffsets?.scale && setWorldOffsetPx && e.deltaY !== 0
    ){
      setWorldOffsetPx(
        (
          vertVirtualizationAxis.offsets.firstIdxToRender 
          + (e.deltaY / mmOffsets.scale)
        ) * vertVirtualizationAxis.cellSizePx
      );
    }
  }, [
    mmOffsets?.scale,
    setWorldOffsetPx,
    vertVirtualizationAxis?.offsets.firstIdxToRender,
    vertVirtualizationAxis?.cellSizePx
  ]);

  /*useEffect(()=>{ //out of sync when used in an effect. unclear why.
    if (app && mmOffsets?.minimapY !== undefined){ 
      app.stage.position.set(0, -mmOffsets.minimapY * mmOffsets.scale);
      app.stage.scale.set(mmOffsets.scale, mmOffsets.scale);
    }
  }, [
    app,
    mmOffsets?.minimapY,
    mmOffsets?.scale
  ]);*/

  const handleHighlighterMoved = useCallback((deltaPx: number)=>{
    //TODO clamp
    if (mmOffsets?.scale && setWorldOffsetPx){
      const numIdxsToRender = vertVirtualizationAxis.offsets.numIdxsToRender;
      const calculatedRowOffset = 
        (deltaPx * mmOffsets.minimapPixelToWorldOffset / mmOffsets.scale) +
        (mmOffsets.minimapDraggerSequenceOffset);
      const suggestedRowOffset = 
        calculatedRowOffset < 0 
          ? 0 
          : calculatedRowOffset > alignment.getSequenceCount() - numIdxsToRender
            ? alignment.getSequenceCount() - numIdxsToRender 
            : calculatedRowOffset

      setWorldOffsetPx(
        suggestedRowOffset * vertVirtualizationAxis.cellSizePx
      );
    }
  }, [
    alignment, 
    mmOffsets?.minimapDraggerSequenceOffset,
    mmOffsets?.minimapPixelToWorldOffset,
    mmOffsets?.scale,
    setWorldOffsetPx,
    vertVirtualizationAxis?.offsets.numIdxsToRender,
    vertVirtualizationAxis?.cellSizePx
  ]);

  //
  //rendering
  //
  const renderedCanvas = useMemo(()=>{
    return (
      <CanvasAlignmentTiled
        sequences={sequences}
        consensusSequence={alignment.getConsensus().sequence}
        querySequence={alignment.getQuery().sequence}
        alignmentType={alignmentStyle.alignmentType}
        colorScheme={alignmentStyle.selectedColorScheme}
        positionsToStyle={positionsToStyle}
        residueColoring={ResidueColoring.DARK}
      />
    )
  }, [
    alignment,
    alignmentStyle.alignmentType,
    alignmentStyle.selectedColorScheme,
    positionsToStyle,
    sequences
  ]);

  const renderedAlignment = useMemo(() => {
    return frameSizing === undefined || !mmOffsets
      ? undefined
      : (
        <div 
          className="alignment-canvas" 
          style={{
            position: "absolute",
            top: 0, bottom: 0, left: 0, right: 0
          }}
        >
          <Stage
            className="minimap-canvas"
            width={frameSizing.frameWidth}
            height={frameSizing.frameHeight}
            raf={false}
            renderOnComponentChange={true}
            onMount={setApp}
            onClick={mmClicked}
            onWheel={mmWheeled}
            options={{ 
              antialias: true, 
              backgroundAlpha: 0
            }}
            style={{ //might not be needed
              imageRendering: "pixelated",
            }}
          > 
            {renderedCanvas}
          </Stage>

          {viewportFullyRendersAlignment || !mmOffsets
          ? undefined 
          : <MinimapDragger
              fillColor={'#000000'}
              baselineOpacity={0.4}
              mouseoverOpacity={0.3}
              draggingOpacity={0.2}
              onWheel={mmWheeled}
              highlighterHeightPx={ 
                //since we render the minimap as single pixels the mapping is the same
                mmOffsets.minimapDraggerHeight * mmOffsets.scale
              }
              highlighterYPx={
                mmOffsets.minimapDraggerY * mmOffsets.scale
              }
              highlighterMoved={handleHighlighterMoved}
            />}
          </div>
    )
  }, [
    frameSizing, 
    handleHighlighterMoved,
    mmClicked,
    mmOffsets,
    mmWheeled,
    renderedCanvas,
    viewportFullyRendersAlignment
  ]);

  if (app && mmOffsets?.minimapY !== undefined){  
    //feels like this should be in an effect, but doesn't seem to work - it
    //is out of sync for some reason. 
    app.stage.position.set(0, -mmOffsets.minimapY * mmOffsets.scale);
    app.stage.scale.set(mmOffsets.scale, mmOffsets.scale);
  }

  return (
    <div
      ref={setRefElement}
      className="minimap-holder"
      style={{
        ...(alignHorizontal === "left" ? { left: 0 } : { right: 0 }),
        position: verticalHeight === "div" ? "absolute" : "fixed",
        width: !frameSizing ? startingWidth : frameSizing.frameWidth,
        borderWidth: !frameSizing ? 0 : frameSizing.borderWidth,
        margin: !frameSizing ? 0 : frameSizing.margin,
        resize: resizable ? resizable : "none",
        direction: alignHorizontal === "left" ? "ltr" : "rtl",
        minWidth: minWidth
      }}
    >
      <ReactResizeSensor onSizeChanged={minimapHolderResized}>
        { renderedAlignment }
      </ReactResizeSensor>
    </div>
  );
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

  highlighterMoved: (deltaPx: number) => void;

  //passthrough wheel event - otherwise wheeling minimap stops in safari 
  //when dragger passes under mouse
  onWheel: (e: React.WheelEvent) => void;
}

export function MinimapDragger(props: IMinimapDraggerProps){
  const {
    highlighterHeightPx, 
    highlighterYPx,
    highlighterMoved,
    fillColor,
    baselineOpacity,
    mouseoverOpacity,
    draggingOpacity,
    onWheel
  } = props;  

  const [dragging, setDragging] = useState<boolean>(false);
  const [mouseover, setMouseover] = useState<boolean>(false);
  //custom callback that enables us to call function (highlighterMoved) only
  //after the state has been set.
  const [mouseLastYPx, setMouseLastYPx] = useStateCallback< 
    number | undefined
  >(undefined);

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
    if (dragging && mouseLastYPx !== undefined) {
      setMouseLastYPx(
        e.screenY, 
        () => highlighterMoved(e.screenY-mouseLastYPx)
      );
    }
  }, [
    dragging,
    highlighterMoved,
    setMouseLastYPx, 
    mouseLastYPx
  ]);

  const dragStart = useCallback((
    e: React.MouseEvent<HTMLDivElement, MouseEvent>// | 
       //React.TouchEvent<HTMLDivElement>
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setDragging(true);
    setMouseLastYPx(e.screenY)
  }, [setMouseLastYPx]);

  const dragEnd = useCallback((
    e: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setDragging(false);
    setMouseLastYPx(undefined)
  }, [setMouseLastYPx]);
  
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
