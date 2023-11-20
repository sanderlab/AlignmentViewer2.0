import * as React from "react";
import "./MiniMap.scss";
import * as PIXI from "pixi.js";
import { useEffect, useCallback, useState, useMemo } from "react";
import { Stage } from "@pixi/react";

import { CanvasAlignmentTiled } from "../CanvasAlignmentTiledComponent";

import { Alignment } from "../../common/Alignment";
import { SequenceSorter } from "../../common/AlignmentSorter";
import {
  AminoAcidAlignmentStyle,
  NucleotideAlignmentStyle,
  ResidueStyle,
} from "../../common/MolecularStyles";
import { RootState, setWorldTopRowOffset } from "../../common/ReduxStore";
import { stopSafariFromBlockingWindowWheel } from "../../common/Utils";
import { ReactResizeSensor } from "../ResizeSensorHook";
import { useAppDispatch, useAppSelector } from "../../common/Hooks";

export interface IMiniMapProps {
  //don't expose these props in the AlignmentViewer full component
  alignment: Alignment;
  sortBy: SequenceSorter;
  alignmentStyle: AminoAcidAlignmentStyle | NucleotideAlignmentStyle;

  //props that should be exposed in AlignmentViewer full component:
  alignHorizontal?: "left" | "right";
  startingWidth?: number;
  minWidth?: number;
  resizable?: "none" | "horizontal";
  verticalHeight?: "div" | "window";

  //maintain sync with this vertical scroller
  verticalReduxId: string;
}

