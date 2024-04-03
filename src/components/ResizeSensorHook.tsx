/**
 * Hook for monitoring resizes. This needs to be placed in an absolute or relatively
 * positioned element to work.
 *
 * partially inspired by:
 * https://medium.com/@teh_builder/ref-objects-inside-useeffect-hooks-eb7c15198780
 */
import "./ResizeSensor.scss";
import React, { useRef, ReactNode, useEffect } from "react";
import useSize from "@react-hook/size"

export interface IBounds {
  width: number;
  height: number;

  //the resize sensor does not detect position changes, only width/height
  //changes. The positional info can be stale if the size doesn't change
  //but the position does (e.g., hover tracking after a barplot/logo etc is 
  //removed) - so query position when the user wants it and try to make
  //clear that the sensor isn't detecting position changes..
  getLiveLeft: ()=>number;
  getLiveRight: ()=>number;
  getLiveTop: ()=>number;
}
export interface IAlignmentMetadataProps {
  onSizeChanged(bounds: IBounds): void;
  children?: ReactNode;
  logId: string;
}

export function ReactResizeSensor(props: IAlignmentMetadataProps) {
  //props
  const { onSizeChanged, children, logId} = props;

  const target = useRef<HTMLDivElement>(null);
  const [width, height] = useSize(target);

  useEffect(()=>{
    onSizeChanged({
      width: width,
      height: height,
      getLiveLeft: ()=>{ 
        const toreturn = target.current ? target.current.getBoundingClientRect().left : 0;
        return toreturn;
      },
      getLiveRight: ()=>{ 
        const toreturn = target.current
          ? target.current.getBoundingClientRect().width + 
            target.current!.getBoundingClientRect().left
          : 0;
        return toreturn;
      },
      getLiveTop: ()=>{ 
        const toreturn = target.current ? target.current.getBoundingClientRect().top : 0;
        return toreturn;
      }
    });
  }, [onSizeChanged, width, height, logId]);

  return (
    <>
      <div ref={target} className="resize-sensor-holder"></div>
      {children}
    </>
  );
}
