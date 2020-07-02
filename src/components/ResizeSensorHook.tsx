/**
 * Hook for monitoring resizes
 *
 * partially inspired by:
 * https://medium.com/@teh_builder/ref-objects-inside-useeffect-hooks-eb7c15198780
 */
import "./ResizeSensor.scss";
import React, { useRef, ReactNode, useCallback } from "react";
import { ResizeSensor } from "css-element-queries";

export interface IAlignmentMetadataProps {
  onSizeChanged(bounds: {
    width: number;
    height: number;
    left: number;
    top: number;
  }): void;
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
  const resizeSensorRefCallback = useCallback(
    (node) => {
      if (resizeSensor.current) {
        //cleanup
        resizeSensor.current.detach();
        resizeSensor.current = undefined;
      }

      if (node) {
        // Check if a node is actually passed. Otherwise node would be null.
        // You can now do what you need to, addEventListeners, measure, etc.
        resizeSensor.current = new ResizeSensor(node, (dimensions) => {
          const rect = node.getBoundingClientRect() as DOMRect;
          if (
            !lastBounds.current ||
            lastBounds.current.left !== rect.left ||
            lastBounds.current.top !== rect.top ||
            lastBounds.current.width !== rect.width ||
            lastBounds.current.height !== rect.height
          ) {
            lastBounds.current = rect;
            onSizeChanged(rect);
          }
        });
      }

      // Save a reference to the node
      hiddenMeasuringDivRef.current = node;
    },
    [onSizeChanged]
  );

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
      <div ref={resizeSensorRefCallback} className="resize-sensor"></div>
      {children}
    </>
  );
}
