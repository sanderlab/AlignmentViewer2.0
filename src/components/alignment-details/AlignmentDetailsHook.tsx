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
  ResidueStyle,
  AlignmentTypes,
  PositionsToStyle,
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
import { CanvasAlignmentTiled } from "../CanvasAlignmentTiledComponent";

import { ResizeSensor } from "css-element-queries";
import { Stage, AppContext } from "@inlet/react-pixi";
import { Provider, useDispatch, useSelector } from "react-redux";
import { stopSafariFromBlockingWindowWheel } from "../../common/Utils";
import { AminoAcid, Nucleotide } from "../../common/Residues";
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

  const seqsToRender = seqIdxsToRender.map((seqIdx) => {
    return sortedSeqs[seqIdx].sequence;
  });

  const getLetterColor = (letter: string, positionIdx: number) => {
    const moleculeClass =
      alignmentStyle.alignmentType === AlignmentTypes.AMINOACID
        ? AminoAcid
        : Nucleotide;
    let molecule = moleculeClass.UNKNOWN;

    if (alignmentStyle.positionsToStyle === PositionsToStyle.ALL) {
      molecule = moleculeClass.fromSingleLetterCode(letter);
    } else {
      const isConsensus =
        alignment.getConsensus().sequence[positionIdx] === letter;
      const isQuery =
        alignment.getQuerySequence().sequence[positionIdx] === letter;
      if (
        (alignmentStyle.positionsToStyle === PositionsToStyle.CONSENSUS &&
          isConsensus) ||
        (alignmentStyle.positionsToStyle === PositionsToStyle.CONSENSUS_DIFF &&
          !isConsensus) ||
        (alignmentStyle.positionsToStyle === PositionsToStyle.QUERY &&
          isQuery) ||
        (alignmentStyle.positionsToStyle === PositionsToStyle.QUERY_DIFF &&
          !isQuery)
      ) {
        molecule = moleculeClass.fromSingleLetterCode(letter);
      }
    }
    return alignmentStyle.residueDetail === ResidueStyle.DARK
      ? molecule.colors[alignmentStyle.colorScheme.commonName]
          .letterColorOnDarkTheme
      : alignmentStyle.residueDetail === ResidueStyle.LIGHT ||
        alignmentStyle.residueDetail === ResidueStyle.NO_BACKGROUND
      ? molecule.colors[alignmentStyle.colorScheme.commonName].default.hexString
      : "#cccccc";
  };

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
    );
  };

  /**
   *
   *
   *
   * Render the letters in the alignment
   *
   *
   *
   */
  const renderLetters = () => {
    //each sequence style will be rendered as a single separate div
    //munge the data first

    const letterColorToLocations = {} as {
      [letterColor: string]: { [seqId: number]: number[] };
    };
    for (let seqId = 0; seqId < seqsToRender.length; seqId++) {
      const seqStr = seqsToRender[seqId];
      for (let colIdx = 0; colIdx < seqStr.length; colIdx++) {
        const letter = seqStr[colIdx];
        const color = getLetterColor(letter, colIdx);
        if (!letterColorToLocations[color]) {
          letterColorToLocations[color] = {};
        }
        if (!letterColorToLocations[color][seqId]) {
          letterColorToLocations[color][seqId] = [];
        }
        letterColorToLocations[color][seqId].push(colIdx);
      }
    }

    //Array of JSX elements - one for each letter color. Each contains
    //a character for every position in the rendered sequences, (each
    //position will be blank for all except one of the elemnets)
    const colorsToDivs = Object.entries(letterColorToLocations).map(
      ([color, locations]) => {
        const colorString = seqsToRender
          .map((seqStr, seqIdx) => {
            return seqStr
              .split("")
              .map((letter, colIdx) => {
                if (
                  seqIdx in locations &&
                  locations[seqIdx].indexOf(colIdx) >= 0
                ) {
                  return letter;
                }
                return "\u00A0";
              })
              .join("");
          })
          .join("\n");
        return (
          <div
            className={"styled-residues"}
            style={{ color: color }}
            key={color}
          >
            <pre style={{ fontSize: fontSize }}>{colorString}</pre>
          </div>
        );
      }
    );
    return (
      <div
        className="sequence-text-holder"
        style={{
          top: state.scrollingAdditionalVerticalOffset,
        }}
      >
        {colorsToDivs}
        <pre
          style={{ fontSize: fontSize }}
          className="hidden-residues-for-copy-paste"
        >
          {seqsToRender.map((seqStr) => {
            return seqStr + "\n";
          })}
        </pre>
      </div>
    );
  };

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
              {renderLetters()}
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
