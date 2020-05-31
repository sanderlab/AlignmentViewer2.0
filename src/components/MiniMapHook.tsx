import * as React from "react";
import "./MiniMap.scss";

import { CanvasAlignmentComponent } from "./CanvasAlignmentComponent";
import { Alignment } from "../common/Alignment";
import { SequenceSorter } from "../common/AlignmentSorter";
import {
  AminoAcidAlignmentStyle,
  NucleotideAlignmentStyle,
} from "../common/MolecularStyles";
import { ResizeSensor } from "css-element-queries";
import { useRef, useEffect } from "react";

export interface IMiniMapProps {
  //don't expose these props in the AlignmentViewer full component
  alignment: Alignment;
  sortBy: SequenceSorter;
  alignmentStyle: AminoAcidAlignmentStyle | NucleotideAlignmentStyle;

  //props that should be exposed in AlignmentViewer full component:
  alignHorizontal?: "left" | "right";
  startingWidth?: number;
  resizable?: "none" | "horizontal";
  verticalHeight?: "div" | "window";
}

export function MiniMap(props: IMiniMapProps) {
  const { alignment, sortBy, alignmentStyle } = props;

  //default props
  const alignHorizontal: IMiniMapProps["alignHorizontal"] = props.alignHorizontal
    ? props.alignHorizontal
    : "left";
  const resizable: IMiniMapProps["resizable"] = props.resizable
    ? props.resizable
    : "none";
  const startingWidth: IMiniMapProps["startingWidth"] = props.startingWidth
    ? props.startingWidth
    : 120;
  const verticalHeight: IMiniMapProps["verticalHeight"] = props.verticalHeight
    ? props.verticalHeight
    : "div";

  //ref to div
  const minimapRef = useRef<HTMLDivElement>(null);

  //state
  const [resizedDimensions, setResizedDimensions] = React.useState({
    width: 0,
    height: 0,
  });

  //sizing - dynamically update state when div changes size
  useEffect(() => {
    new ResizeSensor(minimapRef.current!, (x) => {
      if (minimapRef.current) {
        if (
          !resizedDimensions ||
          resizedDimensions.width !== minimapRef.current.clientHeight ||
          resizedDimensions.height !== minimapRef.current.clientWidth
        ) {
          setTimeout(() => {
            //flashes (worse) without setTimeout. Safari still flashing.
            setResizedDimensions({
              width: minimapRef.current!.clientWidth,
              height: minimapRef.current!.clientHeight,
            });
          });
        }
      }
    });
  }, []);

  const sizing = (() => {
    const frameBorderWidth = 1; // in pixels
    const frameMargin = 2; // in pixels

    function adjustForBorderAndMargin(length: number) {
      return length - 2 * frameMargin - 1 * frameBorderWidth;
    }

    return {
      borderWidth: frameBorderWidth,
      margin: frameMargin,
      frameHeight: resizedDimensions.height,
      frameWidth: resizedDimensions.width
        ? resizedDimensions.width
        : startingWidth,
    };
  })();

  const position = props.verticalHeight === "div" ? "absolute" : "fixed";
  return (
    <div
      ref={minimapRef}
      className="minimap-holder"
      style={{
        ...(alignHorizontal === "left" ? { left: 0 } : { right: 0 }),
        position: position,
        width: sizing.frameWidth,
        borderWidth: sizing.borderWidth,
        margin: sizing.margin,
        resize: resizable ? resizable : "none",
        direction: alignHorizontal === "left" ? "ltr" : "rtl",
      }}
    >
      <CanvasAlignmentComponent
        alignment={alignment}
        alignmentType={alignmentStyle.alignmentType}
        positionsToStyle={alignmentStyle.positionsToStyle}
        colorScheme={alignmentStyle.colorScheme}
        sortBy={sortBy}
        highlightRows={undefined}
        stageDimensions={{
          width: sizing.frameWidth - 14, //add space for the dragger on safari
          height: sizing.frameHeight,
        }}
        onClick={(pos) => {
          console.log("CLICK");
        }}
        onIndicatorDrag={(bounds, pos) => {
          console.log("DRAG");
        }}
      />
    </div>
  );
}
