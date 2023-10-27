/**
 * Base react hook for a virtual text viewer.
 */
import "./VirtualizedMatrixViewer.scss";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useDispatch, useSelector, Provider } from "react-redux";
import * as PIXI from "pixi.js";
import { Stage, AppContext } from "@inlet/react-pixi";

import { VirtualizedViewport } from "./VirtualizedViewportComponent";
import { ReactResizeSensor } from "../ResizeSensorHook";
import {
  store,
  setColumnCount,
  setColumnWidth,
  setScreenWidth as setReduxScreenWidth,
  setWorldLeftPixelOffset,
  setRowCount,
  setRowHeight,
  setScreenHeight as setReduxScreenHeight,
  setWorldTopPixelOffset,
  RootState,
  IVirtualizedMatrixState,
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
  app?: PIXI.Application;
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
    app,
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
  const [horizontalReduxId] = useState<string>(
    props.horizontalReduxId ? props.horizontalReduxId : generateUUIDv4()
  );
  const [verticalReduxId] = useState<string>(
    props.verticalReduxId ? props.verticalReduxId : generateUUIDv4()
  );

  //redux stores
  const dispatch = useDispatch();
  const fullStateHorizontal = useSelector(
    (rootState: RootState) => rootState.virtualizedHorizontalSlice
  );
  const fullStateVertical = useSelector(
    (rootState: RootState) => rootState.virtualizedVerticalSlice
  );

  const reduxStateHorizontal: IVirtualizedMatrixState | undefined =
    direction === "all" || direction === "x"
      ? fullStateHorizontal[horizontalReduxId]
      : undefined;
  const reduxStateVertical: IVirtualizedMatrixState | undefined =
    direction === "all" || direction === "y"
      ? fullStateVertical[verticalReduxId]
      : undefined;

  //callbacks
  const viewportVerticalMove = useCallback(
    (newWorldTop: number) => {
      dispatch(
        setWorldTopPixelOffset({
          id: verticalReduxId,
          worldTopPixelOffset: newWorldTop,
        })
      );
    },
    [dispatch, verticalReduxId]
  );

  const viewportHorizontalMove = useCallback(
    (newWorldLeft) => {
      dispatch(
        setWorldLeftPixelOffset({
          id: horizontalReduxId,
          worldLeftPixelOffset: newWorldLeft,
        })
      );
    },
    [dispatch, horizontalReduxId]
  );

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
        setColumnWidth({
          id: horizontalReduxId,
          columnWidth: columnWidth,
        })
      );
    }
    if (direction === "y" || direction === "all") {
      dispatch(
        setRowHeight({
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
    if (direction === "x" || direction === "all") {
      dispatch(
        setColumnCount({
          id: horizontalReduxId,
          columnCount: columnCount,
        })
      );
    }
    if (direction === "y" || direction === "all") {
      dispatch(
        setRowCount({
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

  //redux state can be stale when initializing or switching datasets - these
  //eventually stabilize once useEffect functions are executed and the redux
  //store emits events, but before this can happen make sure the current params
  //match the redux store and if not, render empty data.
  let rowIdxsToRender: number[] =
    reduxStateVertical && reduxStateVertical.cellCount
      ? reduxStateVertical.idxsToRender
      : [0];
  let colIdxsToRender: number[] =
    reduxStateHorizontal && reduxStateHorizontal.cellCount
      ? reduxStateHorizontal.idxsToRender
      : [0];

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

  //console.log(
  //  'reduxStateHorizontal [size: '+ 
  //  (reduxStateHorizontal ? reduxStateHorizontal.worldSize : reduxStateHorizontal) + 
  //  '] : ' + (reduxStateHorizontal ? reduxStateHorizontal.worldOffset : reduxStateHorizontal)
  //);
  //console.log('reduxStateVertical', reduxStateVertical)

  /*
   *
   *
   * RENDER
   *
   *
   */
  return (
    <Provider store={store}>
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
                          screenWidth={reduxStateHorizontal
                            ? reduxStateHorizontal.renderSize
                            : screenWidth!}
                          screenHeight={reduxStateVertical
                            ? reduxStateVertical.renderSize
                            : screenHeight!}
                          worldWidth={reduxStateHorizontal ? reduxStateHorizontal.worldSize : undefined}
                          worldLeftOffset={reduxStateHorizontal ? reduxStateHorizontal.worldOffset : undefined}
                          worldHeight={reduxStateVertical ? reduxStateVertical.worldSize : undefined}
                          worldTopOffset={reduxStateVertical ? reduxStateVertical.worldOffset : undefined }
                          direction={direction}
                          viewportMovedVertically={(newWorldTop: number)=>{
                            dispatch(
                              setWorldTopPixelOffset({
                                id: verticalReduxId,
                                worldTopPixelOffset: newWorldTop,
                              })
                            );
                          }}
                          viewportMovedHorizontally={(newWorldLeft: number)=>{
                            dispatch(
                              setWorldLeftPixelOffset({
                                id: horizontalReduxId,
                                worldLeftPixelOffset: newWorldLeft,
                              })
                            );
                          }}
                        ></VirtualizedViewport> : <></>
                      )
                    }}
                  </AppContext.Consumer>
                </Stage>
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
              worldHeight={reduxStateVertical!.worldSize}
              worldTopOffset={reduxStateVertical!.worldOffset}
              scrollbarMoved={(newWorldTop) => {
                dispatch(
                  setWorldTopPixelOffset({
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
              worldWidth={reduxStateHorizontal!.worldSize}
              worldLeftOffset={reduxStateHorizontal!.worldOffset}
              scrollbarMoved={(newWorldLeft) => {
                dispatch(
                  setWorldLeftPixelOffset({
                    id: horizontalReduxId,
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
