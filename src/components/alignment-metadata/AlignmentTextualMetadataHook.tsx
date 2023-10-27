/**
 * Base hook for pure webgl alignment details.
 */
import "./AlignmentTextualMetadata.scss";
import React, { useCallback } from "react";

import { VirtualizedMatrixViewer } from "../virtualization/VirtualizedMatrixViewerHook";

export interface IAlignmentTextualMetadataProps {
  verticalReduxId: string;
  textForEachSeq: string[];
  letterHeight: number;
  letterWidth: number;
  fontSize: number;
}

export function AlignmentTextualMetadata(
  props: IAlignmentTextualMetadataProps
) {
  //props
  const {
    verticalReduxId,
    textForEachSeq,
    letterHeight,
    letterWidth,
    fontSize,
  } = props;
  const horizontalReduxId = 'METADATA_HORIZONTAL_SCROLLER';

  const getMaxTextLength = useCallback(() => {
    return textForEachSeq.reduce((acc, txt) => {
      return txt.length > acc ? txt.length : acc;
    }, 0);
  }, [textForEachSeq]);

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
      verticalReduxId={verticalReduxId}
      horizontalReduxId={horizontalReduxId}
      direction="all"
      columnCount={getMaxTextLength()}
      columnWidth={letterWidth}
      rowCount={textForEachSeq.length}
      rowHeight={letterHeight}
      autoOffset={true}
      getContent={(rowIdxsToRender, colIdxsToRender) => {
        return (
          <div
            className="alignment-textual-metadata"
            style={{
              fontSize: fontSize,
              lineHeight: letterHeight + "px",
            }}
          >
            {rowIdxsToRender.map((rowIdx) => {
              const fullTextLine = textForEachSeq[rowIdx];
              return (
                <div key={fullTextLine}>
                  {colIdxsToRender
                    .map((colIdx) => {
                      return fullTextLine.length > colIdx
                        ? fullTextLine[colIdx]
                        : "";
                    })
                    .join("")}
                </div>
              );
            })}
          </div>
        );
      }}
    />
  );
}
