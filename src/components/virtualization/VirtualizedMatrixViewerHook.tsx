/**
 * Base react hook for a virtual text viewer.
 */
import styles from "./VirtualizedMatrixViewer.scss";
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import * as PIXI from "pixi.js";

import { IBounds, ReactResizeSensor } from "../ResizeSensorHook";
import { generateUUIDv4 } from "../../common/Utils";
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
import { VirtualScrollbar } from "./VirtualScrollbarHook";


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
  const scrollbarMinWidthOrHeight = 25;

  //ref
  const ref = useRef<HTMLDivElement>(null);

  //state
  const [mouseHovering, setMouseHovering] = useState<boolean>(false);
  const [containerBounds, setCountainerBounds] = useState<IBounds | undefined>(undefined);
  const [containerUniqueId] = useState<string>(generateUUIDv4());

  //virtualization initialization
  const horizVirtualizationAxis = useReduxVirtualization(
    horizParams,
    containerUniqueId,
    containerBounds?.width
  );
  const vertVirtualizationAxis = useReduxVirtualization(
    vertParams,
    containerUniqueId,
    containerBounds?.height
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
    //stopSafariFromBlockingWindowWheel("av2-virtualized-matrix");
    //stopSafariFromBlockingWindowWheel("av2-wheel-scroller");
    //stopSafariFromBlockingWindowWheel("hidden-residues-for-copy-paste");
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
      : vertVirtualizationAxis.containerSizePx >= vertVirtualizationAxis.worldRenderSizePx;
  const disableHorizontalScrolling =
    !horizVirtualizationAxis || horizParams?.scrollbar===ScrollbarOptions.NeverOn
      ? true
      : horizVirtualizationAxis.containerSizePx >= horizVirtualizationAxis.worldRenderSizePx;
      
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
          <VirtualScrollbar
            direction="vertical"
            visible={
              vertParams?.scrollbar===ScrollbarOptions.AlwaysOnWhenOverflowed || 
              (vertParams?.scrollbar===ScrollbarOptions.OnHoverWhenOverflowed && mouseHovering)
            }
            oppositeScrollbarFixedDimSize={
              !disableHorizontalScrolling ? scrollbarWidthOrHeight : 0
            }
            draggerFixedDimSize={scrollbarWidthOrHeight}
            draggerVarDimMinSize={scrollbarMinWidthOrHeight}
            
            worldSize={vertVirtualizationAxis.worldRenderSizePx}
            worldOffset={vertVirtualizationAxis.worldOffsetPx}
            scrollbarMoved={(newWorldLeft) => {
              vertSetWorldOffsetPx(newWorldLeft);
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
          <VirtualScrollbar
            direction="horizontal"
            visible={
              horizParams?.scrollbar===ScrollbarOptions.AlwaysOnWhenOverflowed || 
              (horizParams?.scrollbar===ScrollbarOptions.OnHoverWhenOverflowed && mouseHovering)
            }
            oppositeScrollbarFixedDimSize={
              !disableVerticalScrolling ? scrollbarWidthOrHeight : 0
            }
            draggerFixedDimSize={scrollbarWidthOrHeight}
            draggerVarDimMinSize={scrollbarMinWidthOrHeight}
            
            worldSize={horizVirtualizationAxis.worldRenderSizePx}
            worldOffset={horizVirtualizationAxis.worldOffsetPx}
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

  const renderedHoverContent = useMemo(()=>{
    if(!containerBounds) { return undefined; }
    const hoverTrackerSize = +styles.hoverTrackerSize; //needs to also be managed in css
    
    const showYRight = vertVirtualizationAxis?.hoveredEvent && (
      vertParams?.hoverTracker === "start" || vertParams?.hoverTracker === "both"
    );
    const showYLeft = vertVirtualizationAxis?.hoveredEvent && (
      vertParams?.hoverTracker === "end" || vertParams?.hoverTracker === "both"
    );
    const showXDown = horizVirtualizationAxis?.hoveredEvent && (
      horizParams?.hoverTracker === "start" || horizParams?.hoverTracker === "both"
    );
    const showXUp = horizVirtualizationAxis?.hoveredEvent && (
      horizParams?.hoverTracker === "end" || horizParams?.hoverTracker === "both"
    );

    return (
      <>
        {!vertParams?.hoverTracker ? undefined : 
          <React.Fragment key={'vert'}>
            <div className="hover-tracker-y triangle-right" style={{
              left: containerBounds.getLiveLeft() - hoverTrackerSize,
              top: containerBounds.getLiveTop()
                  + (vertVirtualizationAxis?.hoveredEvent ? vertVirtualizationAxis.hoveredEvent.containerOffsetCellMiddlePx : 0)
                  - (hoverTrackerSize/2), //half the height
              display: showYRight ? "block" : "none"
            }}/>
            <div className="hover-tracker-y triangle-left" style={{
              left: containerBounds.getLiveLeft() + containerBounds.width,
              top: containerBounds.getLiveTop()
                  + (vertVirtualizationAxis?.hoveredEvent ? vertVirtualizationAxis.hoveredEvent.containerOffsetCellMiddlePx : 0)
                  - (hoverTrackerSize/2), //half the height
              display: showYLeft ? "block" : "none"
            }}/>
          </React.Fragment>
        }
        {!horizParams?.hoverTracker ? undefined : 
          <React.Fragment key={'horiz'}>
            <div className="hover-tracker-x triangle-down" style={{
              top: containerBounds.getLiveTop() - hoverTrackerSize,
              left: containerBounds.getLiveLeft()
                    + (horizVirtualizationAxis?.hoveredEvent ? horizVirtualizationAxis.hoveredEvent.containerOffsetCellMiddlePx : 0)
                    - (hoverTrackerSize/2), // 1/2 the width
              display: showXDown ? "block" : "none"
            }}/>

            <div className="hover-tracker-x triangle-up" style={{
              top: containerBounds.getLiveTop() + containerBounds.height,
              left: containerBounds.getLiveLeft()
                    + (horizVirtualizationAxis?.hoveredEvent ? horizVirtualizationAxis.hoveredEvent.containerOffsetCellMiddlePx : 0)
                    - (hoverTrackerSize/2), // 1/2 the width
              display: showXUp ? "block" : "none"
            }}/>
          </React.Fragment>
        }
      </>
    );
    /*return (
      <>
        {!vertVirtualizationAxis?.hoveredEvent ? undefined : 
          <>
            {vertParams?.hoverTracker !== "start" && vertParams?.hoverTracker !== "both" ? undefined :
              <div className="hover-tracker-y triangle-right" style={{
                left: containerBounds.getLiveLeft() - hoverTrackerSize,
                top: containerBounds.getLiveTop()
                    + vertVirtualizationAxis.hoveredEvent.containerOffsetCellMiddlePx
                    - (hoverTrackerSize/2), //half the height
            }}/>}

            {vertParams?.hoverTracker !== "end" && vertParams?.hoverTracker !== "both" ? undefined :
              <div className="hover-tracker-y triangle-left" style={{
                left: containerBounds.getLiveLeft() + containerBounds.width,
                top: containerBounds.getLiveTop()
                    + vertVirtualizationAxis.hoveredEvent.containerOffsetCellMiddlePx
                    - (hoverTrackerSize/2), //half the height
              }}/>}
          </>
        }


        {!horizVirtualizationAxis?.hoveredEvent ? undefined : 
          <>
            {horizParams?.hoverTracker !== "start" && horizParams?.hoverTracker !== "both" ? undefined :
              <div className="hover-tracker-x triangle-down" style={{
                top: containerBounds.getLiveTop() - hoverTrackerSize,
                left: containerBounds.getLiveLeft()
                      + horizVirtualizationAxis.hoveredEvent.containerOffsetCellMiddlePx
                      - (hoverTrackerSize/2), // 1/2 the width
            }}/>}

            {horizParams?.hoverTracker !== "end" && horizParams?.hoverTracker !== "both" ? undefined :
              <div className="hover-tracker-x triangle-up" style={{
                top: containerBounds.getLiveTop() + containerBounds.height,
                left: containerBounds.getLiveLeft()
                      + horizVirtualizationAxis.hoveredEvent.containerOffsetCellMiddlePx
                      - (hoverTrackerSize/2), // 1/2 the width
              }}/>}
          </>
        }
      </>
    );*/
  }, [
    containerBounds,
    horizParams?.hoverTracker,
    horizVirtualizationAxis?.hoveredEvent,
    vertParams?.hoverTracker,
    vertVirtualizationAxis?.hoveredEvent,
  ]);

  const [
    leftShadowIndicator, 
    topShadowIndicator, 
    bottomShadowIndicator, 
    rightShadowIndicator
  ] = useMemo(()=>{
    const leftShadow = !horizVirtualizationAxis?.worldOffsetPx 
      ? undefined : "17px 0 16px -16px rgba(0, 0, 0, 0.4) inset";
    const topShadow = !vertVirtualizationAxis?.worldOffsetPx 
      ? undefined : "0 17px 16px -16px rgba(0, 0, 0, 0.4) inset";
    const bottomShadow = (
      !vertVirtualizationAxis?.worldRenderSizePx ||
      vertVirtualizationAxis.worldRenderSizePx <=
        vertVirtualizationAxis.worldOffsetPx + vertVirtualizationAxis.containerSizePx
    ) ? undefined : "0 -17px 16px -16px rgba(0, 0, 0, 0.4) inset";

    const rightShadow = (
      !horizVirtualizationAxis?.worldRenderSizePx ||
      horizVirtualizationAxis.worldRenderSizePx <=
        horizVirtualizationAxis.worldOffsetPx + horizVirtualizationAxis.containerSizePx
    ) ? undefined : "-17px 0 16px -16px rgba(0, 0, 0, 0.4) inset";

    return [leftShadow, topShadow, bottomShadow, rightShadow];
  }, [
    horizVirtualizationAxis?.worldOffsetPx,
    horizVirtualizationAxis?.worldRenderSizePx,
    horizVirtualizationAxis?.containerSizePx,
    vertVirtualizationAxis?.worldOffsetPx,
    vertVirtualizationAxis?.worldRenderSizePx,
    vertVirtualizationAxis?.containerSizePx,
  ]);

  const finalRenderedContent = useMemo(()=>{
    
    return (
      <>
        <div className="av2-virtualized-matrix" ref={ref} style={{
          overflowX: horizParams?.overflowVisible ? "visible" : "clip",
          overflowY: vertParams?.overflowVisible ? "visible" : "clip",
        }}>
          {!leftShadowIndicator ? undefined :
           <div className="scrolled-indicator left" style={{ 
            boxShadow: leftShadowIndicator, 
            ...horizParams?.startScrolledIndicatorStyleAttr}}></div>}
          {!rightShadowIndicator ? undefined :
           <div className="scrolled-indicator right" style={{ 
            boxShadow: rightShadowIndicator,
            ...horizParams?.endScrolledIndicatorStyleAttr}}></div>}
          {!topShadowIndicator ? undefined : 
           <div className="scrolled-indicator top" style={{ 
            boxShadow: topShadowIndicator,
            ...vertParams?.startScrolledIndicatorStyleAttr}}></div>}
          {!bottomShadowIndicator ? undefined :
            <div className="scrolled-indicator bottom" style={{ 
            boxShadow: bottomShadowIndicator,
            ...vertParams?.endScrolledIndicatorStyleAttr}}></div>}
          
          { !reduxInitialized || !ref //TODO: one area where we reinitialize stage
              ? (undefined) 
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
                  {renderedHoverContent}

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
    contentFromParent, 
    handleMousemoveFn,
    handleMouseoutFn,
    handleWheelFn, 
    horizVirtualizationAxis?.offsetForRenderingIdxsOnly,
    horizVirtualizationAxis?.worldOffsetPx,
    horizParams?.overflowVisible,
    horizParams?.virtualizationStrategy,
    horizontalScrollbarRender, 
    reduxInitialized,
    renderedHoverContent,
    verticalScrollbarRender,
    vertParams?.overflowVisible,
    vertParams?.virtualizationStrategy,
    vertVirtualizationAxis?.offsetForRenderingIdxsOnly,
    vertVirtualizationAxis?.worldOffsetPx,


    leftShadowIndicator, 
    topShadowIndicator, 
    bottomShadowIndicator, 
    rightShadowIndicator,
    horizParams?.startScrolledIndicatorStyleAttr,
    horizParams?.endScrolledIndicatorStyleAttr,
    vertParams?.startScrolledIndicatorStyleAttr,
    vertParams?.endScrolledIndicatorStyleAttr,
    
  ]);

  //
  //
  //
  // RENDER
  //
  //
  //
  /*const resizeSensor = useMemo(()=>{
    return (
      <ReactResizeSensor onSizeChanged={viewportSizeChanged}/>
    )
  }, [viewportSizeChanged]);*/
  return (
    <div className="virtualized-matrix-viewer"
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
        <ReactResizeSensor onSizeChanged={viewportSizeChanged} logId="virtualized-matrix"/>
      }
      {finalRenderedContent}
    </div>
  );
}
