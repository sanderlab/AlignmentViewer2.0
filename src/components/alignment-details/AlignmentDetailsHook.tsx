/**
 * Base hook for pure webgl alignment details.
 */
import React, { useEffect, useRef, useState } from "react";
import "./AlignmentDetails.scss";

import * as PIXI from "pixi.js";
import { ResizeSensor } from "css-element-queries";
import { Provider, useDispatch, useSelector } from "react-redux";

import { AlignmentDetailsScrollbar } from "./AlignmentDetailsScrollbarHook";
import { AlignmentRectanglesAndLetters } from "./AlignmentRectanglesLettersHook";

import { Alignment } from "../../common/Alignment";
import { SequenceSorter } from "../../common/AlignmentSorter";
import {
  AminoAcidAlignmentStyle,
  NucleotideAlignmentStyle,
} from "../../common/MolecularStyles";
import {
  store,
  setAlignmentDetails,
  setResidueDimensions,
  setViewportDimensions,
  RootState,
  IAlignmentDetailsState,
  setWorldTopOffset,
} from "../../common/ReduxStore";
import { stopSafariFromBlockingWindowWheel } from "../../common/Utils";

export interface IAlignmentDetailsProps {
  alignment: Alignment;
  alignmentStyle: AminoAcidAlignmentStyle | NucleotideAlignmentStyle;
  sortBy: SequenceSorter;
  residueWidth: number;
  fontSize: number;
  id: string;

  scrollerLoaded: (e: HTMLElement) => void;
  scrollerUnloaded: (e: HTMLElement) => void;
}

const CHARACTER_HEIGHT_TO_WIDTH_RATIO = 36 / 16;

export function AlignmentDetails(props: IAlignmentDetailsProps) {
  //props
  const {
    alignment,
    alignmentStyle,
    id,
    sortBy,
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
  const reduxState: IAlignmentDetailsState | undefined = useSelector(
    (rootState: RootState) => rootState.alignmentDetailsSlice[id]
  );
  //console.log("reduxState:", reduxState);

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

    props.scrollerLoaded(alignmentDetailsRef.current!);
    if (alignmentDetailsRef.current) {
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
    return () => {
      props.scrollerUnloaded(alignmentDetailsRef.current!);
    };
  }, [reduxState !== undefined]);

  useEffect(() => {
    dispatch(
      setResidueDimensions({
        id: id,
        residueWidth: residueWidth,
        residueHeight: Math.round(
          residueWidth * CHARACTER_HEIGHT_TO_WIDTH_RATIO
        ),
      })
    );
  }, [residueWidth]);

  useEffect(() => {
    dispatch(
      setAlignmentDetails({
        id: id,
        sequenceCount: alignment.getSequenceCount(),
        sequenceLength: alignment.getMaxSequenceLength(),
      })
    );
  }, [alignment]);

  const sortedSeqs = alignment.getSequences(sortBy);
  const disableScrolling = !reduxState
    ? true
    : alignment.getSequenceCount() <= reduxState.seqIdxsToRender.length;

  //when switching alignments, there is a render with stale data as the
  //redux store doesn't recalculate until setAlignmentDetails is called
  //in useEffect above. Because of this, seqIdxsToRender can have incorrect
  //indicies - if these indicies are invalid, set them to be empty.
  const seqIdxsToRender =
    !reduxState ||
    alignment.getMaxSequenceLength() !== reduxState.sequenceLength ||
    alignment.getSequenceCount() !== reduxState.sequenceCount
      ? []
      : reduxState.seqIdxsToRender;

  const seqsToRender = seqIdxsToRender.map((seqIdx) => {
    return sortedSeqs[seqIdx].sequence;
  });

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
        className="alignment-details-holder"
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
              consensusSequence={alignment.getConsensus().sequence}
              querySequence={alignment.getQuerySequence().sequence}
              additionalVerticalOffset={
                reduxState.scrollingAdditionalVerticalOffset
              }
              alignmentStyle={alignmentStyle}
              fontSize={fontSize}
              residueWidth={residueWidth}
              residueHeight={reduxState.residueHeight}
              stageWidth={reduxState.viewportWidth}
              stageHeight={reduxState.viewportHeight}
              viewport={{
                store: store,
                props: {
                  parentElement: alignmentDetailsRef.current,
                  screenWidth: reduxState.clientWidth,
                  screenHeight: reduxState.clientHeight,
                  worldWidth: reduxState.worldWidth,
                  worldHeight: reduxState.worldHeight,
                  worldTopOffset: reduxState.worldTopOffset,
                  residueWidth: reduxState.residueWidth,
                  residueHeight: reduxState.residueHeight,
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
          <AlignmentDetailsScrollbar
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
