/**
 * Base hook for pure webgl alignment details.
 */
import React, { useState } from "react";
import "./AlignmentDetails.scss";

import { AlignmentDetailsLetters } from "./AlignmentDetailsLettersHook";
import { CanvasAlignmentTiled } from "../CanvasAlignmentTiledComponent";

import {
  AlignmentDetailsViewport,
  IAlignmentDetailsViewportProps,
} from "./AlignmentDetailsViewportComponent";

import { Stage, AppContext, Sprite } from "@inlet/react-pixi";
import {
  AminoAcidAlignmentStyle,
  NucleotideAlignmentStyle,
} from "../../common/MolecularStyles";
import { Provider } from "react-redux";
import { EnhancedStore } from "@reduxjs/toolkit";

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

  //viewport
  viewport?:
    | undefined
    | {
        store: EnhancedStore;
        props: Omit<IAlignmentDetailsViewportProps, "app">;
      };
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

    viewport,
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
  const renderViewport = () => {
    return (
      <Stage
        className="interaction-viewport stage"
        width={stageWidth}
        height={stageHeight}
        options={{ transparent: true }}
      >
        <AppContext.Consumer>
          {(app) => (
            //entrypoint to the interaction viewport for registering scroll
            //and zoom and other events. This is not rendering anything, but
            //is used to calculate interaction changes and report them
            //back to this component.
            <Provider store={viewport!.store}>
              <AlignmentDetailsViewport
                app={app}
                {...viewport!.props}
              ></AlignmentDetailsViewport>
            </Provider>
          )}
        </AppContext.Consumer>
      </Stage>
    );
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
      {!viewport ? null : renderViewport()}
    </>
  );
}
