/**
 * Base react hook for a virtual text viewer.
 */
import "./VirtualizedMatrixViewer.scss";
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import * as PIXI from "pixi.js";

import { IBounds, ReactResizeSensor } from "../ResizeSensorHook";
import {
  toggleSelectedPosition as toggleReduxSelectedPosition,
  toggleSelectedSequence as toggleReduxSelectedSequence,
  setMouseOverX as setReduxMouseOverX,
  setMouseOverY as setReduxMouseOverY,
  setColumnCount as setReduxColumnCount,
  setColumnWidth as setReduxColumnWidth,
  setScreenWidth as setReduxScreenWidth,
  setWorldLeftPixelOffset as setReduxWorldLeftPixelOffset,
  setRowCount as setReduxRowCount,
  setRowHeight as setReduxRowHeight,
  setScreenHeight as setReduxScreenHeight,
  setWorldTopPixelOffset as setReduxWorldTopPixelOffset,
  RootState,
} from "../../common/ReduxStore";
import {
  stopSafariFromBlockingWindowWheel,
} from "../../common/Utils";
import { VirtualVerticalScrollbar } from "./VirtualVerticalScrollbarHook";
import { VirtualHorizontalScrollbar } from "./VirtualHorizontalScrollbarHook";
import { useAppDispatch, useAppSelector } from "../../common/Hooks";

export enum ScrollbarOptions{
  NeverOn, AlwaysOnWhenOverflowed, OnHoverWhenOverflowed
}

//
// Interfaces for the getMatrixContent, getRowContent, getColumnContent that
// clients must implement
//
interface IVirtualizedContentBasics {
  stageDimensions: { width: number; height: number }
}
export interface IVirtualizedRowContents extends IVirtualizedContentBasics {
  colIdxsToRender: number[];
  additionalHorizontalOffset: number;
}
export interface IVirtualizedColumnContents extends IVirtualizedContentBasics {
  rowIdxsToRender: number[];
  additionalVerticalOffset: number;
}
export interface IVirtualizedMatrixContent extends IVirtualizedRowContents, IVirtualizedColumnContents{}

//
// 
//
interface IVirtualizeRowOrColumnParameters {
  reduxId: string;
  scrollbar: ScrollbarOptions;
  autoOffset?: boolean; //default to true
  hoverTracker?: boolean; //default to true
}

//
// Entry points
//
export interface IVirtualizedRowViewer {
  getRowContent(params: IVirtualizedRowContents): JSX.Element;
  horizontalParams: IVirtualizeRowOrColumnParameters;
}
export interface IVirtualizedColumnViewer {
  getColumnContent(params: IVirtualizedColumnContents): JSX.Element;
  verticalParams: IVirtualizeRowOrColumnParameters;
}
export interface IVirtualizedMatrix {
  getMatrixContent(params: IVirtualizedMatrixContent): JSX.Element;
  horizontalParams: IVirtualizeRowOrColumnParameters;
  verticalParams: IVirtualizeRowOrColumnParameters;
}

