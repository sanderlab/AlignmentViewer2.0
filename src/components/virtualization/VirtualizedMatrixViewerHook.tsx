/**
 * Base react hook for a virtual text viewer.
 */
import "./VirtualizedMatrixViewer.scss";
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import * as PIXI from "pixi.js";

import { IBounds, ReactResizeSensor } from "../ResizeSensorHook";
import {
  generateUUIDv4,
  stopSafariFromBlockingWindowWheel,
} from "../../common/Utils";
import { VirtualVerticalScrollbar } from "./VirtualVerticalScrollbarHook";
import { VirtualHorizontalScrollbar } from "./VirtualHorizontalScrollbarHook";
import {
  IVirtualizeParams,
  IVirtualizedHorizontalContents, 
  IVirtualizedHorizontalViewer, 
  IVirtualizedMatrixContent, 
  IVirtualizedMatrixViewer, 
  IVirtualizedVerticalContents, 
  IVirtualizedVerticalViewer, 
  ScrollbarOptions,
  VirtualizationStrategy
} from "./VirtualizationTypes";
import { useReduxVirtualization } from "./VirtualizedMatrixReduxHook";


//
// exported functions for each virtualized viewport:
//    full matrix, x-axis only, y-axis only and the same with
// and the same as "primary" - which means this is the main axis
// for the given "syncedAxisUUID" and will be the one to initialize
// the axis and update sizing.
//
export function VirtualizedVerticalViewer(props: IVirtualizedVerticalViewer) {
  return GenericVirtualizedMatrixViewer({
    getContent: props.getContentForRows,
    params: {
      verticalParams: props.verticalParams,
    }
  });
}
export function VirtualizedHorizontalViewer(props: IVirtualizedHorizontalViewer) {
  return GenericVirtualizedMatrixViewer({
    getContent: props.getContentForColumns,
    params: {
      horizontalParams: props.horizontalParams,
    }
  });
}
export function VirtualizedMatrixViewer(props: IVirtualizedMatrixViewer) {
  return GenericVirtualizedMatrixViewer({
    getContent: props.getMatrixContent,
    params: {
      horizontalParams: props.horizontalParams,
      verticalParams: props.verticalParams,
    }
  });
}

//
// non-exported function - uses same mechanism x/y/xy virtualization
//
interface IVirtualizedMatrixOrRowOrColumn {
  getContent(params: 
    IVirtualizedHorizontalContents | 
    IVirtualizedVerticalContents | 
    IVirtualizedMatrixContent
  ): JSX.Element;
  
  params: {
    horizontalParams?: IVirtualizeParams;
    verticalParams?: IVirtualizeParams;
  };
}

/**
 * 
 * @param props 
 * @returns 
 */
