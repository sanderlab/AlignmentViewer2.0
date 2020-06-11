/**
 * Base hook for pure webgl alignment details.
 */
import React, { useEffect, useRef, useState } from "react";
import * as PIXI from "pixi.js";
import "./AlignmentDetails.scss";
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
} from "../../common/ReduxStore";

import { AlignmentDetailsViewport } from "./AlignmentDetailsViewportHook";
import { AlignmentDetailsScrollbar } from "./AlignmentDetailsScrollbarHook";
import { AlignmentDetailsLetters } from "./AlignmentDetailsLettersHook";
import { CanvasAlignmentTiled } from "../CanvasAlignmentTiledComponent";

import { ResizeSensor } from "css-element-queries";
import { Stage, AppContext } from "@inlet/react-pixi";
import { Provider, useDispatch, useSelector } from "react-redux";
import { stopSafariFromBlockingWindowWheel } from "../../common/Utils";

export interface IAlignmentDetailsProps {
  alignment: Alignment;
  alignmentStyle: AminoAcidAlignmentStyle | NucleotideAlignmentStyle;
  sortBy: SequenceSorter;
  residueWidth: number;
  fontSize: number;

  scrollerLoaded: (e: HTMLElement) => void;
  scrollerUnloaded: (e: HTMLElement) => void;
}

const CHARACTER_HEIGHT_TO_WIDTH_RATIO = 36 / 16;

export function AlignmentDetails(props: IAlignmentDetailsProps) {
  //props
  const { alignment, alignmentStyle, sortBy, residueWidth, fontSize } = props;

  //ref to div
  const alignmentDetailsRef = useRef<HTMLDivElement>(null);

  //state
  const [mouseHovering, setMouseHovering] = useState<boolean>(false);

  //redux
  const dispatch = useDispatch();
  const state = useSelector((state: RootState) => state.alignmentDetailsSlice);

  //sizing - dynamically update state when div changes size
  useEffect(() => {
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
            state.clientWidth !== rect.width ||
            state.clientHeight !== rect.height
          ) {
            dispatch(
              setViewportDimensions({
                clientWidth: rect.width,
                clientHeight: rect.height,
              })
            );
          }
        }
      });
      return () => {
        rs.detach();
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
  }, []);

  useEffect(() => {
    dispatch(
      setResidueDimensions({
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
        sequenceCount: alignment.getSequenceCount(),
        sequenceLength: alignment.getMaxSequenceLength(),
      })
    );
  }, [alignment]);

  const sortedSeqs = alignment.getSequences(sortBy);
  const disableScrolling =
    alignment.getSequenceCount() <= state.seqIdxsToRender.length;

  //when switching alignments, there is a render with stale data as the
  //redux store doesn't recalculate until setAlignmentDetails is called
  //in useEffect above. Because of this, seqIdxsToRender can have incorrect
  //indicies - if these indicies are invalid, set them to be empty.
  const seqIdxsToRender =
    alignment.getMaxSequenceLength() !== state.sequenceLength ||
    alignment.getSequenceCount() !== state.sequenceCount
      ? []
      : state.seqIdxsToRender;

  const seqsToRender = seqIdxsToRender.map((seqIdx) => {
    return sortedSeqs[seqIdx].sequence;
  });

  /**
   *
   *
   *
   * Render the background colored rectangles using webgl.
   * (or not if letter only residue style is selected)
   *
   *
   *
   */
  const renderBackgroundRectangles = () => {
    return (
      <Stage
        className="stage"
        width={state.viewportWidth}
        height={state.viewportHeight}
        options={{ antialias: false, transparent: true }}
      >
        <AppContext.Consumer>
          {(app) => {
            return (
              <CanvasAlignmentTiled
                sequences={seqsToRender}
                consensusSequence={alignment.getConsensus().sequence}
                querySequence={alignment.getQuerySequence().sequence}
                alignmentType={alignmentStyle.alignmentType}
                residueDetail={alignmentStyle.residueDetail}
                colorScheme={alignmentStyle.colorScheme}
                positionsToStyle={alignmentStyle.positionsToStyle}
                scale={{
                  x: state.residueWidth,
                  y: state.residueHeight,
                }}
                translateY={state.scrollingAdditionalVerticalOffset}
              />
            );
          }}
        </AppContext.Consumer>
        {disableScrolling ? null : (
          <AppContext.Consumer>
            {(app) => (
              //entrypoint to the interaction viewport for registering scroll
              //and zoom and other events. This is not rendering anything, but
              //is used to calculate interaction changes and report them
              //back to this component.
              <Provider store={store}>
                <AlignmentDetailsViewport
                  app={app}
                  parentElement={alignmentDetailsRef.current!}
                  screenWidth={state.clientWidth}
                  screenHeight={state.clientHeight}
                  worldWidth={state.worldWidth}
                  worldHeight={state.worldHeight}
                ></AlignmentDetailsViewport>
              </Provider>
            )}
          </AppContext.Consumer>
        )}
      </Stage>
    );
  };

  /**
   *
   *
   *
   * Render the entire
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
          {!state.initialized ? null : (
            <>
              {renderBackgroundRectangles()}
              <div
                className="sequence-text-holder"
                style={{
                  top: state.scrollingAdditionalVerticalOffset,
                }}
              >
                <AlignmentDetailsLetters
                  sequencesToRender={seqsToRender}
                  consensusSequence={alignment.getConsensus().sequence}
                  querySequence={alignment.getQuerySequence().sequence}
                  alignmentStyle={alignmentStyle}
                  fontSize={fontSize}
                  lineHeight={state.residueHeight}
                ></AlignmentDetailsLetters>
              </div>
            </>
          )}
        </div>
        {disableScrolling ? null : (
          <AlignmentDetailsScrollbar visible={mouseHovering} />
        )}
      </div>
    </Provider>
  );
}
