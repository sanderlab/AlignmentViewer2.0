/**
 * Base hook for pure webgl alignment details.
 */
import "./AlignmentDetails.scss";
import React, { useEffect, useState, useRef, useCallback } from "react";
import * as PIXI from "pixi.js";

import { Provider, useDispatch, useSelector } from "react-redux";

import { VirtualVerticalScrollbar } from "../virtualization/VirtualVerticalScrollbarHook";
import { AlignmentRectanglesAndLetters } from "./AlignmentRectanglesLettersHook";

import {
  AminoAcidAlignmentStyle,
  NucleotideAlignmentStyle,
} from "../../common/MolecularStyles";
import {
  store,
  setMatrixSize,
  setMatrixDimensions,
  setViewportDimensions,
  RootState,
  IVirtualizedMatrixState,
  setWorldTopOffset,
} from "../../common/ReduxStore";
import { stopSafariFromBlockingWindowWheel } from "../../common/Utils";
import { ReactResizeSensor } from "../ResizeSensorHook";
import { Stage, AppContext } from "@inlet/react-pixi";
import { AlignmentDetailsViewport } from "./AlignmentDetailsViewportComponent";

export interface IAlignmentDetailsProps {
  id: string;
  className?: string;
  sequences: string[];
  consensusSequence: string;
  querySequence: string;
  alignmentStyle: AminoAcidAlignmentStyle | NucleotideAlignmentStyle;
  residueHeight: number;
  residueWidth: number;
  fontSize: number;

  scrollerLoaded: (e: HTMLElement) => void;
  scrollerUnloaded: (e: HTMLElement) => void;
}

export function AlignmentDetails(props: IAlignmentDetailsProps) {
  //props
  const {
    id,
    className,
    sequences,
    consensusSequence,
    querySequence,
    alignmentStyle,
    residueHeight,
    residueWidth,
    scrollerLoaded,
    scrollerUnloaded,
    fontSize,
  } = props;

  //scroller ref
  const scrollerRef = useRef<HTMLElement>();
  const scrollerRefCallback = useCallback(
    (node) => {
      if (!node && scrollerRef.current) {
        //unmounting
        scrollerUnloaded(scrollerRef.current);
      } else {
        PIXI.utils.skipHello();
        PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

        //fix safari-specific bug - this function will tell the window to stop
        //blocking scroll events on the "single-sequence-text" class
        stopSafariFromBlockingWindowWheel("single-sequence-text");
        stopSafariFromBlockingWindowWheel("stage");
        stopSafariFromBlockingWindowWheel("hidden-residues-for-copy-paste");

        scrollerLoaded(node);
      }
      scrollerRef.current = node;
    },
    [scrollerLoaded, scrollerUnloaded]
  );

  //state
  const [mouseHovering, setMouseHovering] = useState<boolean>(false);

  //redux
  const dispatch = useDispatch();
  const reduxState: IVirtualizedMatrixState | undefined = useSelector(
    (rootState: RootState) => rootState.virtualizedMatrixSlice[id]
  );

  //effects
  useEffect(() => {
    dispatch(
      setMatrixDimensions({
        id: id,
        columnWidth: residueWidth,
        rowHeight: residueHeight,
      })
    );
  }, [dispatch, id, residueHeight, residueWidth]);

  const sequenceCount = sequences.length;
  const sequenceLength = sequenceCount > 0 ? sequences[0].length : 0;
  useEffect(() => {
    dispatch(
      setMatrixSize({
        id: id,
        rowCount: sequenceCount,
        columnCount: sequenceLength,
      })
    );
  }, [dispatch, id, sequenceCount, sequenceLength]);

  const disableScrolling = !reduxState
    ? true
    : sequenceCount <= reduxState.rowIdxsToRender.length;

  //when switching alignments, there is a render with stale data as the
  //redux store doesn't recalculate until setAlignmentDetails is called
  //in useEffect above. Because of this, seqIdxsToRender can have incorrect
  //indicies - if these indicies are invalid, set them to be empty.
  const seqIdxsToRender =
    !reduxState ||
    sequenceLength !== reduxState.columnCount ||
    sequenceCount !== reduxState.rowCount
      ? []
      : reduxState.rowIdxsToRender;

  const seqsToRender = seqIdxsToRender.map((seqIdx) => {
    return sequences[seqIdx];
  });

  const additionalClassName = className ? " " + className : "";

  /**
   *
   *
   *
   * Render
   *
   *
   *
   */
  return (
    <Provider store={store}>
      <div
        className={`alignment-details-holder${additionalClassName}`}
        onMouseEnter={() => {
          setMouseHovering(true);
        }}
        onMouseLeave={() => {
          setMouseHovering(false);
        }}
      >
        <ReactResizeSensor
          onSizeChanged={(bounds) => {
            dispatch(
              setViewportDimensions({
                id: id,
                clientWidth: bounds.width,
                clientHeight: bounds.height,
              })
            );
          }}
        >
          <div className="viewport" ref={scrollerRefCallback}>
            {!reduxState ||
            !reduxState.initialized ||
            !scrollerRef.current ? null : (
              <>
                <AlignmentRectanglesAndLetters
                  render="letters_and_rectangles"
                  sequences={seqsToRender}
                  consensusSequence={consensusSequence}
                  querySequence={querySequence}
                  additionalVerticalOffset={
                    reduxState.scrollingAdditionalVerticalOffset
                  }
                  alignmentStyle={alignmentStyle}
                  fontSize={fontSize}
                  residueWidth={residueWidth}
                  residueHeight={reduxState.rowHeight}
                  stageWidth={reduxState.viewportWidth}
                  stageHeight={reduxState.viewportHeight}
                ></AlignmentRectanglesAndLetters>

                <Stage
                  className="interaction-viewport stage"
                  width={reduxState.viewportWidth}
                  height={reduxState.viewportHeight}
                  options={{ transparent: true }}
                >
                  <AppContext.Consumer>
                    {(app) => (
                      //entrypoint to the interaction viewport for registering scroll
                      //and zoom and other events. This is not rendering anything, but
                      //is used to calculate interaction changes and report them
                      //back to this component.
                      <Provider store={store}>
                        <AlignmentDetailsViewport
                          app={app}
                          parentElement={scrollerRef.current!}
                          //!important: width is rendered fully - if set to clientWidth, then the viewport
                          //doesn't notify of scrolling on the rendered-but-hidden area (right side)
                          screenWidth={reduxState.worldWidth}
                          screenHeight={reduxState.clientHeight}
                          worldWidth={reduxState.worldWidth}
                          worldHeight={reduxState.worldHeight}
                          worldTopOffset={reduxState.worldTopOffset}
                          columnWidth={reduxState.columnWidth}
                          rowHeight={reduxState.rowHeight}
                          viewportMoved={(newWorldTop) => {
                            dispatch(
                              setWorldTopOffset({
                                id: id,
                                worldTopOffset: newWorldTop,
                              })
                            );
                          }}
                          //mouseMoved: (e) => {
                          //  console.log("mose moved:", e);
                          //},
                        ></AlignmentDetailsViewport>
                      </Provider>
                    )}
                  </AppContext.Consumer>
                </Stage>
              </>
            )}
          </div>

          {disableScrolling ? null : (
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
