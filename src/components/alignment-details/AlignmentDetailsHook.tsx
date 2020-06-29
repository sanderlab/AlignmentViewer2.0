/**
 * Base hook for pure webgl alignment details.
 */
import React, { useEffect, useRef, useState } from "react";
import "./AlignmentDetails.scss";

import * as PIXI from "pixi.js";
import { ResizeSensor } from "css-element-queries";
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
    fontSize,
  } = props;

  //ref to div
  const alignmentDetailsRef = useRef<HTMLDivElement>(null);

  //state
  const [resizeSensor, setResizeSensor] = useState<ResizeSensor | null>(null);
  const [mouseHovering, setMouseHovering] = useState<boolean>(false);

  //redux
  const dispatch = useDispatch();
  const reduxState: IVirtualizedMatrixState | undefined = useSelector(
    (rootState: RootState) => rootState.virtualizedMatrixSlice[id]
  );
  //console.log(id + " :: reduxState:", reduxState);

  //sizing - dynamically update state when div changes size
  useEffect(() => {
    if (!reduxState || resizeSensor) {
      //only setup one time.
      return;
    }
    PIXI.utils.skipHello();
    PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

    //fix safari-specific bug - this function will tell the window to stop
    //blocking scroll events on the "single-sequence-text" class
    stopSafariFromBlockingWindowWheel("single-sequence-text");
    stopSafariFromBlockingWindowWheel("stage");
    stopSafariFromBlockingWindowWheel("hidden-residues-for-copy-paste");

    if (alignmentDetailsRef.current) {
      props.scrollerLoaded(alignmentDetailsRef.current);

      const rs = new ResizeSensor(alignmentDetailsRef.current, () => {
        if (alignmentDetailsRef.current) {
          const rect = alignmentDetailsRef.current!.getBoundingClientRect();
          if (
            reduxState.clientWidth !== rect.width ||
            reduxState.clientHeight !== rect.height
          ) {
            dispatch(
              setViewportDimensions({
                id: id,
                clientWidth: rect.width,
                clientHeight: rect.height,
              })
            );
          }
        }
      });
      setResizeSensor(rs);
      return () => {
        rs.detach();
        setResizeSensor(null);
        props.scrollerUnloaded(alignmentDetailsRef.current!);
      };
    } else {
      console.error(
        "Unable to add resize sensor as alignmentDetailsRef.current was not defined",
        alignmentDetailsRef
      );
    }
  }, [reduxState !== undefined]);

  useEffect(() => {
    dispatch(
      setMatrixDimensions({
        id: id,
        columnWidth: residueWidth,
        rowHeight: residueHeight,
      })
    );
  }, [residueHeight, residueWidth]);

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
  }, [sequenceCount, sequenceLength]);

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
        <div ref={alignmentDetailsRef} className="viewport">
          {!reduxState ||
          !reduxState.initialized ||
          !alignmentDetailsRef.current ? null : (
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
              viewport={{
                store: store,
                props: {
                  parentElement: alignmentDetailsRef.current,
                  //!important: width is rendered fully - if set to clientWidth, then the viewport
                  //doesn't notify of scrolling on the rendered-but-hidden area (right side)
                  screenWidth: reduxState.worldWidth,
                  screenHeight: reduxState.clientHeight,
                  worldWidth: reduxState.worldWidth,
                  worldHeight: reduxState.worldHeight,
                  worldTopOffset: reduxState.worldTopOffset,
                  columnWidth: reduxState.columnWidth,
                  rowHeight: reduxState.rowHeight,
                  viewportMoved: (newWorldTop) => {
                    dispatch(
                      setWorldTopOffset({ id: id, worldTopOffset: newWorldTop })
                    );
                  },
                  //mouseMoved: (e) => {
                  //  console.log("mose moved:", e);
                  //},
                },
              }}
            ></AlignmentRectanglesAndLetters>
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
      </div>
    </Provider>
  );
}
