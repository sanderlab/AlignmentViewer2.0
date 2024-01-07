/**
 * Hook for monitoring resizes. This needs to be placed in an absolute or relatively
 * positioned element to work.
 *
 * partially inspired by:
 * https://medium.com/@teh_builder/ref-objects-inside-useeffect-hooks-eb7c15198780
 */
import "./ResizeSensor.scss";
import React, { useRef, ReactNode, useCallback } from "react";
import { ResizeSensor } from "css-element-queries";

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
}

export function ReactResizeSensor(props: IAlignmentMetadataProps) {
  //props
  const { onSizeChanged, children } = props;

  //main ref
  const hiddenMeasuringDivRef = useRef<HTMLDivElement>();
  const resizeSensor = useRef<ResizeSensor>();

  //ref for last sizing
  const lastBounds = useRef<DOMRect>();

  //callback executed whenever ref changes
  const resizeSensorRefCallback = useCallback((node: HTMLDivElement) => {
    if (resizeSensor.current) {
      //cleanup
      resizeSensor.current.detach();
      resizeSensor.current = undefined;
    }

    if (node) {
      // Check if a node is actually passed. Otherwise node would be null.
      // You can now do what you need to, addEventListeners, measure, etc.
      resizeSensor.current = new ResizeSensor(node, () => {
        const rect = node.getBoundingClientRect() as DOMRect;
        if (
          !lastBounds.current ||
          //lastBounds.current.left !== rect.left ||
          //lastBounds.current.right !== rect.right ||
          //lastBounds.current.top !== rect.top ||
          lastBounds.current.width !== rect.width ||
          lastBounds.current.height !== rect.height
        ) {
          lastBounds.current = rect;
          onSizeChanged({
            width: rect.width,
            height: rect.height,
            getLiveLeft: ()=>{ 
              return hiddenMeasuringDivRef.current!.getBoundingClientRect().left;
            },
            getLiveRight: ()=>{ 
              return hiddenMeasuringDivRef.current!.getBoundingClientRect().width + 
                     hiddenMeasuringDivRef.current!.getBoundingClientRect().left;
            },
            getLiveTop: ()=>{ 
              return hiddenMeasuringDivRef.current!.getBoundingClientRect().top;
            }
          });
        }
      });
    }

    // Save a reference to the node
    hiddenMeasuringDivRef.current = node;
  }, [onSizeChanged]);

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
    <>
      <div ref={resizeSensorRefCallback} className="resize-sensor-holder"></div>
      {children}
    </>
  );
}
