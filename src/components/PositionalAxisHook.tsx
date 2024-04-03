/**
 * Hook for rendering the position axis
 */
import "./PositionalAxis.scss";
import React, { useCallback, useMemo, useState } from "react";
import { generateUUIDv4 } from "../common/Utils";
import { IControllerRole, IResponderRole, IVirtualizeParamBasics, ScrollbarOptions, VirtualizationRole, VirtualizationStrategy } from "./virtualization/VirtualizationTypes";
import { VirtualizedHorizontalViewer } from "./virtualization/VirtualizedMatrixViewerHook";
import { MONO_FONT_FAMILY } from "../common/FontUtils";



/**
 * Generate a string axis (positional information) with one character per position
 * through the maxLength. Taken from alignmentviewer 1.0:
 *     https://github.com/sanderlab/alignmentviewer
 * May want to implement this better in the future (SVG + sliding tooltip for cursor?)
 * UPDATE: actually works pretty well even for large numbers
 * |....:..10|....:..20|....:..30|....:..40| ->
 *        |....12310|....12320|....12330|....12340|....12350|....12360|
 */
export const getPositionalAxisRuler = (maxLength: number): string => {
  let s = ""; // should be a better way to do this to be honest
  for (let i = 1; i <= maxLength; i++) {
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
  return s;
};


/**
 * @param props
 */
export function PositionalAxis(props: {
  alignmentUUID: string;
  horizVirtualization: IControllerRole | IResponderRole | "Automatic" | "None";
  fontSize: number;
  positions: number[];
  residueWidth: number;
  hoverTracker?: IVirtualizeParamBasics["hoverTracker"]
}) {
  const {
    alignmentUUID,
    fontSize,
    positions,
    residueWidth,
    hoverTracker = "end"
  } = props;

  const maxLength = Math.max(...positions) + 1; // positions is index based so add 1

  const containerId = useState<string>(generateUUIDv4());
  const horizVirtualization = useMemo(()=>{
    return props.horizVirtualization === "None"
      ? undefined
      : props.horizVirtualization === "Automatic"
        ? {
            virtualizationId: 
              `x_auto_generated_positionalaxis_virtualization_${alignmentUUID}_${containerId}`,
            role: VirtualizationRole.Controller,
            cellCount: maxLength,
            cellSizePx: residueWidth,
          } as IControllerRole
        : props.horizVirtualization;
  }, [
    alignmentUUID, 
    containerId,
    maxLength, 
    props.horizVirtualization, 
    residueWidth
  ]);
  
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
    return getPositionalAxisRuler(maxLength).split("").map((char, idx)=>{
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

  const renderedAxis = useMemo(()=>{
    return (
      <div className="av2-positional-axis" 
        style={{ 
          fontSize: fontSize,
          fontFamily: MONO_FONT_FAMILY
        }}>
        {fullRuler}
      </div>
    );
  }, [fullRuler, fontSize]);

  const getContent = useCallback(()=>{
    return renderedAxis;
  }, [renderedAxis]);

  return (
    !horizVirtualization
    ? undefined
    : <VirtualizedHorizontalViewer
        horizontalParams={{
          ...horizVirtualization,
          scrollbar: ScrollbarOptions.NeverOn,
          virtualizationStrategy: VirtualizationStrategy.ShiftOnlyFullyRendered,
          hoverTracker: hoverTracker
        }}
        getContentForColumns={getContent}
     />
  );
}
