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
  setMatrixSize,
  setMatrixDimensions,
  setViewportDimensions,
  RootState,
  IVirtualizedMatrixState,
  setWorldTopOffset,
  setWorldLeftOffset,
} from "../../common/ReduxStore";
import { stopSafariFromBlockingWindowWheel } from "../../common/Utils";
import { VirtualVerticalScrollbar } from "./VirtualVerticalScrollbarHook";

interface IVirtualizedMatrixiewerProps {
  id: string;
  getData(
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
}

export function VirtualizedMatrixViewer(props: IVirtualizedMatrixiewerProps) {
  const {
    id,
    autoOffset,
    getData,
    columnCount,
    rowCount,
    columnWidth,
    rowHeight,
  } = props;

  //ref
  const ref = useRef<HTMLDivElement>(null);

  //state
  const [mouseHovering, setMouseHovering] = useState<boolean>(false);

  //redux
  const dispatch = useDispatch();
  const reduxState: IVirtualizedMatrixState | undefined = useSelector(
    (rootState: RootState) => rootState.virtualizedMatrixSlice[id]
  );
  //console.log("reduxState:", reduxState);

  //callbacks
  const viewportVerticalMove = useCallback(
    (newWorldTop: number) => {
      dispatch(
        setWorldTopOffset({
          id: id,
          worldTopOffset: newWorldTop,
        })
      );
    },
    [dispatch, id]
  );

  const viewportHorizontalMove = useCallback(
    (newWorldLeft) => {
      dispatch(
        setWorldLeftOffset({
          id: id,
          worldLeftOffset: newWorldLeft,
        })
      );
    },
    [dispatch, id]
  );

  const viewportSizeChanged = useCallback((bounds) => {
    dispatch(
      setViewportDimensions({
        id: id,
        clientWidth: bounds.width,
        clientHeight: bounds.height,
      })
    );
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

  useEffect(() => {
    dispatch(
      setMatrixDimensions({
        id: id,
        columnWidth: columnWidth,
        rowHeight: rowHeight,
      })
    );
  }, [dispatch, id, columnWidth, rowHeight]);

  useEffect(() => {
    dispatch(
      setMatrixSize({
        id: id,
        rowCount: rowCount,
        columnCount: columnCount,
      })
    );
  }, [dispatch, id, rowCount, columnCount]);

  //misc
  const disableVerticalScrolling = !reduxState
    ? true
    : rowCount <= reduxState.rowIdxsToRender.length;
  const disableHorizontalScrolling = !reduxState
    ? true
    : columnCount <= reduxState.columnIdxsToRender.length;

  //redux state can be stale when initializing or switching datasets - these
  //eventually stabilize once useEffect functions are executed and the redux
  //store emits events, but before this can happen make sure the current params
  //match the redux store and if not, render empty data.
  let rowIdxsToRender: number[] = [];
  let colIdxsToRender: number[] = [];
  if (
    reduxState &&
    rowCount === reduxState.rowCount &&
    columnCount === reduxState.columnCount
  ) {
    rowIdxsToRender = reduxState.rowIdxsToRender;
    colIdxsToRender = reduxState.columnIdxsToRender;
  }
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
            {!ref || !reduxState || !reduxState.initialized ? null : (
              <>
                <div
                  className="data"
                  style={{
                    top: autoOffset
                      ? reduxState.scrollingAdditionalVerticalOffset
                      : undefined,
                    left: autoOffset
                      ? reduxState.scrollingAdditionalHorizontalOffset
                      : undefined,
                  }}
                >
                  {getData(
                    rowIdxsToRender,
                    colIdxsToRender,
                    reduxState.scrollingAdditionalVerticalOffset,
                    reduxState.scrollingAdditionalHorizontalOffset,
                    {
                      width: reduxState.viewportWidth,
                      height: reduxState.viewportHeight,
                    }
                  )}
                </div>

                <Stage
                  className="interaction-viewport stage"
                  width={reduxState.viewportWidth}
                  height={reduxState.viewportHeight}
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
                          screenWidth={reduxState.clientWidth}
                          screenHeight={reduxState.clientHeight}
                          worldWidth={reduxState.worldWidth}
                          worldHeight={reduxState.worldHeight}
                          worldLeftOffset={reduxState.worldLeftOffset}
                          worldTopOffset={reduxState.worldTopOffset}
                          columnWidth={reduxState.columnWidth}
                          rowHeight={reduxState.rowHeight}
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
              worldHeight={reduxState.worldHeight}
              worldTopOffset={reduxState.worldTopOffset}
              scrollbarMoved={(newWorldTop) => {
                dispatch(
                  setWorldTopOffset({ id: id, worldTopOffset: newWorldTop })
                );
              }}
            />
          )}
        </ReactResizeSensor>
      </div>
    </Provider>
  );
}
