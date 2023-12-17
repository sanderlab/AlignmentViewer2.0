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
  VirtualizationRole,
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
  const [screenWidth, setScreenWidth] = useState<number | undefined>(undefined);
  const [screenHeight, setScreenHeight] = useState<number | undefined>(undefined);
  const [containerUniqueId] = useState<string>(generateUUIDv4());

  //virtualization initialization
  const horizVirtualizationAxis = useReduxVirtualization(
    horizParams,
    containerUniqueId,
    screenWidth
  );
  const vertVirtualizationAxis = useReduxVirtualization(
    vertParams,
    containerUniqueId,
    screenHeight
  );

  //
  //useCallbacks
  //
  const horizUpdateContainerSizePx = horizVirtualizationAxis?.updateContainerSizePx;
  const vertUpdateContainerSizePx = vertVirtualizationAxis?.updateContainerSizePx;
  const viewportSizeChanged = useCallback((bounds: IBounds) => {
    setScreenHeight(bounds.height);
    setScreenWidth(bounds.width);

    if(horizUpdateContainerSizePx){
      horizUpdateContainerSizePx(bounds.width);
    }
    if(vertUpdateContainerSizePx){
      vertUpdateContainerSizePx(bounds.height);
    }
  }, [
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
    if(horizParams?.cellSizePx && horizUpdateCellSizePx){
      horizUpdateCellSizePx(horizParams.cellSizePx);
    }
    if(vertParams?.cellSizePx && vertUpdateCellSizePx){
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
    if(horizUpdateCellCount && horizParams?.cellCount){
      horizUpdateCellCount(horizParams.cellCount);
    }
    if(vertUpdateCellCount && vertParams?.cellCount){
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
      : vertVirtualizationAxis.containerSizePx > vertVirtualizationAxis.offsets.worldRenderSizePx;
  const disableHorizontalScrolling =
    !horizVirtualizationAxis || horizParams?.scrollbar===ScrollbarOptions.NeverOn
      ? true
      : horizVirtualizationAxis.containerSizePx > horizVirtualizationAxis.offsets.worldRenderSizePx;
      
  const reduxInitialized = 
    (!vertParams || (vertParams && vertVirtualizationAxis)) &&
    (!horizParams || (horizParams && horizVirtualizationAxis));
    

  //
  // load the content requested from the parent
  //
  const contentFromParent = useMemo(() => {
    const horizContentParams = !horizVirtualizationAxis?.offsets
      ? undefined : {
        firstColIdxToRender: horizVirtualizationAxis.offsets.firstIdxToRender,
        lastColIdxToRender: horizVirtualizationAxis.offsets.lastIdxToRender,
        renderWidthPx: horizVirtualizationAxis.offsets.subsetRenderSizePx,
        renderShiftLeftPx: horizVirtualizationAxis.offsets.offsetForRenderingIdxsOnly,
        worldWidthPx: horizVirtualizationAxis.offsets.worldRenderSizePx,
        worldShiftLeftPx: horizVirtualizationAxis.offsets.offsetForFullWorldRender,
      } as IVirtualizedHorizontalContents;

    const vertContentParams = !vertVirtualizationAxis?.offsets
      ? undefined : {
        firstRowIdxToRender: vertVirtualizationAxis.offsets.firstIdxToRender,
        lastRowIdxToRender: vertVirtualizationAxis.offsets.lastIdxToRender,
        renderHeightPx: vertVirtualizationAxis.offsets.subsetRenderSizePx,
        renderShiftTopPx: vertVirtualizationAxis.offsets.offsetForRenderingIdxsOnly,
        worldHeightPx: vertVirtualizationAxis.offsets.worldRenderSizePx,
        worldShiftTopPx: vertVirtualizationAxis.offsets.offsetForFullWorldRender,
      } as IVirtualizedVerticalContents;
      
    if(horizContentParams && vertContentParams){
      return getContent({
        ...horizContentParams,
        ...vertContentParams
      });
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
    horizVirtualizationAxis?.offsets,
    vertVirtualizationAxis?.offsets
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

  const vertSetWorldOffsetPx = vertVirtualizationAxis?.setWorldOffsetPx
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
            worldHeight={vertVirtualizationAxis.offsets.worldRenderSizePx}
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
    vertVirtualizationAxis?.offsets.worldRenderSizePx,
    vertVirtualizationAxis?.worldOffsetPx,
  ]);

  const horizSetWorldOffsetPx = horizVirtualizationAxis?.setWorldOffsetPx
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
            worldWidth={horizVirtualizationAxis.offsets.worldRenderSizePx}
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
    horizVirtualizationAxis?.offsets.worldRenderSizePx,
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
  ]);

  const handleMouseoutFn = useCallback(() =>{
    if (verticalReduxId){
      dispatch(
        setReduxMouseOverY({
          id: verticalReduxId,
          mouseViewportOffsetY: undefined,
        })
      );
    }
    if (horizontalReduxId){
      dispatch(
        setReduxMouseOverX({
          id: horizontalReduxId,
          mouseViewportOffsetX: undefined,
        })
      );
    }
  }, [
    dispatch, 
    horizontalReduxId, 
    verticalReduxId
  ]);

  const handleMousemoveFn = useCallback((event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const viewportX = event.clientX - bounds.left < 0 ? 0 : event.clientX - bounds.left;
    const viewportY = event.clientY - bounds.top < 0 ? 0 : event.clientY - bounds.top;
    
    if (verticalReduxId){
      dispatch(
        setReduxMouseOverY({
          id: verticalReduxId,
          mouseViewportOffsetY: viewportY,
        })
      );
    }
    if (horizontalReduxId){
      dispatch(
        setReduxMouseOverX({
          id: horizontalReduxId,
          mouseViewportOffsetX: viewportX,
        })
      );
    }
  }, [
    dispatch, 
    horizontalReduxId,
    verticalReduxId
  ]);*/

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
                  //onMouseOut={handleMouseoutFn}
                  //onMouseMove={handleMousemoveFn}
                  onWheel={handleWheelFn}
                >
                  {
                    //<div className="hover-tracker-y" style={
                    //  !reduxStateVertical || !reduxStateVertical.mouseMove || suppressVerticalHoverTracker
                    //    ? {display: "none"}
                    //    : {
                    //        position: "absolute",
                    //        zIndex: 1000,

                    //        left: -4, //1/2 the width
                    //        top: reduxStateVertical.mouseMove.hoverIdxScreenMin
                    //              + .5*reduxStateVertical.cellPixelSize
                    //              - 4, // 1/2 the height
                    //        width:8, height:8, 
                    //        borderRadius: "50%",
                    //        backgroundColor:"red"
                    //      }
                    //  }
                    //></div>

                    //<div className="hover-tracker-x" style={
                    //  !reduxStateHorizontal || !reduxStateHorizontal.mouseMove || suppressHorizontalHoverTracker 
                    //    ? {display: "none"} 
                    //    : {
                    //        position: "absolute",
                    //        zIndex: 1000,
                    
                    //        top: -4, //1/2 the height
                    //        left: reduxStateHorizontal.mouseMove.hoverIdxScreenMin
                    //              + .5*reduxStateHorizontal.cellPixelSize
                    //              - 4, // 1/2 the width
                    //        width:8, height:8, 
                    //        borderRadius: "50%",
                    //        backgroundColor:"red"
                    //      }
                    //  }
                    //></div>
                  }

                  <div
                    className="av2-data"
                    style={{
                      top: vertVirtualizationAxis?.offsets
                        ? vertParams?.virtualizationStrategy === VirtualizationStrategy.ShiftOnlyFullyRendered
                          ? -vertVirtualizationAxis.offsets.offsetForFullWorldRender
                          : vertParams?.virtualizationStrategy === VirtualizationStrategy.Virtualize
                            ? vertVirtualizationAxis.offsets.offsetForRenderingIdxsOnly
                            : undefined
                        : undefined,
                      left: horizVirtualizationAxis?.offsets
                        ? horizParams?.virtualizationStrategy === VirtualizationStrategy.ShiftOnlyFullyRendered
                          ? -horizVirtualizationAxis.offsets.offsetForFullWorldRender
                          : horizParams?.virtualizationStrategy === VirtualizationStrategy.Virtualize
                            ? horizVirtualizationAxis.offsets.offsetForRenderingIdxsOnly
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
    handleWheelFn, 
    horizVirtualizationAxis?.offsets,
    vertVirtualizationAxis?.offsets,
    horizParams?.virtualizationStrategy,
    vertParams?.virtualizationStrategy,
    horizontalScrollbarRender, 
    verticalScrollbarRender
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
        horizParams?.role === VirtualizationRole.Controller ||
        vertParams?.role === VirtualizationRole.Controller
          ? <ReactResizeSensor onSizeChanged={(viewportSizeChanged)}>
              {finalRenderedContent}
            </ReactResizeSensor>
          : finalRenderedContent
      }
    </div>
  );
}