export function MiniMap(props: IMiniMapProps) {
  const {
    alignment,
    sortBy,
    alignmentStyle,
    verticalReduxId,
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
  const [app, setApp] = useState<PIXI.Application<PIXI.ICanvas>>();
  const [minimapRef, setMinimapRef] = useState<HTMLDivElement>();
  const [minimapHolderDimensions, setMinimapHolderDimensions] = useState<
    undefined | { width: number; height: number }
  >(undefined);

  //
  //redux
  //
  const dispatch = useAppDispatch();
  const reduxStateVertical = useAppSelector((state: RootState) =>
    !verticalReduxId
      ? undefined
      : state.virtualizedVerticalSlice[verticalReduxId]
  );

  //
  //cache
  //
  const frameSizing = useMemo(()=>{
    return !minimapHolderDimensions ? undefined : {
      borderWidth: 1, // in pixels
      margin: 2,      // in pixels
      frameHeight: minimapHolderDimensions.height,
      frameWidth: minimapHolderDimensions.width
        ? minimapHolderDimensions.width
        : startingWidth
    }
  }, [
    minimapHolderDimensions, 
    startingWidth,
  ]);

  const mmOffsets = useMemo(()=>{
    //calculate offset of the minimap and minmap dragger 
    if (!reduxStateVertical?.initialized ||
        reduxStateVertical.idxsToRender.length < 1 ||
        !frameSizing?.frameHeight ||
        !frameSizing?.frameWidth){
      return undefined;
    }
    //the y offset of the minimap takes into account its scrollable height as well
    //as the fraction of sequences hidden in the viewport.
    const scale = frameSizing.frameWidth / alignment.getSequenceLength();
    const totalSeqCount = alignment.getSequenceCount();

    const vpVisibleSeqCount = reduxStateVertical.idxsToRender.length;
    const vpNumSeqsHiddenAbove = reduxStateVertical.idxsToRender[0];
    
    const mmVisibleSeqCount = frameSizing.frameHeight / scale;
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
    reduxStateVertical?.initialized,
    reduxStateVertical?.idxsToRender,
    frameSizing?.frameHeight, 
    frameSizing?.frameWidth,
    alignment
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

  /*useEffect(() => {
    if (app && mmOffsets){
      app.stage.position.set(0, -mmOffsets.minimapY * mmOffsets.scale);
      app.stage.scale.set(mmOffsets.scale, mmOffsets.scale);
    }
  }, [app, mmOffsets]);*/

  //
  //callbacks
  //
  const setRefElement = useCallback((ref) => {
    setMinimapRef(ref);
  }, []);

  const minimapHolderResized = useCallback((bounds) => {
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

  const mmClicked = useCallback((e: React.MouseEvent) => {
    //move center of viewport to where mouse was clicked
    e.stopPropagation();
    e.preventDefault();
    if (mmOffsets){
      const clickTopPx = e.pageY - e.currentTarget.getBoundingClientRect().top;
      dispatch(
        setWorldTopRowOffset({
          id: verticalReduxId,
          rowOffset: (
            (clickTopPx / mmOffsets.scale)     //alignment row offset of the click on the minimap
            + mmOffsets.minimapY               //add the existing offset
            - mmOffsets.minimapDraggerHeight/2 //center the dragger / scrollbar
          ),
        })
      );
    }
  }, [dispatch, verticalReduxId, mmOffsets]);

  const mmWheeled = useCallback((e: React.WheelEvent) => {
    if (
      mmOffsets 
      && reduxStateVertical 
      && reduxStateVertical.idxsToRender.length>0 
      && e.deltaY !== 0
    ){
      dispatch(
        setWorldTopRowOffset({
          id: verticalReduxId,
          rowOffset: 
            reduxStateVertical.idxsToRender[0]
            + (e.deltaY / mmOffsets.scale)
        })
      );
    }
  }, [dispatch, verticalReduxId, mmOffsets, reduxStateVertical]);

  //
  //rendering
  //
  const renderAlignment = (
    frameWidth: number, 
    frameHeight: number,
    offsets: NonNullable<typeof mmOffsets>
  ) => {

    if (app){ 
      // I'd prefer this in a useEffect, but unforutnatly the dragging gets
      // out of sync for some reason (testing not very rigerous, could test again TODO)
      app.stage.position.set(0, -offsets.minimapY * offsets.scale);
      app.stage.scale.set(offsets.scale, offsets.scale);
    }

    return (
      <div 
        className="alignment-canvas" 
        style={{
          position: "absolute",
          top: 0, bottom: 0, left: 0, right: 0
        }}
        >
          <Stage
            className="minimap-canvas"
            width={frameWidth}
            height={frameHeight}
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
            <CanvasAlignmentTiled
              sequences={
                alignment.getSequences(sortBy).map((seq) => seq.sequence)
              }
              consensusSequence={alignment.getConsensus().sequence}
              querySequence={alignment.getQuerySequence().sequence}
              alignmentType={alignmentStyle.alignmentType}
              positionsToStyle={alignmentStyle.positionsToStyle}
              colorScheme={alignmentStyle.colorScheme}
              residueDetail={ResidueStyle.DARK}
            />
          </Stage>
          <MinimapDragger
            fillColor={'#000000'}
            baselineOpacity={0.4}
            mouseoverOpacity={0.3}
            draggingOpacity={0.2}
            onWheel={mmWheeled}
            highlighterHeightPx={ 
              //since we render the minimap as single pixels the mapping is the same
              offsets.minimapDraggerHeight * offsets.scale
            }
            highlighterYPx={
              offsets.minimapDraggerY * offsets.scale
            }
            highlighterMoved={(deltaPx)=>{
              dispatch(
                setWorldTopRowOffset({
                  id: verticalReduxId!,
                  rowOffset: (
                    (deltaPx * offsets.minimapPixelToWorldOffset / offsets.scale) +
                    (offsets.minimapDraggerSequenceOffset)
                  ),
                })
              );
            }}
          />
      </div>
    )
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
        { !frameSizing || !mmOffsets ||
          !reduxStateVertical ||
          !reduxStateVertical.initialized ||
          reduxStateVertical.idxsToRender.length < 1 ||
          reduxStateVertical.cellCount <= reduxStateVertical.idxsToRender.length
            ? null 
            : renderAlignment(
                frameSizing.frameWidth, 
                frameSizing.frameHeight, 
                mmOffsets
            )
        }
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

  /*
   *
   *
   * EVENT FUNCTIONS
   *
   *
   */
  /*const onWheel = useCallback((
    e: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    console.log('onWheel:');
  }, []);*/

  const dragMove = useCallback((
    e: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (dragging) {
      highlighterMoved(
        e.movementY, 
      );
    }
  }, [dragging, highlighterMoved]);

  const dragStart = useCallback((
    e: React.MouseEvent<HTMLDivElement, MouseEvent> | 
       React.TouchEvent<HTMLDivElement>
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setDragging(true);
  }, [setDragging]);

  const dragEnd = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.stopPropagation();
    e.preventDefault();
    setDragging(false);
  }, [setDragging]);
  
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 0, right:0, 
          top: highlighterYPx, height: highlighterHeightPx,
          opacity: dragging ? draggingOpacity
            : mouseover ? mouseoverOpacity
            : baselineOpacity,
          backgroundColor: fillColor,
        }}
        onWheel={(e)=>{onWheel(e)}}
        onMouseEnter={()=>{setMouseover(true);}}
        onMouseLeave={()=>{setMouseover(false);}}
        onMouseDown={dragStart}
        onTouchStart={(dragStart)}
      />
      {!dragging ? undefined : 
        //secondary sprite object takes over the entire canvas during dragging. this
        //enables the mouse to move out of the dragger as long is it is pressed. dragging
        //stops when the mouse button is lived up.
        <div style={{
            position: "fixed",
            left: 0, top: 0, right: 0, bottom: 0,
            opacity: 0, backgroundColor: "white",
          }}
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