function GenericVirtualizedMatrixViewer(props: IVirtualizedMatrixOrRowOrColumn) {
  //deconstruct props
  const {
    getContent
  } = props;

  const {
    horizontalParams: horizParams,
    verticalParams: vertParams
  } = props.params;

  //misc
  const scrollbarWidthOrHeight = 12;

  //ref
  const ref = useRef<HTMLDivElement>(null);

  //state
  const [mouseHovering, setMouseHovering] = useState<boolean>(false);
  const [countainerBounds, setCountainerBounds] = useState<IBounds | undefined>(undefined);
  const [containerUniqueId] = useState<string>(generateUUIDv4());

  //virtualization initialization
  const horizVirtualizationAxis = useReduxVirtualization(
    horizParams,
    containerUniqueId,
    countainerBounds?.width
  );
  const vertVirtualizationAxis = useReduxVirtualization(
    vertParams,
    containerUniqueId,
    countainerBounds?.height
  );

  //
  //useCallbacks
  //
  const horizUpdateContainerSizePx = horizVirtualizationAxis?.updateContainerSizePx;
  const vertUpdateContainerSizePx = vertVirtualizationAxis?.updateContainerSizePx;
  const horizBoundsUpdated = horizParams?.containerBoundsUpdated;
  const vertBoundsUpdated = vertParams?.containerBoundsUpdated;
  const viewportSizeChanged = useCallback((bounds: IBounds) => {
    setCountainerBounds(bounds);

    if(horizUpdateContainerSizePx){
      horizUpdateContainerSizePx(bounds.width);
    }
    if(vertUpdateContainerSizePx){
      vertUpdateContainerSizePx(bounds.height);
    }
    if(horizBoundsUpdated){
      horizBoundsUpdated(bounds);
    }
    if(vertBoundsUpdated){
      vertBoundsUpdated(bounds);
    }
  }, [
    horizBoundsUpdated,
    vertBoundsUpdated,
    horizUpdateContainerSizePx,
    vertUpdateContainerSizePx,
  ]);

  //
  //useEffects
  //
  useEffect(() => {
    PIXI.settings.RENDER_OPTIONS!.hello = false;
    PIXI.BaseTexture.defaultOptions.scaleMode = PIXI.SCALE_MODES.NEAREST;

    //fix safari-specific bug - this function will tell the window to stop
    //blocking scroll events on the "single-sequence-text" class
    stopSafariFromBlockingWindowWheel("av2-virtualized-matrix");
    stopSafariFromBlockingWindowWheel("hidden-residues-for-copy-paste");
  }, []);

  //set row and column height in pixels
  const horizUpdateCellSizePx = horizVirtualizationAxis?.updateCellSizePx;
  const vertUpdateCellSizePx = vertVirtualizationAxis?.updateCellSizePx;
  useEffect(() => {
    if(horizParams?.cellSizePx !== undefined && horizUpdateCellSizePx){
      horizUpdateCellSizePx(horizParams.cellSizePx);
    }
    if(vertParams?.cellSizePx !== undefined && vertUpdateCellSizePx){
      vertUpdateCellSizePx(vertParams?.cellSizePx);
    }
  }, [
    horizUpdateCellSizePx,
    vertUpdateCellSizePx,
    horizParams?.cellSizePx,
    vertParams?.cellSizePx
  ]);

  //set num columns / num rows
  const horizUpdateCellCount = horizVirtualizationAxis?.updateCellCount;
  const vertUpdateCellCount = vertVirtualizationAxis?.updateCellCount;
  useEffect(() => {
    if(horizUpdateCellCount !== undefined && horizParams?.cellCount){
      horizUpdateCellCount(horizParams.cellCount);
    }
    if(vertUpdateCellCount !== undefined && vertParams?.cellCount){
      vertUpdateCellCount(vertParams.cellCount);
    }
  }, [
    horizUpdateCellCount,
    vertUpdateCellCount,
    horizParams?.cellCount,
    vertParams?.cellCount,
  ]);


  //
  // cache / useMemos
  //

  //misc
  const disableVerticalScrolling = 
    !vertVirtualizationAxis || vertParams?.scrollbar===ScrollbarOptions.NeverOn
      ? true
      : vertVirtualizationAxis.containerSizePx > vertVirtualizationAxis.worldRenderSizePx;
  const disableHorizontalScrolling =
    !horizVirtualizationAxis || horizParams?.scrollbar===ScrollbarOptions.NeverOn
      ? true
      : horizVirtualizationAxis.containerSizePx > horizVirtualizationAxis.worldRenderSizePx;
      
  const reduxInitialized = 
    (!vertParams || (vertParams && vertVirtualizationAxis)) &&
    (!horizParams || (horizParams && horizVirtualizationAxis));
    

  //
  // load the content requested from the parent
  //
  const contentFromParent = useMemo(() => {
    const horizContentParams = horizVirtualizationAxis?.firstIdxToRender === undefined
      ? undefined : {
        firstColIdxToRender: horizVirtualizationAxis.firstIdxToRender,
        lastColIdxToRender: horizVirtualizationAxis.lastIdxToRender,
        renderWidthPx: horizVirtualizationAxis.subsetRenderSizePx,
        renderShiftLeftPx: horizVirtualizationAxis.offsetForRenderingIdxsOnly,
        worldWidthPx: horizVirtualizationAxis.worldRenderSizePx,
        worldShiftLeftPx: horizVirtualizationAxis.worldOffsetPx,
      } as IVirtualizedHorizontalContents;

    const vertContentParams = vertVirtualizationAxis?.firstIdxToRender === undefined
      ? undefined : {
        firstRowIdxToRender: vertVirtualizationAxis.firstIdxToRender,
        lastRowIdxToRender: vertVirtualizationAxis.lastIdxToRender,
        renderHeightPx: vertVirtualizationAxis.subsetRenderSizePx,
        renderShiftTopPx: vertVirtualizationAxis.offsetForRenderingIdxsOnly,
        worldHeightPx: vertVirtualizationAxis.worldRenderSizePx,
        worldShiftTopPx: vertVirtualizationAxis.worldOffsetPx,
      } as IVirtualizedVerticalContents;
      
    if(horizContentParams && vertContentParams){
      return getContent({
        ...horizContentParams,
        ...vertContentParams
      } as IVirtualizedMatrixContent);
    }
    else if(horizContentParams){
      return getContent(horizContentParams);
    }
    else if(vertContentParams){
      return getContent(vertContentParams);
    }
    return <div>uninitialized?</div>;//todo: maybe let parent pass an "uninitialized message?"
  }, [
    getContent,
    horizVirtualizationAxis?.firstIdxToRender,
    horizVirtualizationAxis?.lastIdxToRender,
    horizVirtualizationAxis?.subsetRenderSizePx,
    horizVirtualizationAxis?.offsetForRenderingIdxsOnly,
    horizVirtualizationAxis?.worldRenderSizePx,
    horizVirtualizationAxis?.worldOffsetPx,

    vertVirtualizationAxis?.firstIdxToRender,
    vertVirtualizationAxis?.lastIdxToRender,
    vertVirtualizationAxis?.subsetRenderSizePx,
    vertVirtualizationAxis?.offsetForRenderingIdxsOnly,
    vertVirtualizationAxis?.worldRenderSizePx,
    vertVirtualizationAxis?.worldOffsetPx
  ]);

  /*const horizontalSelectedRender = useMemo(()=>{
    return reduxStateHorizontal?.selected.map((elem, idx)=>
      <div 
        style={{
          position: "absolute",
          top: 0,
          left: elem.idxScreenMin-2, 
          width: elem.idxScreenMax-elem.idxScreenMin+2,
          bottom: "2px",
          border: "dashed red 2px",
          zIndex: 5000,
          pointerEvents: "none"
        }}
        key={idx}/>
    )
  }, [reduxStateHorizontal?.selected]);

  const verticalSelectedRender = useMemo(()=>{
    return reduxStateVertical?.selected.map((elem, idx)=>
      <div 
        style={{
          position: "absolute",
          top: elem.idxScreenMin-1,
          height: elem.idxScreenMax-elem.idxScreenMin+2,
          left: 0, 
          right: "2px",
          border: "dashed red 2px",
          zIndex: 5000,
          pointerEvents: "none"
        }}
        key={idx}/>
    )
  }, [reduxStateVertical?.selected]);*/

  const vertSetWorldOffsetPx = vertVirtualizationAxis?.setWorldOffsetPx;
  const verticalScrollbarRender = useMemo(()=>{
    return disableVerticalScrolling || !vertSetWorldOffsetPx
      ? undefined 
      : (
          <VirtualVerticalScrollbar
            visible={
              vertParams?.scrollbar===ScrollbarOptions.AlwaysOnWhenOverflowed || 
              (vertParams?.scrollbar===ScrollbarOptions.OnHoverWhenOverflowed && mouseHovering)
            }
            width={scrollbarWidthOrHeight}
            horizontalScrollbarHeight={
              !disableHorizontalScrolling ? scrollbarWidthOrHeight : 0
            }
            worldHeight={vertVirtualizationAxis.worldRenderSizePx}
            worldTopOffset={vertVirtualizationAxis.worldOffsetPx}
            scrollbarMoved={(newWorldTop) => {
              vertSetWorldOffsetPx(newWorldTop);
            }}
          />
        );
  }, [
    disableHorizontalScrolling, 
    disableVerticalScrolling,
    mouseHovering,
    vertParams?.scrollbar,
    vertSetWorldOffsetPx,
    vertVirtualizationAxis?.worldRenderSizePx,
    vertVirtualizationAxis?.worldOffsetPx,
  ]);

  const horizSetWorldOffsetPx = horizVirtualizationAxis?.setWorldOffsetPx;
  const horizontalScrollbarRender = useMemo(()=>{
    return disableHorizontalScrolling || !horizSetWorldOffsetPx
      ? undefined 
      : (
          <VirtualHorizontalScrollbar
            visible={
              horizParams?.scrollbar===ScrollbarOptions.AlwaysOnWhenOverflowed || 
              (horizParams?.scrollbar===ScrollbarOptions.OnHoverWhenOverflowed && mouseHovering)
            }
            height={scrollbarWidthOrHeight}
            verticalScrollbarWidth={
              !disableVerticalScrolling ? scrollbarWidthOrHeight : 0
            }
            worldWidth={horizVirtualizationAxis.worldRenderSizePx}
            worldLeftOffset={horizVirtualizationAxis.worldOffsetPx}
            scrollbarMoved={(newWorldLeft) => {
              horizSetWorldOffsetPx(newWorldLeft);
            }}
          />
        )
  }, [
    disableHorizontalScrolling,
    disableVerticalScrolling,
    mouseHovering,
    horizParams?.scrollbar,
    horizSetWorldOffsetPx,
    horizVirtualizationAxis?.worldRenderSizePx,
    horizVirtualizationAxis?.worldOffsetPx
  ]);
  
  const handleWheelFn = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    if (event.deltaX !== 0 && horizSetWorldOffsetPx){
      horizSetWorldOffsetPx(
        horizVirtualizationAxis.worldOffsetPx + event.deltaX
      );
    }
    if (event.deltaY !== 0 && vertSetWorldOffsetPx){
      vertSetWorldOffsetPx(
        vertVirtualizationAxis.worldOffsetPx + event.deltaY
      );
    }
  }, [
    horizSetWorldOffsetPx,
    vertSetWorldOffsetPx,
    horizVirtualizationAxis?.worldOffsetPx,
    vertVirtualizationAxis?.worldOffsetPx,
  ]);

  /*
  const handleClickFn = useCallback((event: React.MouseEvent<HTMLDivElement, MouseEvent>)=>{
    const bounds = event.currentTarget.getBoundingClientRect();
    const viewportX = event.clientX - bounds.left < 0 ? 0 : event.clientX - bounds.left;
    const viewportY = event.clientY - bounds.top < 0 ? 0 : event.clientY - bounds.top;
    if (horizontalReduxId){
      dispatch(
        toggleReduxSelectedPosition({
          id: horizontalReduxId,
          mouseViewportOffsetX: viewportX,
        })
      );
    }
    if (verticalReduxId){
      dispatch(
        toggleReduxSelectedSequence({
          id: verticalReduxId,
          mouseViewportOffsetY: viewportY,
        })
      );
    }
  }, [
    dispatch,
    horizontalReduxId, 
    verticalReduxId
  ]);*/

  const setColHovered = horizVirtualizationAxis?.setHoveredOffsetPx;
  const setRowHovered = vertVirtualizationAxis?.setHoveredOffsetPx;

  const handleMousemoveFn = useCallback((event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const viewportX = event.clientX - bounds.left < 0 ? 0 : event.clientX - bounds.left;
    const viewportY = event.clientY - bounds.top < 0 ? 0 : event.clientY - bounds.top;

    if(setColHovered) setColHovered(viewportX);
    if(setRowHovered) setRowHovered(viewportY);
  }, [
    setColHovered,
    setRowHovered
  ]);

  const handleMouseoutFn = useCallback(() => {
    if(setColHovered) setColHovered(undefined);
    if(setRowHovered) setRowHovered(undefined);
  }, [
    setColHovered,
    setRowHovered
  ]);

  const finalRenderedContent = useMemo(()=>{
    return (
      <>
        <div className="av2-virtualized-matrix" ref={ref}>
          { !reduxInitialized || !ref
              ? undefined 
              : (
                // simple way of enabling wheel scrolling and monitoring of
                // mouse over events 
                <div 
                  className={'av2-wheel-scroller'} 
                  //onClick={handleClickFn}
                  onMouseOut={handleMouseoutFn}
                  onMouseMove={handleMousemoveFn}
                  onWheel={handleWheelFn}
                >
                  {
                    <>
                      <div className="hover-tracker-y" style={
                        !vertVirtualizationAxis?.hoveredEvent || !countainerBounds || !vertParams?.hoverTracker
                          ? {display: "none"}
                          : {
                              position: "fixed",
                              zIndex: 1000,

                              left: countainerBounds?.left-2.5, //1/2 the width
                              top: countainerBounds?.top +
                                   vertVirtualizationAxis.hoveredEvent.containerOffsetCellMiddlePx
                                   - 2.5, // 1/2 the height
                              width:5, height:5,
                              borderRadius: "50%",
                              backgroundColor:"red"
                            }
                        }
                      ></div>

                      <div className="hover-tracker-x" style={
                        !horizVirtualizationAxis?.hoveredEvent || !countainerBounds || !horizParams?.hoverTracker
                          ? {display: "none"} 
                          : {
                              position: "fixed",
                              zIndex: 1000,
                    
                              top: countainerBounds?.top-2.5, //1/2 the height
                              left: countainerBounds?.left +
                                    horizVirtualizationAxis.hoveredEvent.containerOffsetCellMiddlePx
                                    - 2.5, // 1/2 the width
                              width:5, height:5,
                              borderRadius: "50%",
                              backgroundColor:"red"
                            }
                        }
                      ></div>
                    </>
                  }

                  <div
                    className="av2-data"
                    style={{
                      top: vertVirtualizationAxis?.worldOffsetPx !== undefined
                        ? vertParams?.virtualizationStrategy === VirtualizationStrategy.ShiftOnlyFullyRendered
                          ? -vertVirtualizationAxis.worldOffsetPx
                          : vertParams?.virtualizationStrategy === VirtualizationStrategy.Virtualize
                            ? vertVirtualizationAxis.offsetForRenderingIdxsOnly
                            : undefined
                        : undefined,
                      left: horizVirtualizationAxis?.worldOffsetPx !== undefined
                        ? horizParams?.virtualizationStrategy === VirtualizationStrategy.ShiftOnlyFullyRendered
                          ? -horizVirtualizationAxis.worldOffsetPx
                          : horizParams?.virtualizationStrategy === VirtualizationStrategy.Virtualize
                            ? horizVirtualizationAxis.offsetForRenderingIdxsOnly
                            : undefined
                        : undefined
                    }}
                  >
                    {
                      //request matrix - cached above
                      contentFromParent
                    } 
                  </div>
                </div>
              )}
        </div>
        { verticalScrollbarRender }
        { horizontalScrollbarRender }
      </>
    )
  }, [
    reduxInitialized,
    contentFromParent, 
    countainerBounds,
    handleWheelFn, 
    horizVirtualizationAxis?.worldOffsetPx,
    horizVirtualizationAxis?.offsetForRenderingIdxsOnly,
    horizVirtualizationAxis?.hoveredEvent,
    vertVirtualizationAxis?.worldOffsetPx,
    vertVirtualizationAxis?.offsetForRenderingIdxsOnly,
    vertVirtualizationAxis?.hoveredEvent,
    horizParams?.virtualizationStrategy,
    vertParams?.virtualizationStrategy,
    horizParams?.hoverTracker,
    vertParams?.hoverTracker,
    horizontalScrollbarRender, 
    verticalScrollbarRender,
    handleMousemoveFn,
    handleMouseoutFn
  ]);

  //
  //
  //
  // RENDER
  //
  //
  //
  return (
    <div
      onMouseEnter={() => {
        setMouseHovering(true);
      }}
      onMouseLeave={() => {
        setMouseHovering(false);
      }}
    >
      { /*horizontalSelectedRender*/ }
      { /*verticalSelectedRender*/ }
      {
        <ReactResizeSensor onSizeChanged={(viewportSizeChanged)}>
          {finalRenderedContent}
        </ReactResizeSensor>
      }
    </div>
  );
}
