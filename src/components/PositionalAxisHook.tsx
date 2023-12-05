/**
 * Hook for rendering the position axis
 */
import "./PositionalAxis.scss";
import React, { useCallback, useMemo, useRef } from "react";
import { ScrollbarOptions, VirtualizedMatrixViewer } from "./virtualization/VirtualizedMatrixViewerHook";

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

  //const mouseHoverStarted = useCallback((
  //  idx: number, 
  //  e: React.MouseEvent<HTMLSpanElement, MouseEvent>
  //)=>{ }, []);
  //const mouseHoverEnded = useCallback((
  //  idx: number, 
  //  e: React.MouseEvent<HTMLSpanElement, MouseEvent>
  //)=>{ }, []);

  /**
   * Generate a string axis (positional information) with one character per position
   * through the maxLength. Taken from alignmentviewer 1.0:
   *     https://github.com/sanderlab/alignmentviewer
   * May want to implement this better in the future (SVG + sliding tooltip for cursor?)
   * UPDATE: actually works pretty well even for large numbers
   * |....:..10|....:..20|....:..30|....:..40| ->
   *        |....12310|....12320|....12330|....12340|....12350|....12360|
   */
  const fullRuler = useMemo((): React.JSX.Element[] => {
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
      s = s.substring(0, np) + sn + "|";
    }
    return s.split("").map((char, idx)=>{
      return (
        <span
          key={idx} 
          //onMouseEnter={(e)=>{mouseHoverStarted(idx, e)}}
          //onMouseLeave={(e)=>{mouseHoverEnded(idx, e)}}
        >
          {char}
        </span>
      );
    });
  }, [maxLength]);

  const renderAxis = useCallback((colIdxsToRender: number[])=>{ // example of caching. unnecessary here though
    return (
      <div className="av2-positional-axis" style={{ fontSize: fontSize }}>
        {
          colIdxsToRender.map((colIdx) => {
            return fullRuler[colIdx];
          })
        }
      </div>
    );
  }, [fullRuler, fontSize]);

  return (
    <VirtualizedMatrixViewer
      horizontalReduxId={horizontalReduxId}
      direction="x"
      columnCount={positions.length}
      columnWidth={residueWidth}
      rowCount={1}
      rowHeight={residueHeight}
      autoOffset={true}
      verticalScrollbar={ScrollbarOptions.NeverOn}
      horizontalScrollbar={ScrollbarOptions.NeverOn}
      getContent={({colIdxsToRender}) => {
        return renderAxis(colIdxsToRender);
      }}
    />
  );
}
