/**
 * Base react hook for a virtual text viewer.
 */
import "./VirtualizedMatrixViewer.scss";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useDispatch, useSelector, Provider, batch } from "react-redux";
import * as PIXI from "pixi.js";
import { Stage, AppContext } from "@inlet/react-pixi";

import { VirtualizedViewport } from "./VirtualizedViewportComponent";
import { ReactResizeSensor } from "../ResizeSensorHook";
import {
  store as reduxStore,
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
  RootState as ReduxRootState,
  IVirtualizedMatrixState as ReduxIVirtualizedMatrixState,
} from "../../common/ReduxStore";
import {
  stopSafariFromBlockingWindowWheel,
  generateUUIDv4,
} from "../../common/Utils";
import { VirtualVerticalScrollbar } from "./VirtualVerticalScrollbarHook";
import { VirtualHorizontalScrollbar } from "./VirtualHorizontalScrollbarHook";

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

  //ref
  const ref = useRef<HTMLDivElement>(null);

  //state
  const [mouseHovering, setMouseHovering] = useState<boolean>(false);
  const [screenWidth, setScreenWidth] = useState<number>();
  const [screenHeight, setScreenHeight] = useState<number>();
  const [stateHorizontalReduxId] = useState<string>(
    props.horizontalReduxId ? props.horizontalReduxId : generateUUIDv4()
  );
  const [stateVerticalReduxId] = useState<string>(
    props.verticalReduxId ? props.verticalReduxId : generateUUIDv4()
  );

  //redux stores
  const dispatch = useDispatch();
  const fullStateHorizontal = useSelector(
    (rootState: ReduxRootState) => rootState.virtualizedHorizontalSlice
  );
  const fullStateVertical = useSelector(
    (rootState: ReduxRootState) => rootState.virtualizedVerticalSlice
  );

  const reduxStateHorizontal: ReduxIVirtualizedMatrixState | undefined =
    direction === "all" || direction === "x"
      ? fullStateHorizontal[stateHorizontalReduxId]
      : undefined;
  const reduxStateVertical: ReduxIVirtualizedMatrixState | undefined =
    direction === "all" || direction === "y"
      ? fullStateVertical[stateVerticalReduxId]
      : undefined;


  const viewportSizeChanged = useCallback((bounds) => {
    setScreenHeight(bounds.height);
    setScreenWidth(bounds.width);

    if (direction === "x" || direction === "all") {
      dispatch(
        setReduxScreenWidth({
          id: stateHorizontalReduxId,
          screenWidth: bounds.width,
        })
      );
    }
    if (direction === "y" || direction === "all") {
      dispatch(
        setReduxScreenHeight({
          id: stateVerticalReduxId,
          screenHeight: bounds.height,
        })
      );
    }
  }, []);

  //useEffect
  useEffect(() => {
    PIXI.utils.skipHello();
    PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

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
          id: stateHorizontalReduxId,
          columnWidth: columnWidth,
        })
      );
    }
    if (direction === "y" || direction === "all") {
      dispatch(
        setReduxRowHeight({
          id: stateVerticalReduxId,
          rowHeight: rowHeight,
        })
      );
    }
  }, [
    dispatch,
    direction,
    stateVerticalReduxId,
    stateHorizontalReduxId,
    columnWidth,
    rowHeight,
  ]);

  //set num columns / num rows
  useEffect(() => {
    if (direction === "x" || direction === "all") {
      dispatch(
        setReduxColumnCount({
          id: stateHorizontalReduxId,
          columnCount: columnCount,
        })
      );
    }
    if (direction === "y" || direction === "all") {
      dispatch(
        setReduxRowCount({
          id: stateVerticalReduxId,
          rowCount: rowCount,
        })
      );
    }
  }, [
    dispatch,
    direction,
    stateVerticalReduxId,
    stateHorizontalReduxId,
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

  //redux state can be stale when initializing or switching datasets - these
  //eventually stabilize once useEffect functions are executed and the redux
  //store emits events, but before this can happen make sure the current params
  //match the redux store and if not, render empty data.
  let rowIdxsToRender: number[] =
    reduxStateVertical && reduxStateVertical.cellCount
      ? reduxStateVertical.idxsToRender
      : [0]; //only render the first row - this is required for consensus and query - not good abstractly (TODO)
  let colIdxsToRender: number[] =
    reduxStateHorizontal && reduxStateHorizontal.cellCount
      ? reduxStateHorizontal.idxsToRender
      : [0]; //this really shouldn't ever happen - not a good default abstractly (TODO)

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
  /*
   *
   *
   * RENDER
   *
   *
   */
  return (
    <Provider store={reduxStore}>
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
                {/* virtualized scrolling with the mouse */}
                {/*
                <Stage
                  style={{position: 'absolute', top:0, bottom:0, left:0, right:0}}
                  className="virtualized-viewport-scroller"
                  width={reduxStateHorizontal
                    ? reduxStateHorizontal.renderSize
                    : screenWidth!}
                  height={
                    reduxStateVertical
                      ? reduxStateVertical.renderSize
                      : screenHeight!}
                  raf={false}
                  options={{ antialias: false, transparent: true }}
                >
                  <AppContext.Consumer>
                    {(app) => {
                      return ( reduxStateHorizontal !== undefined || reduxStateVertical !== undefined ?
                        <VirtualizedViewport
                          app={app}
                          parentElement={ref.current!}
                          renderWidth={reduxStateHorizontal
                            ? reduxStateHorizontal.screenSize//renderSize
                            : screenWidth!}
                          renderHeight={reduxStateVertical
                            ? reduxStateVertical.screenSize//renderSize
                            : screenHeight!}
                          worldWidth={reduxStateHorizontal ? reduxStateHorizontal.worldSize : undefined}
                          worldLeftOffset={reduxStateHorizontal ? reduxStateHorizontal.worldOffset : undefined}
                          worldHeight={reduxStateVertical ? reduxStateVertical.worldSize : undefined}
                          worldTopOffset={reduxStateVertical ? reduxStateVertical.worldOffset : undefined }
                          direction={direction}
                          viewportMovedVertically={(newWorldTop: number)=>{
                            dispatch(
                              setReduxWorldTopPixelOffset({
                                id: stateVerticalReduxId,
                                worldTopPixelOffset: newWorldTop,
                              })
                            );
                          }}
                          viewportMovedHorizontally={(newWorldLeft: number)=>{
                            dispatch(
                              setReduxWorldLeftPixelOffset({
                                id: stateHorizontalReduxId,
                                worldLeftPixelOffset: newWorldLeft,
                              })
                            );
                          }}
                        ></VirtualizedViewport> : <></>
                      )
                    }}
                  </AppContext.Consumer>
                </Stage>
                */}

                {/* super simple way of enabling wheel scrolling and monitoring of
                    mouse over events */}
                <div className={'wheel-scroller'} 
                    onMouseOut={() =>{
                      dispatch(
                        setReduxMouseOverY({
                          id: stateVerticalReduxId,
                          mouseViewportOffsetY: undefined,
                        })
                      );
                      dispatch(
                        setReduxMouseOverX({
                          id: stateHorizontalReduxId,
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
                          id: stateVerticalReduxId,
                          mouseViewportOffsetY: viewportY,
                        })
                      );
                      dispatch(
                        setReduxMouseOverX({
                          id: stateHorizontalReduxId,
                          mouseViewportOffsetX: viewportX,
                        })
                      );
                    }}
                    onWheel={(event) => {
                      if (event.deltaX !== 0 && reduxStateHorizontal){
                        dispatch(
                          setReduxWorldLeftPixelOffset({
                            id: stateHorizontalReduxId,
                            worldLeftPixelOffset: reduxStateHorizontal.worldOffset + event.deltaX,
                          })
                        );
                      }
                      if (event.deltaY !== 0 && reduxStateVertical){
                        dispatch(
                          setReduxWorldTopPixelOffset({
                            id: stateVerticalReduxId,
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
                  {getContent(
                    rowIdxsToRender,
                    colIdxsToRender,
                    reduxStateVertical
                      ? reduxStateVertical.scrollingAdditionalOffset
                      : 0,
                    reduxStateHorizontal
                      ? reduxStateHorizontal.scrollingAdditionalOffset
                      : 0,
                    {
                      width: reduxStateHorizontal
                        ? reduxStateHorizontal.renderSize
                        : screenWidth!,
                      height: reduxStateVertical
                        ? reduxStateVertical.renderSize
                        : screenHeight!,
                    }
                  )}
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
                    id: stateVerticalReduxId,
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
                    id: stateHorizontalReduxId,
                    worldLeftPixelOffset: newWorldLeft,
                  })
                );
              }}
            />
          )}
        </ReactResizeSensor>
      </div>
    </Provider>
  );
}