//
// exported functions for each virtualized viewport - full matrix, x-axis only, y-axis only
//
export function VirtualizedRowViewer(props: IVirtualizedRowViewer) {
  return GenericVirtualizedMatrixViewer({
    getContent: props.getRowContent,
    directionParams: {
      horizontalParams: props.horizontalParams,
    }
  });
}
export function VirtualizedColumnViewer(props: IVirtualizedColumnViewer) {
  return GenericVirtualizedMatrixViewer({
    getContent: props.getColumnContent,
    directionParams: {
      verticalParams: props.verticalParams,
    }
  });
}
export function VirtualizedMatrixViewer(props: IVirtualizedMatrix) {
  return GenericVirtualizedMatrixViewer({
    getContent: props.getMatrixContent,
    directionParams: {
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
    IVirtualizedRowContents | 
    IVirtualizedColumnContents | 
    IVirtualizedMatrixContent
  ): JSX.Element;
  directionParams: {
    horizontalParams?: IVirtualizeRowOrColumnParameters
    verticalParams?: IVirtualizeRowOrColumnParameters
  }
}

function GenericVirtualizedMatrixViewer(props: IVirtualizedMatrixOrRowOrColumn) {
  const {
    getContent
  } = props;
  
  const {
    horizontalParams,
    verticalParams
  } = props.directionParams;

  //ref
  const ref = useRef<HTMLDivElement>(null);

  //state
  const [mouseHovering, setMouseHovering] = useState<boolean>(false);
  const [screenWidth, setScreenWidth] = useState<number>(-1);
  const [screenHeight, setScreenHeight] = useState<number>(-1);

  //redux stores
  const dispatch = useAppDispatch();
  const reduxStateVertical = useAppSelector((state: RootState) => {
    return !verticalParams 
      ? undefined 
      : state.virtualizedVerticalSlice[verticalParams.reduxId]
  });
  const reduxStateHorizontal = useAppSelector((state: RootState) =>{
    return !horizontalParams 
      ? undefined 
      : state.virtualizedHorizontalSlice[horizontalParams.reduxId]
  });
  
  //
  //useCallbacks
  //
  const viewportSizeChanged = useCallback((bounds: IBounds) => {
    setScreenHeight(bounds.height);
    setScreenWidth(bounds.width);

    if (horizontalParams?.reduxId) {
      dispatch(
        setReduxScreenWidth({
          id: horizontalParams.reduxId,
          screenWidth: bounds.width,
        })
      );
    }
    if (verticalParams?.reduxId) {
      dispatch(
        setReduxScreenHeight({
          id: verticalParams?.reduxId,
          screenHeight: bounds.height,
        })
      );
    }
  }, [
    dispatch,
    horizontalParams?.reduxId,
    verticalParams?.reduxId
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
  useEffect(() => {
    if (horizontalParams?.reduxId) {
      dispatch(
        setReduxColumnWidth({
          id: horizontalParams?.reduxId,
          columnWidth: horizontalParams?.columnWidth
        })
      );
    }
    if (verticalParams?.reduxId) {
      dispatch(
        setReduxRowHeight({
          id: verticalParams?.reduxId,
          rowHeight: verticalParams?.rowWidth,
        })
      );
    }
  }, [
    dispatch,
    verticalParams?.reduxId,
    verticalParams?.columnWidth,
    horizontalParams?.reduxId,
    horizontalParams?.rowWidth
  ]);

  //set num columns / num rows
  useEffect(() => {
    if (virtualizeXAxis?.reduxId) {
      dispatch(
        setReduxColumnCount({
          id: virtualizeXAxis?.reduxId,
          columnCount: virtualizeXAxis?.columnCount,
        })
      );
    }
    if (virtualizeYAxis?.reduxId) {
      dispatch(
        setReduxRowCount({
          id: virtualizeYAxis?.reduxId,
          rowCount: virtualizeYAxis?.rowCount,
        })
      );
    }
  }, [
    dispatch,
    virtualizeXAxis?.reduxId,
    virtualizeXAxis?.columnCount,
    virtualizeYAxis?.reduxId,
    virtualizeYAxis?.rowCount,
  ]);

  //misc
  const disableVerticalScrolling =
    !reduxStateVertical || !reduxStateVertical.initialized || verticalScrollbar==='never-on'
      ? true
      : reduxStateVertical.cellCount <= reduxStateVertical.idxsToRender.length;
  const disableHorizontalScrolling =
    !reduxStateHorizontal || !reduxStateHorizontal.initialized || horizontalScrollbar==='never-on'
      ? true
      : reduxStateHorizontal.cellCount <= reduxStateHorizontal.idxsToRender.length;

  const reduxInitialized =
    (!reduxStateVertical &&
     reduxStateHorizontal &&
     reduxStateHorizontal?.initialized) ||
    (!reduxStateHorizontal && 
     reduxStateVertical &&
     reduxStateVertical.initialized) ||
    (reduxStateVertical &&
     reduxStateVertical.initialized &&
     reduxStateHorizontal &&
     reduxStateHorizontal.initialized);

  const scrollbarWidthOrHeight = 12;

  //
  // cache / useMemos
  //
  const reduxOffsets = useMemo(()=>{
    return {
      verticalAdditionalOffset: reduxStateVertical?.scrollingAdditionalOffset
        ? reduxStateVertical.scrollingAdditionalOffset : 0,
      horizontalAdditionalOffset: reduxStateHorizontal?.scrollingAdditionalOffset
        ? reduxStateHorizontal.scrollingAdditionalOffset : 0,
      stageHeight: reduxStateVertical?.renderSize 
        ? reduxStateVertical.renderSize : rowHeight*rowCount,
      stageWidth: reduxStateHorizontal?.renderSize
        ? reduxStateHorizontal?.renderSize : columnWidth*columnCount
    }
  }, [
    reduxStateVertical?.scrollingAdditionalOffset,
    reduxStateVertical?.renderSize,
    reduxStateHorizontal?.scrollingAdditionalOffset, 
    reduxStateHorizontal?.renderSize,
    rowHeight, rowCount,
    columnWidth, columnCount
  ]);

  //
  // load the content requested from the parent
  //
  const contentFromParent = useMemo(() => {
    //redux state can be stale when initializing or switching datasets - these
    //eventually stabilize once useEffect functions are executed and the redux
    //store emits events, but before this can happen make sure the current params
    //match the redux store and if not, render empty data.
    let rowIdxsToRender: number[] = 
      reduxStateVertical?.cellCount
        ? reduxStateVertical.idxsToRender
        : [0]; //only render the first row - this is required for consensus and query - not good abstractly (TODO)
    let colIdxsToRender: number[] =
      reduxStateHorizontal?.cellCount
        ? reduxStateHorizontal.idxsToRender
        : [0]; //this really shouldn't ever happen - not a good default abstractly (TODO)

    return getContent({
      rowIdxsToRender: rowIdxsToRender,
      colIdxsToRender: colIdxsToRender,
      additionalVerticalOffset: reduxOffsets.verticalAdditionalOffset,
      additionalHorizontalOffset: reduxOffsets.horizontalAdditionalOffset,
      stageDimensions: {
        width: reduxOffsets.stageWidth,
        height: reduxOffsets.stageHeight
      }
    });
  }, [
    getContent,
    reduxOffsets,
    reduxStateVertical?.cellCount,
    reduxStateVertical?.idxsToRender,
    reduxStateHorizontal?.cellCount,
    reduxStateHorizontal?.idxsToRender,
  ]);

  const horizontalSelectedRender = useMemo(()=>{
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
  }, [reduxStateVertical?.selected]);

  const verticalScrollbarRender = useMemo(()=>{
    return disableVerticalScrolling ? undefined : (
      <VirtualVerticalScrollbar
        visible={
          verticalScrollbar===ScrollbarOptions.AlwaysOnWhenOverflowed || 
          (verticalScrollbar===ScrollbarOptions.OnHoverWhenOverflowed && mouseHovering)
        }
        width={scrollbarWidthOrHeight}
        horizontalScrollbarHeight={
          !disableHorizontalScrolling ? scrollbarWidthOrHeight : 0
        }
        worldHeight={reduxStateVertical!.worldSize}
        worldTopOffset={reduxStateVertical!.worldOffset}
        scrollbarMoved={(newWorldTop) => {
          if (verticalReduxId){
            dispatch(
              setReduxWorldTopPixelOffset({
                id: verticalReduxId,
                worldTopPixelOffset: newWorldTop,
              })
            );
          }
        }}
      />
    );
  }, [
    verticalScrollbar, 
    disableHorizontalScrolling, 
    disableVerticalScrolling,
    dispatch,
    mouseHovering,
    reduxStateVertical,
    verticalReduxId
  ]);

  const horizontalScrollbarRender = useMemo(()=>{
    return disableHorizontalScrolling ? undefined : (
      <VirtualHorizontalScrollbar
        visible={
          horizontalScrollbar===ScrollbarOptions.AlwaysOnWhenOverflowed || 
          (horizontalScrollbar===ScrollbarOptions.OnHoverWhenOverflowed && mouseHovering)
        }
        height={scrollbarWidthOrHeight}
        verticalScrollbarWidth={
          !disableVerticalScrolling ? scrollbarWidthOrHeight : 0
        }
        worldWidth={reduxStateHorizontal!.worldSize}
        worldLeftOffset={reduxStateHorizontal!.worldOffset}
        scrollbarMoved={(newWorldLeft) => {
          if (horizontalReduxId){
            dispatch(
              setReduxWorldLeftPixelOffset({
                id: horizontalReduxId,
                worldLeftPixelOffset: newWorldLeft,
              })
            );
          }
        }}
      />
    )
  }, [
    disableHorizontalScrolling,
    disableVerticalScrolling,
    dispatch,
    horizontalReduxId,
    horizontalScrollbar,
    mouseHovering,
    reduxStateHorizontal, 
  ]);
  
  const handleWheelFn = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    if (event.deltaX !== 0 && reduxStateHorizontal && horizontalReduxId){
      dispatch(
        setReduxWorldLeftPixelOffset({
          id: horizontalReduxId,
          worldLeftPixelOffset: reduxStateHorizontal.worldOffset + event.deltaX,
        })
      );
    }
    if (event.deltaY !== 0 && reduxStateVertical && verticalReduxId){
      dispatch(
        setReduxWorldTopPixelOffset({
          id: verticalReduxId,
          worldTopPixelOffset: reduxStateVertical.worldOffset + event.deltaY,
        })
      );
    }
  }, [
    dispatch,
    horizontalReduxId,
    reduxStateHorizontal, 
    reduxStateVertical,
    verticalReduxId
  ]);



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

      <ReactResizeSensor onSizeChanged={(viewportSizeChanged)}>
        <div className="av2-virtualized-matrix" ref={ref}>
          { !reduxInitialized ||
            //!ref ||
            screenWidth === undefined ||
            screenHeight === undefined ? null : (
              // simple way of enabling wheel scrolling and monitoring of
              // mouse over events 
              <div 
                className={'av2-wheel-scroller'} 
                onClick={handleClickFn}
                onMouseOut={handleMouseoutFn}
                onMouseMove={handleMousemoveFn}
                onWheel={handleWheelFn}
              >
                <div className="hover-tracker-y" style={
                  !reduxStateVertical || !reduxStateVertical.mouseMove || suppressVerticalHoverTracker
                    ? {display: "none"}
                    : {
                        position: "absolute",
                        zIndex: 1000,

                        left: -4, //1/2 the width
                        top: reduxStateVertical.mouseMove.hoverIdxScreenMin
                              + .5*reduxStateVertical.cellPixelSize
                              - 4, // 1/2 the height
                        width:8, height:8, 
                        borderRadius: "50%",
                        backgroundColor:"red"
                      }
                  }
                ></div>

                <div className="hover-tracker-x" style={
                  !reduxStateHorizontal || !reduxStateHorizontal.mouseMove || suppressHorizontalHoverTracker 
                    ? {display: "none"} 
                    : {
                        position: "absolute",
                        zIndex: 1000,

                        top: -4, //1/2 the height
                        left: reduxStateHorizontal.mouseMove.hoverIdxScreenMin
                              + .5*reduxStateHorizontal.cellPixelSize
                              - 4, // 1/2 the width
                        width:8, height:8, 
                        borderRadius: "50%",
                        backgroundColor:"red"
                      }
                  }
                ></div>

                <div
                  className="av2-data"
                  style={{
                    top: autoOffset
                      ? reduxStateVertical
                        ? reduxStateVertical.scrollingAdditionalOffset
                        : undefined
                      : undefined,
                    left: autoOffset
                      ? reduxStateHorizontal
                        ? reduxStateHorizontal.scrollingAdditionalOffset
                        : undefined
                      : undefined,
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
      </ReactResizeSensor>
    </div>
  );
}
