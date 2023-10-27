/**
 * Hook for rendering the position axis
 */
import "./PositionalAxis.scss";
import React from "react";
import { VirtualizedMatrixViewer } from "./virtualization/VirtualizedMatrixViewerHook";

/**
 * Generate a string axis (positional information) with one character per position
 * through the maxLength. Taken from alignmentviewer 1.0:
 *     https://github.com/sanderlab/alignmentviewer
 * May want to implement this better in the future (SVG + sliding tooltip for cursor?)
 * @param maxLength
 */
function generateTextualRuler(maxLength: number): string {
  let s = ""; // should be a better way to do this to be honest
  for (let i = 1; i <= maxLength + 1; i++) {
    const Q = i % 10 === 0;
    const Q5 = !Q && i % 5 === 0;
    s += Q ? "|" : Q5 ? ":" : ".";
    if (!Q) {
      continue;
    }
    const sn = "" + i;
    const np = s.length - sn.length - 1; // where num starts
    if (np < 0) {
      continue;
    }
    s = s.substr(0, np) + sn + "|";
  }
  return s; // this.hruler = s.replace(/ /g, '.');
}

/**
 * @param props
 */
export function PositionalAxis(props: {
  horizontalReduxId: string;
  fontSize: number;
  positions: number[];
  residueHeight: number;
  residueWidth: number;
}) {
  const {
    horizontalReduxId,
    fontSize,
    positions,
    residueHeight,
    residueWidth,
  } = props;

  return (
    <VirtualizedMatrixViewer
      //id={id}
      horizontalReduxId={horizontalReduxId}
      direction="x"
      columnCount={positions.length}
      columnWidth={residueWidth}
      rowCount={1}
      rowHeight={residueHeight}
      autoOffset={true}
      suppressVerticalScrollbar={true}
      suppressHorizontalScrollbar={true}
      getContent={(rowIdxsToRender, colIdxsToRender) => {
        const fullRuler = generateTextualRuler(Math.max(...positions));
        return (
          <div className="positional-axis" style={{ fontSize: fontSize }}>
            {colIdxsToRender
              .map((colIdx) => {
                return fullRuler[colIdx];
              })
              .join("")}
          </div>
        );
      }}
    />
  );
}
