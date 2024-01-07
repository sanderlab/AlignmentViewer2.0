import "./AlignmentViewerLayout.scss"
import React, { useCallback, useState } from "react";

export interface IResizeGridProps{
  resizeSeparatorGridAreaName: string;
  resizeDirection: "horizontal" | "vertical";
  draggerMoved: (newProposedPageXorY: number) => void;
}

/**
 * react hook for dealing with resizing of grid elements.
 * @param props 
 * @returns 
 */
export function useResizeGrid(props: IResizeGridProps) {

  const {
    resizeSeparatorGridAreaName,
    resizeDirection,
    draggerMoved
  } = props;

  //
  // state
  //
  const [resizeDragging, setResizeDragging] = useState<boolean>(false);

  //
  // css
  //
  const classes = [`${resizeDirection}-resizer`];
  if (resizeDragging) classes.push("resizing");

  //
  // event callbacks
  //

  const startResizeDragging = useCallback((
    e: React.MouseEvent<HTMLDivElement, MouseEvent>
  )=>{
    e.stopPropagation();
    e.preventDefault();
    setResizeDragging(true);
  }, []);

  const endResizeDragging = useCallback((
    e: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setResizeDragging(false);
  }, []);

  const resizeDragged = useCallback((
    e: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (resizeDragging){
      draggerMoved(
        resizeDirection==="horizontal" ? e.clientX : e.clientY
      );
    }
  }, [
    resizeDragging,
    resizeDirection,
    draggerMoved
  ]);
  
  return {
    draggerFullScreenElement: 
      <div 
        className="full-screen-resize-dragger"
        style={{
          display: !resizeDragging ? "none" : "block"
        }}
        onMouseMove={resizeDragged}
        onMouseUp={endResizeDragging}
        onMouseOut={endResizeDragging}
        onMouseLeave={endResizeDragging}
      />,
    resizeSeparator:
      <div 
        className={classes.join(" ")}
        style={{gridArea: resizeSeparatorGridAreaName}}
        onMouseDown={startResizeDragging}
      />
  };
}
