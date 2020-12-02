/**
 * Base hook for pure webgl alignment details.
 */
import "./AlignmentDetails.scss";
import React from "react";
import {
  AminoAcidAlignmentStyle,
  NucleotideAlignmentStyle,
} from "../../common/MolecularStyles";
import { Stage, AppContext } from "@inlet/react-pixi";
import { VirtualizedMatrixViewer } from "../virtualization/VirtualizedMatrixViewerHook";
import { AlignmentDetailsLetters } from "./AlignmentDetailsLettersHook";
import { CanvasAlignmentTiled } from "../CanvasAlignmentTiledComponent";

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
      getContent={(
        rowIdxsToRender,
        colIdxsToRender,
        additionalVerticalOffset,
        additionalHorizontalOffset,
        stageDimensions
      ) => {
        const seqsSliced = rowIdxsToRender.map((seqIdx) => {
          const seq = sequences[seqIdx];
          return colIdxsToRender.map((colIdx) => seq[colIdx]).join("");
        });
        //console.log(id + " :: ", seqsSliced);

        return (
          <div className="av-viewport">
            <Stage
              className="stage"
              width={stageDimensions.width}
              height={stageDimensions.height}
              raf={false}
              options={{ antialias: false, transparent: true }}
            >
              <AppContext.Consumer>
                {(app) => {
                  return (
                    <CanvasAlignmentTiled
                      sequences={seqsSliced}
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
                      translateX={additionalHorizontalOffset}
                    />
                  );
                }}
              </AppContext.Consumer>
            </Stage>

            <AlignmentDetailsLetters
              sequencesToRender={seqsSliced}
              consensusSequence={consensusSequence}
              querySequence={querySequence}
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
