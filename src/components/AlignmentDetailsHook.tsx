/**
 * Base hook for pure webgl alignment details.
 */
import React, { useEffect, useRef, useState } from "react";
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

import { AlignmentDetailsScrollbar } from "./AlignmentDetailsScrollbarHook";
import { CanvasAlignmentTiled } from "./CanvasAlignmentTiledComponent";

import { ResizeSensor } from "css-element-queries";
import { Stage, AppContext } from "@inlet/react-pixi";
import { Provider, useDispatch, useSelector } from "react-redux";
import { AlignmentDetailsViewport } from "./AlignmentDetailsViewportHook";
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
  const {
    alignment,
    alignmentStyle,
    sortBy,
    residueWidth,
    fontSize,
    scrollerLoaded,
    scrollerUnloaded,
  } = props;

  //ref to div
  const alignmentDetailsRef = useRef<HTMLDivElement>(null);

  //state
  const [mouseHovering, setMouseHovering] = useState<boolean>(false);

  //redux
  const dispatch = useDispatch();
  const state = useSelector((state: RootState) => state.alignmentDetailsSlice);

  //sizing - dynamically update state when div changes size
  useEffect(() => {
    props.scrollerLoaded(alignmentDetailsRef.current!);
    if (alignmentDetailsRef.current) {
      new ResizeSensor(alignmentDetailsRef.current, () => {
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
    } else {
      console.error(
        "Unable to add resize sensor as alignmentDetailsRef.current was not defined",
        alignmentDetailsRef
      );
    }
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
                        drawSequencesIndicies={state.seqIdxsToRender}
                        scale={{
                          x: state.residueWidth,
                          y: state.residueHeight,
                        }}
                      />
                    );
                  }}
                </AppContext.Consumer>

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
                        screenWidth={state.viewportWidth}
                        screenHeight={state.viewportHeight}
                        worldWidth={state.worldWidth}
                        worldHeight={state.worldHeight}
                      ></AlignmentDetailsViewport>
                    </Provider>
                  )}
                </AppContext.Consumer>
              </Stage>
              <div
                className="sequence-text-holder"
                style={{
                  top: state.scrollingAdditionalVerticalOffset,
                }}
              >
                {state.seqIdxsToRender.map((seqIdx, viewIdx) => {
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
            </>
          )}
        </div>
        <AlignmentDetailsScrollbar visible={mouseHovering} />
      </div>
    </Provider>
  );
}
