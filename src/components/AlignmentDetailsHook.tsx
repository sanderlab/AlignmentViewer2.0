/**
 * Base hook for pure webgl alignment details.
 */
import React, { useEffect, useRef, useState } from "react";
import * as PIXI from "pixi.js";
import "./AlignmentDetails.scss";
import { Alignment } from "../common/Alignment";
import { SequenceSorter } from "../common/AlignmentSorter";
import {
  AminoAcidAlignmentStyle,
  NucleotideAlignmentStyle,
} from "../common/MolecularStyles";

import {
  store,
  setAlignmentDetails,
  setResidueDimensions,
  setViewportDimensions,
  RootState,
} from "../common/ReduxStore";

import { AlignmentDetailsViewport } from "./AlignmentDetailsViewportHook";
import { AlignmentDetailsScrollbar } from "./AlignmentDetailsScrollbarHook";
import { CanvasAlignmentTiled } from "./CanvasAlignmentTiledComponent";

import { ResizeSensor } from "css-element-queries";
import { Stage, AppContext } from "@inlet/react-pixi";
import { Provider, useDispatch, useSelector } from "react-redux";
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
        residueHeight: residueWidth * CHARACTER_HEIGHT_TO_WIDTH_RATIO,
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
          {!state.initialized ? null : ( //alignment.getMaxSequenceLength() !== state.sequenceLength || alignment.getSequenceCount() !== state.sequenceCount ||
            <div>
              <Stage
                className="stage"
                style={{
                  position: "relative",
                  top: state.scrollingAdditionalVerticalOffset,
                }}
                width={state.viewportWidth}
                height={state.viewportHeight}
                options={{ antialias: false, transparent: true }}
              >
                <AppContext.Consumer>
                  {(app) => {
                    return (
                      <CanvasAlignmentTiled
                        alignment={alignment}
                        alignmentType={alignmentStyle.alignmentType}
                        residueDetail={alignmentStyle.residueDetail}
                        sortBy={sortBy}
                        colorScheme={alignmentStyle.colorScheme}
                        positionsToStyle={alignmentStyle.positionsToStyle}
                        drawSequencesIndicies={seqIdxsToRender}
                        scale={{
                          x: state.residueWidth,
                          y: state.residueHeight,
                        }}
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
                          alignment={alignment}
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
              <div
                className="sequence-text-holder"
                style={{
                  top: state.scrollingAdditionalVerticalOffset,
                }}
              >
                {seqIdxsToRender.map((seqIdx, viewIdx) => {
                  const seq = sortedSeqs[seqIdx];
                  const style = {
                    top: viewIdx * state.residueHeight,
                    fontSize: fontSize,
                  };
                  return (
                    <div
                      className="single-sequence-text"
                      style={style}
                      key={seqIdx + seq.sequence + "_b"}
                    >
                      {seq.sequence
                        .split("")
                        .map((resi, idx) => {
                          if (idx % 2) return resi; //"\u00A0";
                          return resi;
                        })
                        .join("")}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        {disableScrolling ? null : (
          <AlignmentDetailsScrollbar visible={mouseHovering} />
        )}
      </div>
    </Provider>
  );
}
