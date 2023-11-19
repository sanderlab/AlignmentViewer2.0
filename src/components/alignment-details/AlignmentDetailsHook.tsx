/**
 * Base hook for pure webgl alignment details.
 */
import "./AlignmentDetails.scss";
import React from "react";
import {
  AminoAcidAlignmentStyle,
  NucleotideAlignmentStyle,
} from "../../common/MolecularStyles";

import { VirtualizedMatrixViewer } from "../virtualization/VirtualizedMatrixViewerHook";
import { AlignmentDetailsLetters } from "./AlignmentDetailsLettersHook";
import { CanvasAlignmentTiled } from "../CanvasAlignmentTiledComponent";
import { AppContext, Stage } from "@pixi/react";

export interface IAlignmentDetailsProps {
  reduxVerticalId?: string;
  reduxHorizontalId?: string;
  sequences: string[];
  consensusSequence: string;
  querySequence: string;
  alignmentStyle: AminoAcidAlignmentStyle | NucleotideAlignmentStyle;
  residueHeight: number;
  residueWidth: number;
  fontSize: number;
  suppressVerticalScrollbar?: boolean;
  suppressHorizontalScrollbar?: boolean;

  highlightedSequenceIdxs?: number[];
  highlightedPositionIdxs?: number[];
}

export function AlignmentDetails(props: IAlignmentDetailsProps) {
  //props
  const {
    reduxHorizontalId,
    reduxVerticalId,
    sequences,
    consensusSequence,
    querySequence,
    alignmentStyle,
    residueHeight,
    residueWidth,
    fontSize,
    suppressVerticalScrollbar,
    suppressHorizontalScrollbar,
  } = props;
  
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
    <VirtualizedMatrixViewer
      horizontalReduxId={reduxHorizontalId}
      verticalReduxId={reduxVerticalId}
      direction={sequences.length > 1 ? "all" : "x"}
      columnCount={sequences.length > 0 ? sequences[0].length : 0}
      columnWidth={residueWidth}
      rowCount={sequences.length}
      rowHeight={residueHeight}
      autoOffset={false} //manually offset because of pixi funkyness (probably should recheck)
      suppressVerticalScrollbar={suppressVerticalScrollbar}
      suppressHorizontalScrollbar={suppressHorizontalScrollbar}
      getContent={(
        rowIdxsToRender,
        colIdxsToRender,
        additionalVerticalOffset,
        additionalHorizontalOffset,
        stageDimensions
      ) => {
        //issue with loading new alignment (a second alignment): virutalizedmatrix can end up not loading 
        //the redux store after calling getContent 
        const seqsSliced = rowIdxsToRender.map((seqIdx) => {
          const seq = sequences[seqIdx];
          return colIdxsToRender.map((colIdx) => seq[colIdx]).join("");
        });

        const querySliced = colIdxsToRender.map((colIdx) => querySequence[colIdx]).join("")
        const consensusSliced = colIdxsToRender.map((colIdx) => consensusSequence[colIdx]).join("")

        return (
          <div className="av-viewport">
            <Stage
              className="stage"
              width={stageDimensions.width}
              height={stageDimensions.height}
              raf={false}
              options={{ antialias: false, backgroundAlpha: 0 }}
            >
              <AppContext.Consumer>
                {(app) => {
                  return (
                    <CanvasAlignmentTiled
                      sequences={seqsSliced}
                      consensusSequence={consensusSliced}
                      querySequence={querySliced}
                      alignmentType={alignmentStyle.alignmentType}
                      residueDetail={alignmentStyle.residueDetail}
                      colorScheme={alignmentStyle.colorScheme}
                      positionsToStyle={alignmentStyle.positionsToStyle}
                      //TODO further optimization by removing this and scaling with pixi 
                      //(see minimap)
                      scale={{x: residueWidth, y: residueHeight}}
                      translateY={additionalVerticalOffset}
                      translateX={additionalHorizontalOffset}
                    />
                  );
                }}
              </AppContext.Consumer>
            </Stage>

            <AlignmentDetailsLetters
              sequencesToRender={seqsSliced}
              consensusSequence={consensusSliced}
              querySequence={querySliced}
              alignmentStyle={alignmentStyle}
              fontSize={fontSize}
              lineHeight={residueHeight}
              verticalOffset={additionalVerticalOffset}
              horizontalOffset={additionalHorizontalOffset}
            ></AlignmentDetailsLetters>
          </div>
        );
      }}
    ></VirtualizedMatrixViewer>
  );
}
