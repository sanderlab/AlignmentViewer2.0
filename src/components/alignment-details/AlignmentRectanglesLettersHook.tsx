/**
 * Base hook for pure webgl alignment details.
 */
import React from "react";
import "./AlignmentDetails.scss";

import { AlignmentDetailsLetters } from "./AlignmentDetailsLettersHook";
import { CanvasAlignmentTiled } from "../CanvasAlignmentTiledComponent";

import { Stage, AppContext } from "@inlet/react-pixi";
import {
  AminoAcidAlignmentStyle,
  NucleotideAlignmentStyle,
} from "../../common/MolecularStyles";

interface IAlignmentRectanglesAndLettersProps {
  render: "letters" | "rectangles" | "letters_and_rectangles";

  //sequences to render
  sequences: string[];
  consensusSequence: string;
  querySequence: string;

  //offsets
  additionalVerticalOffset: number;

  //style
  alignmentStyle: AminoAcidAlignmentStyle | NucleotideAlignmentStyle;

  //sizing
  fontSize: number;
  residueWidth: number;
  residueHeight: number;
  stageWidth: number;
  stageHeight: number;
}

export function AlignmentRectanglesAndLetters(
  props: IAlignmentRectanglesAndLettersProps
) {
  //props
  const {
    render,

    sequences,
    consensusSequence,
    querySequence,

    additionalVerticalOffset,
    alignmentStyle,

    fontSize,
    residueWidth,
    residueHeight,
    stageWidth,
    stageHeight,
  } = props;

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
  const renderRectangles = () => {
    return (
      <Stage
        className="stage"
        width={stageWidth}
        height={stageHeight}
        options={{ antialias: false, transparent: true }}
      >
        <AppContext.Consumer>
          {(app) => {
            return (
              <CanvasAlignmentTiled
                sequences={sequences}
                consensusSequence={consensusSequence}
                querySequence={querySequence}
                alignmentType={alignmentStyle.alignmentType}
                residueDetail={alignmentStyle.residueDetail}
                colorScheme={alignmentStyle.colorScheme}
                positionsToStyle={alignmentStyle.positionsToStyle}
                scale={{
                  x: residueWidth,
                  y: residueHeight,
                }}
                translateY={additionalVerticalOffset}
              />
            );
          }}
        </AppContext.Consumer>
      </Stage>
    );
  };

  /**
   *
   *
   *
   * Render the letters
   *
   *
   *
   */
  const renderLetters = () => {
    return (
      <AlignmentDetailsLetters
        sequencesToRender={sequences}
        consensusSequence={consensusSequence}
        querySequence={querySequence}
        alignmentStyle={alignmentStyle}
        fontSize={fontSize}
        lineHeight={residueHeight}
        verticalOffset={additionalVerticalOffset}
      ></AlignmentDetailsLetters>
    );
  };

  /**
   *
   *
   *
   * Render the entire set of
   *
   *
   *
   */
  return (
    <>
      {render === "rectangles" || render === "letters_and_rectangles"
        ? renderRectangles()
        : null}
      {render === "letters" || render === "letters_and_rectangles"
        ? renderLetters()
        : null}
    </>
  );
}
