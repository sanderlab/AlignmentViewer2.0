import "./AlignmentViewerLayout.scss"
import React, { useCallback, useRef, useState } from "react";

export interface IResizeGridProps{
  resizeSeparatorGridAreaNames: string[];
  keys: string[]; //if multiple are generated, the key of the one being resized will be passed to draggerMoved
  resizeDirection: "horizontal" | "vertical";
  draggerMoved: (
    newProposedPageXorY: number,
    key: string
  ) => void;
  zIndex?: number;
  resizerDoubleClicked?: (key: string) => void;
}

/**
 * react hook for dealing with resizing of grid elements.
 * @param props 
 * @returns 
 */
export function useResizeGrid(props: IResizeGridProps) {

  const {
    resizeSeparatorGridAreaNames,
    resizeDirection,
    draggerMoved,
    keys,
    zIndex,
    resizerDoubleClicked
  } = props;

  //
  // state
  //
  const [resizeDragging, setResizeDragging] = useState<boolean>(false);
  const [keyBeingResized, setKeyBeingResized] = useState<string>();
  const [keyBeingHovered, setKeyBeingHovered] = useState<string>();

  //
  // css
  //
  const classes = [`${resizeDirection}-resizer`];

  //
  // event callbacks
  //

  const startResizeDragging = useCallback((
    e: React.MouseEvent<HTMLDivElement, MouseEvent>
  )=>{
    //e.stopPropagation();
    e.preventDefault();
    setResizeDragging(true);
  }, []);

  const endResizeDragging = useCallback((
    e: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setResizeDragging(false);
    setKeyBeingResized(undefined);
  }, []);

  const resizeDragged = useCallback((
    e: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (resizeDragging){
      draggerMoved(
        resizeDirection==="horizontal" ? e.clientX : e.clientY,
        keyBeingResized!
      );
    }
  }, [
    keyBeingResized,
    resizeDragging,
    resizeDirection,
    draggerMoved
  ]);

  const resizeTimeout = useRef<NodeJS.Timeout>();

  return {
    draggerFullScreenElement: 
      <div 
        key={resizeSeparatorGridAreaNames.join("")}
        className={`full-screen-resize-dragger ${resizeDirection}`}
        style={{ display: !resizeDragging ? "none" : "block" }}
        onMouseMove={resizeDragged}
        onMouseUp={endResizeDragging}
        onMouseOut={endResizeDragging}
        onMouseLeave={endResizeDragging}
      />,
    resizeSeparators: resizeSeparatorGridAreaNames.reduce((acc, gridArea, idx) => {
      const resizingClass = resizeDragging && keys[idx] === keyBeingResized
        ? " resizing" : "";
      const hoveredClass = keys[idx] === keyBeingHovered
        ? " hovered" : "";
      acc[keys[idx]] = (
        <div 
          key={keys[idx]}
          className={classes.join(" ")+resizingClass+hoveredClass}
          style={{gridArea: gridArea, zIndex: zIndex}}
          onMouseDown={(e)=>{
            clearTimeout(resizeTimeout.current);
            resizeTimeout.current = setTimeout(()=>{
              setKeyBeingResized(keys[idx]);
              startResizeDragging(e);
            }, 150)
          }}
          onMouseUp={()=>{
            clearTimeout(resizeTimeout.current);
          }}
          onMouseOver={()=>{
            setKeyBeingHovered(keys[idx]);
          }}
          onMouseOut={()=>{
            setKeyBeingHovered(undefined);
          }}
          onDoubleClick={!resizerDoubleClicked ? undefined : ()=>{
            clearTimeout(resizeTimeout.current);
            resizerDoubleClicked(keys[idx]);
          }}
        />
      )
      return acc;
    }, {} as {[key: string]: JSX.Element})
  };
}
