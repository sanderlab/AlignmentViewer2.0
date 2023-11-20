/**
 * Base react hook for a virtual text viewer.
 */
import "./VirtualizedMatrixViewer.scss";
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import * as PIXI from "pixi.js";

import { ReactResizeSensor } from "../ResizeSensorHook";
import {
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
  generateUUIDv4,
} from "../../common/Utils";
import { VirtualVerticalScrollbar } from "./VirtualVerticalScrollbarHook";
import { VirtualHorizontalScrollbar } from "./VirtualHorizontalScrollbarHook";
import { useAppDispatch, useAppSelector } from "../../common/Hooks";

interface IVirtualizedMatrixiewerProps {
  getContent(
    rowIdxsToRender: number[],
    colIdxsToRender: number[],
    additionalVerticalOffset: number,
    additionalHorizontalOffset: number,
    stageDimensions: { width: number; height: number }
  ): JSX.Element;
  columnCount: number;
  rowCount: number;
  columnWidth: number;
  rowHeight: number;
  autoOffset: boolean;
  direction: "all" | "x" | "y";
  horizontalReduxId?: string;
  verticalReduxId?: string;
  suppressHorizontalScrollbar?: boolean;
  suppressVerticalScrollbar?: boolean;
}

export function VirtualizedMatrixViewer(props: IVirtualizedMatrixiewerProps) {
  const {
    autoOffset,
    direction,
    getContent,
    columnCount,
    rowCount,
    columnWidth,
    rowHeight,
    suppressHorizontalScrollbar,
    suppressVerticalScrollbar
  } = props;

  const {
    horizontalReduxId = generateUUIDv4(),
    verticalReduxId = generateUUIDv4(),
  } = props;

  //ref
  const ref = useRef<HTMLDivElement>(null);

  //state
  const [mouseHovering, setMouseHovering] = useState<boolean>(false);
  const [screenWidth, setScreenWidth] = useState<number>(-1);
  const [screenHeight, setScreenHeight] = useState<number>(-1);

  //redux stores
  const dispatch = useAppDispatch();
  const reduxStateVertical = useAppSelector((state: RootState) =>
    state.virtualizedVerticalSlice[verticalReduxId]
  );
  const reduxStateHorizontal = useAppSelector((state: RootState) =>
    state.virtualizedHorizontalSlice[horizontalReduxId]
  );

  //
  //useCallbacks
  //
  const viewportSizeChanged = useCallback((bounds) => {
    setScreenHeight(bounds.height);
    setScreenWidth(bounds.width);

    if (direction === "x" || direction === "all") {
      dispatch(
        setReduxScreenWidth({
          id: horizontalReduxId,
          screenWidth: bounds.width,
        })
      );
    }
    if (direction === "y" || direction === "all") {
      dispatch(
        setReduxScreenHeight({
          id: verticalReduxId,
          screenHeight: bounds.height,
        })
      );
    }
  }, [
    direction, 
    dispatch, 
    horizontalReduxId,  
    verticalReduxId
  ]);

  //
  //useEffects
  //
  useEffect(() => {
    PIXI.settings.RENDER_OPTIONS!.hello = false;
    PIXI.BaseTexture.defaultOptions.scaleMode = PIXI.SCALE_MODES.NEAREST;

    //fix safari-specific bug - this function will tell the window to stop
    //blocking scroll events on the "single-sequence-text" class
    stopSafariFromBlockingWindowWheel("virtualized-matrix");
    stopSafariFromBlockingWindowWheel("hidden-residues-for-copy-paste");
  }, []);

  //set row and column height in pixels
  useEffect(() => {
    if (direction === "x" || direction === "all") {
      dispatch(
        setReduxColumnWidth({
          id: horizontalReduxId,
          columnWidth: columnWidth,
        })
      );
    }
    if (direction === "y" || direction === "all") {
      dispatch(
        setReduxRowHeight({
          id: verticalReduxId,
          rowHeight: rowHeight,
        })
      );
    }
  }, [
    dispatch,
    direction,
    verticalReduxId,
    horizontalReduxId,
    columnWidth,
    rowHeight,
  ]);

  //set num columns / num rows
  useEffect(() => {
    if ((direction === "x" || direction === "all")) {
      dispatch(
        setReduxColumnCount({
          id: horizontalReduxId,
          columnCount: columnCount,
        })
      );
    }
    if ((direction === "y" || direction === "all")) {
      dispatch(
        setReduxRowCount({
          id: verticalReduxId,
          rowCount: rowCount,
        })
      );
    }
  }, [
    dispatch,
    direction,
    verticalReduxId,
    horizontalReduxId,
    rowCount,
    columnCount,
  ]);

  //misc
  const disableVerticalScrolling =
    !reduxStateVertical || !reduxStateVertical.initialized || suppressVerticalScrollbar
      ? true
      : rowCount <= reduxStateVertical.idxsToRender.length;
  const disableHorizontalScrolling =
    !reduxStateHorizontal || !reduxStateHorizontal.initialized || suppressHorizontalScrollbar
      ? true
      : columnCount <= reduxStateHorizontal.idxsToRender.length;

  const reduxInitialized =
    (direction === "x" &&
      reduxStateHorizontal &&
      reduxStateHorizontal.initialized) ||
    (direction === "y" &&
      reduxStateVertical &&
      reduxStateVertical.initialized) ||
    (direction === "all" &&
      reduxStateVertical &&
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
        ? reduxStateVertical.renderSize : screenHeight,
      stageWidth: reduxStateHorizontal?.renderSize
        ? reduxStateHorizontal?.renderSize : screenWidth
    }
  }, [
    reduxStateVertical?.scrollingAdditionalOffset,
    reduxStateVertical?.renderSize,
    reduxStateHorizontal?.scrollingAdditionalOffset, 
    reduxStateHorizontal?.renderSize,
    screenHeight,
    screenWidth
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
        
    return getContent(
      rowIdxsToRender,
      colIdxsToRender,
      reduxOffsets.verticalAdditionalOffset,
      reduxOffsets.horizontalAdditionalOffset,
      {
        width: reduxOffsets.stageWidth,
        height: reduxOffsets.stageHeight
      }
    );
  }, [
    getContent,
    reduxOffsets,
    reduxStateVertical?.cellCount,
    reduxStateVertical?.idxsToRender,
    reduxStateHorizontal?.cellCount,
    reduxStateHorizontal?.idxsToRender,
  ]);

  /*
   *
   *
   * RENDER
   *
   *
   */
  return (
    <div
      onMouseEnter={() => {
        setMouseHovering(true);
      }}
      onMouseLeave={() => {
        setMouseHovering(false);
      }}
    >
      <ReactResizeSensor onSizeChanged={viewportSizeChanged}>
        <div className="virtualized-matrix" ref={ref}>
          {!reduxInitialized ||
            !ref ||
            screenWidth === undefined ||
            screenHeight === undefined ? null : (
            <>
              {
                // super simple way of enabling wheel scrolling and monitoring of
                // mouse over events 
              }
              <div className={'wheel-scroller'} 
                  onMouseOut={() =>{
                    dispatch(
                      setReduxMouseOverY({
                        id: verticalReduxId,
                        mouseViewportOffsetY: undefined,
                      })
                    );
                    dispatch(
                      setReduxMouseOverX({
                        id: horizontalReduxId,
                        mouseViewportOffsetX: undefined,
                      })
                    );
                  }}
                  onMouseMove={(event) => {
                    const bounds = event.currentTarget.getBoundingClientRect();
                    const viewportX = event.clientX - bounds.left < 0 ? 0 : event.clientX - bounds.left;
                    const viewportY = event.clientY - bounds.top < 0 ? 0 : event.clientY - bounds.top;

                    dispatch(
                      setReduxMouseOverY({
                        id: verticalReduxId,
                        mouseViewportOffsetY: viewportY,
                      })
                    );
                    dispatch(
                      setReduxMouseOverX({
                        id: horizontalReduxId,
                        mouseViewportOffsetX: viewportX,
                      })
                    );
                  }}
                  onWheel={(event) => {
                    if (event.deltaX !== 0 && reduxStateHorizontal){
                      dispatch(
                        setReduxWorldLeftPixelOffset({
                          id: horizontalReduxId,
                          worldLeftPixelOffset: reduxStateHorizontal.worldOffset + event.deltaX,
                        })
                      );
                    }
                    if (event.deltaY !== 0 && reduxStateVertical){
                      dispatch(
                        setReduxWorldTopPixelOffset({
                          id: verticalReduxId,
                          worldTopPixelOffset: reduxStateVertical.worldOffset + event.deltaY,
                        })
                      );
                    }
                  }}
              >
                <div className="hover-tracker-y" style={!reduxStateVertical || !reduxStateVertical.mouseMove ? 
                  {display: "none"} : {
                    position: "absolute",
                    zIndex: 1000,

                    left: -4, //1/2 the width
                    top: reduxStateVertical.mouseMove.hoverIdxScreenMin
                          + .5*reduxStateVertical.cellPixelSize
                          - 4, // 1/2 the height
                    width:8, height:8, 
                    borderRadius: "50%",
                    backgroundColor:"red"

                    /*border: "solid red 1px",
                    top: reduxStateVertical.mouseMove.hoverIdxScreenMin-1, 
                    bottom: 0,
                    left:0, 
                    right:0,
                    height: reduxStateVertical.cellPixelSize, */
                  }}
                ></div>

                <div className="hover-tracker-x" style={!reduxStateHorizontal || !reduxStateHorizontal.mouseMove ? 
                  {display: "none"} : {
                    position: "absolute",
                    zIndex: 1000,

                    top: -4, //1/2 the height
                    left: reduxStateHorizontal.mouseMove.hoverIdxScreenMin
                          + .5*reduxStateHorizontal.cellPixelSize
                          - 4, // 1/2 the width
                    width:8, height:8, 
                    borderRadius: "50%",
                    backgroundColor:"red"

                    /*
                    border: "solid red 1px",
                    top: 0,
                    bottom: 0,
                    left: reduxStateHorizontal.mouseMove.hoverIdxScreenMin-1, 
                    //right: reduxStateHorizontal.mouseMove.hoverIdxScreenMax,
                    width: reduxStateHorizontal.cellPixelSize, 
                    //borderRadius: "50%",
                    //backgroundColor:"red"*/
                  }}
                ></div>

              </div>

              <div
                className="data"
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
            </>
          )}
        </div>

        {disableVerticalScrolling ? null : (
          <VirtualVerticalScrollbar
            visible={mouseHovering}
            width={scrollbarWidthOrHeight}
            horizontalScrollbarHeight={
              !disableHorizontalScrolling ? scrollbarWidthOrHeight : 0
            }
            worldHeight={reduxStateVertical!.worldSize}
            worldTopOffset={reduxStateVertical!.worldOffset}
            scrollbarMoved={(newWorldTop) => {
              dispatch(
                setReduxWorldTopPixelOffset({
                  id: verticalReduxId,
                  worldTopPixelOffset: newWorldTop,
                })
              );
            }}
          />
        )}

        {disableHorizontalScrolling ? null : (
          <VirtualHorizontalScrollbar
            visible={mouseHovering}
            height={scrollbarWidthOrHeight}
            verticalScrollbarWidth={
              !disableVerticalScrolling ? scrollbarWidthOrHeight : 0
            }
            worldWidth={reduxStateHorizontal!.worldSize}
            worldLeftOffset={reduxStateHorizontal!.worldOffset}
            scrollbarMoved={(newWorldLeft) => {
              dispatch(
                setReduxWorldLeftPixelOffset({
                  id: horizontalReduxId,
                  worldLeftPixelOffset: newWorldLeft,
                })
              );
            }}
          />
        )}
      </ReactResizeSensor>
    </div>
  );
}
