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
    !reduxStateVertical || !reduxStateVertical.initialized
      ? true
      : rowCount <= reduxStateVertical.idxsToRender.length;
  const disableHorizontalScrolling =
    !reduxStateHorizontal || !reduxStateHorizontal.initialized
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
                        : screenWidth,
                      height: reduxStateVertical
                        ? reduxStateVertical.renderSize
                        : screenHeight,
                    }
                  )}
                </div>

                <Stage
                  className="interaction-viewport stage"
                  width={screenWidth}
                  height={screenHeight}
                  raf={false}
                  options={{ transparent: true }}
                >
                  <AppContext.Consumer>
                    {(app) => (
                      //entrypoint to the interaction viewport for registering scroll
                      //and zoom and other events. This is not rendering anything, but
                      //is used to calculate interaction changes and report them
                      //back to this component.
                      <Provider store={store}>
                        <VirtualizedViewport
                          app={app}
                          parentElement={ref.current!}
                          screenWidth={screenWidth}
                          screenHeight={screenHeight}
                          worldWidth={
                            reduxStateHorizontal
                              ? reduxStateHorizontal.worldSize
                              : screenWidth
                          }
                          worldHeight={
                            reduxStateVertical
                              ? reduxStateVertical.worldSize
                              : screenHeight
                          }
                          worldLeftOffset={
                            reduxStateHorizontal
                              ? reduxStateHorizontal.worldOffset
                              : 0
                          }
                          worldTopOffset={
                            reduxStateVertical
                              ? reduxStateVertical.worldOffset
                              : 0
                          }
                          direction={direction}
                          viewportMovedVertically={viewportVerticalMove}
                          viewportMovedHorizontally={viewportHorizontalMove}
                          //mouseMoved: (e) => {
                          //  console.log("mose moved:", e);
                          //},
                        />
                      </Provider>
                    )}
                  </AppContext.Consumer>
                </Stage>
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
        </ReactResizeSensor>
      </div>
    </Provider>
  );
}
