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
import { CanvasAlignmentTiled } from "../CanvasAlignmentTiledComponent";
import { stopSafariFromBlockingWindowWheel } from "../../common/Utils";
import { MiniMapViewport } from "./MiniMapViewportComponent";
import { useDispatch, useSelector } from "react-redux";
import { RootState, setSequenceTopOffset } from "../../common/ReduxStore";
import { MinimapPositionHighlighter } from "./MinimapPositionHighlighterComponent";

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
  const [dragging, setDragging] = React.useState(false);
  const [dragStartOffset, setDragStartOffset] = React.useState<
    undefined | { left: number; top: number }
  >(undefined);
  const [resizedDimensions, setResizedDimensions] = React.useState<
    undefined | { width: number; height: number }
  >(undefined);

  //redux
  const dispatch = useDispatch();
  const alignmentDetails = useSelector(
    (state: RootState) => state.alignmentDetailsSlice
  );

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

  const frameSizing = (() => {
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
          options={{ transparent: false }}
          className="minimap-canvas"
        >
          <AppContext.Consumer>
            {(app) => (
              <MiniMapViewport
                app={app}
                //ensureVisible={
                //rowHighlightStart === undefined ||
                //rowHighlighterHeight === undefined
                // ? undefined
                // : {
                //     y: rowHighlightStart,
                //     height: rowHighlighterHeight,
                //   }
                //}
                numColumns={alignment.getMaxSequenceLength()}
                numRows={alignment.getSequenceCount()}
                onMouseClick={(mousePosition) => {
                  const newY = Math.round(
                    mousePosition.y -
                      alignmentDetails.seqIdxsToRender.length / 2
                  );
                  dispatch(setSequenceTopOffset(newY));
                  if (props.onClick) {
                    props.onClick(mousePosition);
                  }
                }}
                stageWidth={frameWidth}
                stageHeight={frameHeight}
              >
                <CanvasAlignmentTiled
                  sequences={alignment
                    .getSequences(sortBy)
                    .map((seq) => seq.sequence)}
                  consensusSequence={alignment.getConsensus().sequence}
                  querySequence={alignment.getQuerySequence().sequence}
                  alignmentType={alignmentStyle.alignmentType}
                  positionsToStyle={alignmentStyle.positionsToStyle}
                  colorScheme={alignmentStyle.colorScheme}
                  residueDetail={ResidueStyle.DARK}
                />
                {alignmentDetails.initialized !== true ||
                alignmentDetails.seqIdxsToRender.length < 1 ||
                alignmentDetails.sequenceCount <=
                  alignmentDetails.seqIdxsToRender.length ? (
                  <></>
                ) : (
                  <MinimapPositionHighlighter
                    fillColor={0xff0000}
                    fillAlpha={dragging ? 0.75 : 0.25}
                    x={0}
                    y={alignmentDetails.seqIdxsToRender[0]}
                    width={alignmentDetails.sequenceLength}
                    height={alignmentDetails.seqIdxsToRender.length}
                    dragFunctions={{
                      onDragStart: (e, parent) => {
                        const startPosition = e.data.getLocalPosition(parent);
                        setDragging(true);
                        setDragStartOffset({
                          left: startPosition.x - 0,
                          top:
                            startPosition.y -
                            alignmentDetails.seqIdxsToRender[0],
                        });
                      },
                      onDragEnd: (e, parent) => {
                        setDragging(false);
                        const finalPosition = e.data.getLocalPosition(parent);
                        dispatch(
                          setSequenceTopOffset(
                            Math.round(finalPosition.y - dragStartOffset!.top)
                          )
                        );
                      },
                      onDragMove: (e, parent) => {
                        if (dragging) {
                          const newPosition = e.data.getLocalPosition(parent);
                          dispatch(
                            setSequenceTopOffset(
                              Math.round(newPosition.y - dragStartOffset!.top)
                            )
                          );
                        }
                      },
                    }}
                  />
                )}
              </MiniMapViewport>
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
        width: !frameSizing ? 0 : frameSizing.frameWidth,
        borderWidth: !frameSizing ? 0 : frameSizing.borderWidth,
        margin: !frameSizing ? 0 : frameSizing.margin,
        resize: resizable ? resizable : "none",
        direction: alignHorizontal === "left" ? "ltr" : "rtl",
      }}
    >
      {!frameSizing
        ? null
        : renderAlignment(frameSizing.frameWidth, frameSizing.frameHeight)}
    </div>
  );
}
