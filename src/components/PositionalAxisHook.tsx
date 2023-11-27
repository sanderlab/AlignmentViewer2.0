/**
 * Hook for rendering the position axis
 */
import "./PositionalAxis.scss";
import React, { useCallback, useMemo } from "react";
import { VirtualizedMatrixViewer } from "./virtualization/VirtualizedMatrixViewerHook";

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

  const maxLength = Math.max(...positions);

  /**
   * Generate a string axis (positional information) with one character per position
   * through the maxLength. Taken from alignmentviewer 1.0:
   *     https://github.com/sanderlab/alignmentviewer
   * May want to implement this better in the future (SVG + sliding tooltip for cursor?)
   * @param maxLength
   */
  const fullRuler = useMemo((): string => {
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
      s = s.substring(0, )
      s = s.substr(0, np) + sn + "|";
    }
    return s; // this.hruler = s.replace(/ /g, '.');
  }, [maxLength]);

  const renderAxis = useCallback((colIdxsToRender: number[])=>{
    return (
      <div className="av2-positional-axis" style={{ fontSize: fontSize }}>
        {colIdxsToRender.map((colIdx) => {
            return fullRuler[colIdx];
          })
          .join("")}
      </div>
    )
  }, [fullRuler, fontSize]);

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
      getContent={(
        rowIdxsToRender,
        colIdxsToRender,
        additionalVerticalOffset,
        additionalHorizontalOffset,
        stageDimensions
      ) => {
        return renderAxis(colIdxsToRender);
      }}
    />
  );
}
