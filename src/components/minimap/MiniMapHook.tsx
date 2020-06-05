import * as React from "react";
import "./MiniMap.scss";
import * as PIXI from "pixi.js";

import { Alignment } from "../../common/Alignment";
import { SequenceSorter } from "../../common/AlignmentSorter";
import {
  AminoAcidAlignmentStyle,
  NucleotideAlignmentStyle,
  ResidueStyle,
} from "../../common/MolecularStyles";
import { ResizeSensor } from "css-element-queries";
import { useRef, useEffect } from "react";
import { Stage, AppContext } from "@inlet/react-pixi";
import { CanvasAlignmentViewport } from "../CanvasAlignmentViewportComponent";
import { CanvasAlignmentTiled } from "../CanvasAlignmentTiledComponent";
import { stopSafariFromBlockingWindowWheel } from "../../common/Utils";

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

  //events for parents
  onClick?(mousePosition: IPosition): void;
  //onIndicatorDrag?(indicatorBounds: IRectangle, mousePosition: IPosition): void;
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
  const [resizedDimensions, setResizedDimensions] = React.useState<
    undefined | { width: number; height: number }
  >(undefined);

  //sizing - dynamically update state when div changes size
  useEffect(() => {
    PIXI.utils.skipHello();
    PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

    //fix safari-specific bug - this function will tell the window to stop
    //blocking scroll events on the "minimap-canvas" class
    stopSafariFromBlockingWindowWheel("minimap-canvas");

    if (minimapRef.current) {
      const rs = new ResizeSensor(minimapRef.current, (x) => {
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
      return () => {
        rs.detach();
      };
    } else {
      console.error(
        "Unable to add resize sensor as minimapRef.current was not defined",
        minimapRef
      );
    }
  }, []);

  const sizing = (() => {
    if (!resizedDimensions) return undefined;
    const frameBorderWidth = 1; // in pixels
    const frameMargin = 2; // in pixels

    return {
      borderWidth: frameBorderWidth,
      margin: frameMargin,
      frameHeight: resizedDimensions.height,
      frameWidth: resizedDimensions.width
        ? resizedDimensions.width
        : startingWidth,
    };
  })();

  const renderAlignment = (frameWidth: number, frameHeight: number) => {
    return (
      <div
        className="alignment-canvas"
        onWheel={(e) => {
          //e.stopPropagation();
          //console.log("minimap:  WHEEL");
          //e.preventDefault();
        }}
        onMouseEnter={(e) => {
          //e.stopPropagation();
          //console.log("minimap:  mouse enter");
        }}
        onMouseLeave={(e) => {
          //e.stopPropagation();
          //console.log("minimap: mouse leave");
        }}
      >
        <Stage
          width={frameWidth - 14} //add space for the dragger on safari
          height={frameHeight}
          options={{ transparent: true }}
          className="minimap-canvas"
        >
          <AppContext.Consumer>
            {(app) => (
              <CanvasAlignmentViewport
                app={app}
                /*ensureVisible={
              rowHighlightStart === undefined ||
              rowHighlighterHeight === undefined
                ? undefined
                : {
                    y: rowHighlightStart,
                    height: rowHighlighterHeight,
                  }
            }*/
                numColumns={alignment.getMaxSequenceLength()}
                numRows={alignment.getSequenceCount()}
                onMouseClick={props.onClick}
                stageWidth={frameWidth}
                stageHeight={frameHeight}
                {...props}
              >
                <CanvasAlignmentTiled
                  alignment={alignment}
                  alignmentType={alignmentStyle.alignmentType}
                  positionsToStyle={alignmentStyle.positionsToStyle}
                  colorScheme={alignmentStyle.colorScheme}
                  sortBy={sortBy}
                  residueDetail={ResidueStyle.DARK}
                />
                {/*rowHighlightStart !== undefined &&
            rowHighlighterHeight !== undefined &&
            rowHighlighterHeight < alignment.getSequenceCount() ? (
              <CanvasAlignmentHighlighter
                fillColor={0xff0000}
                fillAlpha={0.25}
                x={0}
                y={rowHighlightStart}
                width={maxSeqLength}
                height={rowHighlighterHeight}
                dragFunctions={{
                  onDragStart: (e, parent) => {
                    const startPosition = e.data.getLocalPosition(
                      parent
                    );
                    this.setState({
                      dragging: true,
                      dragPositions: {
                        startOffset: {
                          left: startPosition.x - 0,
                          top: startPosition.y - rowHighlightStart!,
                        },
                        current: startPosition,
                      },
                    });
                  },
                  onDragEnd: (e, parent) => {
                    this.setState({ dragging: false });
                    this.informParentOfIndicatorDragged(
                      e.data.getLocalPosition(parent)
                    );
                  },
                  onDragMove: (e, parent) => {
                    if (dragging) {
                      const newPosition = e.data.getLocalPosition(
                        parent
                      );
  
                      this.setState({
                        dragPositions: {
                          startOffset: dragPositions!.startOffset,
                          current: newPosition,
                        },
                      });
                      this.informParentOfIndicatorDragged(newPosition);
                    }
                  },
                }}
              />
            ) : (
              <></>
            )*/}
              </CanvasAlignmentViewport>
            )}
          </AppContext.Consumer>
        </Stage>
      </div>
    );
  };

  return (
    <div
      ref={minimapRef}
      className="minimap-holder"
      style={{
        ...(alignHorizontal === "left" ? { left: 0 } : { right: 0 }),
        position: verticalHeight === "div" ? "absolute" : "fixed",
        width: !sizing ? 0 : sizing.frameWidth,
        borderWidth: !sizing ? 0 : sizing.borderWidth,
        margin: !sizing ? 0 : sizing.margin,
        resize: resizable ? resizable : "none",
        direction: alignHorizontal === "left" ? "ltr" : "rtl",
      }}
    >
      {!sizing ? null : renderAlignment(sizing.frameWidth, sizing.frameHeight)}

      {!sizing ? null : (
        <></>
        /*
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
        />*/
      )}
    </div>
  );
}
