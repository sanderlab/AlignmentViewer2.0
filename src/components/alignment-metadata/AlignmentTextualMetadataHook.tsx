/**
 * Base hook for pure webgl alignment details.
 */
import "./AlignmentTextualMetadata.scss";
import React, { useCallback } from "react";

import { VirtualizedMatrixViewer } from "../virtualization/VirtualizedMatrixViewerHook";

export interface IAlignmentTextualMetadataProps {
  id: string;
  textForEachSeq: string[];
  letterHeight: number;
  letterWidth: number;
  fontSize: number;
}

export function AlignmentTextualMetadata(
  props: IAlignmentTextualMetadataProps
) {
  //props
  const { id, textForEachSeq, letterHeight, letterWidth, fontSize } = props;

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
      id={id}
      columnCount={getMaxTextLength()}
      columnWidth={letterWidth}
      rowCount={textForEachSeq.length}
      rowHeight={letterHeight}
      autoOffset={true}
      getData={(rowIdxsToRender, colIdxsToRender) => {
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
