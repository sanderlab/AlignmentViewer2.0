import React from "react";
import { Alignment, SequenceSortOptions } from "../common/Alignment";
import * as PIXI from "pixi.js";
import { Stage, AppContext } from "@inlet/react-pixi";
import {
  CanvasAlignmentViewport,
  ICanvasAlignmentViewportProps,
} from "./CanvasAlignmentViewportComponent";
import { CanvasAlignmentHighlighter } from "./CanvasAlignmentHighlighterComponent";
import { CanvasAlignmentTiled } from "./CanvasAlignmentTiledComponent";

import {
  IColorScheme,
  PositionsToStyle,
  AlignmentTypes,
} from "../common/MolecularStyles";

export interface ICanvasAlignmentProps {
  alignment: Alignment;
  alignmentType: AlignmentTypes;
  sortBy: SequenceSortOptions;
  positionsToStyle: PositionsToStyle;
  colorScheme: IColorScheme;
  highlightRows?: [number, number]; //[startRowNum, endRowNum]
  stageResolution?: {
    width: number;
    height: number;
  };
  viewportProps?: Partial<ICanvasAlignmentViewportProps>;

  onClickOrDrag?(x: number, y: number): void;
}

interface ICanvasAlignmentState {
  dragging: boolean;

  dragPositions?: {
    startOffset: {
      left: number;
      top: number;
    };
    current: PIXI.Point;
  };
}

export class CanvasAlignmentComponent extends React.Component<
  ICanvasAlignmentProps,
  ICanvasAlignmentState
> {
  app?: PIXI.Application;
  scaleX: number = 1;
  scaleY: number = 1;

  static defaultProps = {
    stageResolution: {
      width: 485,
      height: 650,
    },
    viewportProps: {
      useDrag: true,
      usePinch: true,
      useWheel: true,
      zoomPercent: 0,
    },
  };

  constructor(props: ICanvasAlignmentProps) {
    super(props);
    this.state = {
      dragging: false,
    };
  }

  protected sliderChanged(newValue: number, xy: "x" | "y") {
    if (this.app) {
      this.app.stage.children.forEach((sprite) => {
        if (xy === "x") {
          sprite.scale.x = newValue;
        } else {
          sprite.scale.y = newValue;
        }
      });
    }
  }

  render() {
    if (!this.props.alignment) {
      return null;
    }

    const {
      alignment,
      alignmentType,
      colorScheme,
      highlightRows,
      onClickOrDrag,
      positionsToStyle,
      sortBy,
      stageResolution,
      viewportProps,
    } = this.props;
    const { dragging, dragPositions } = this.state;

    const numSequences = alignment.getSequences().length;
    const maxSeqLength = alignment.getMaxSequenceLength();

    PIXI.utils.skipHello();
    PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST; //
    //TODO: still anti-aliases on retina devices. probably requires
    //      writing 4x the pixels and telling pixi that it is a retina
    //      image
    //PIXI.settings.RESOLUTION = 2;
    //PIXI.settings.ROUND_PIXELS = true; //

    let rowHighlightStart: number | undefined;
    let rowHighlighterHeight: number | undefined;

    if (highlightRows) {
      rowHighlighterHeight = highlightRows[1] - highlightRows[0] + 1; //why +1? start/end inclusive
      rowHighlightStart =
        dragging && dragPositions
          ? Math.round(dragPositions.current.y - dragPositions.startOffset.top)
          : highlightRows[0];
      rowHighlightStart = rowHighlightStart > 0 ? rowHighlightStart : 0;
    }

    return (
      <div
        className="alignment-canvas"
        onWheel={this.onWheel}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
      >
        <Stage
          width={stageResolution?.width}
          height={stageResolution?.height}
          options={{ transparent: true }}
        >
          <AppContext.Consumer>
            {(app) => {
              this.app = app;
              return <></>;
            }}
          </AppContext.Consumer>
          <AppContext.Consumer>
            {(app) => (
              <CanvasAlignmentViewport
                app={app}
                numColumns={maxSeqLength}
                numRows={numSequences}
                mouseClick={onClickOrDrag}
                {...viewportProps}
              >
                <CanvasAlignmentTiled
                  alignment={alignment}
                  alignmentType={alignmentType}
                  sortBy={sortBy}
                  colorScheme={colorScheme}
                  positionsToStyle={positionsToStyle}
                />
                {rowHighlightStart !== undefined &&
                rowHighlighterHeight !== undefined &&
                rowHighlighterHeight < alignment.getSequences().length ? (
                  <CanvasAlignmentHighlighter
                    fillColor={0xff0000}
                    fillAlpha={0.25}
                    x={0}
                    y={rowHighlightStart}
                    width={maxSeqLength}
                    height={rowHighlighterHeight}
                    dragFunctions={{
                      onDragStart: (e, parent) => {
                        const startPosition = e.data.getLocalPosition(parent);
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
                        const finalPosition = e.data.getLocalPosition(parent);

                        if (onClickOrDrag) {
                          //final release position
                          onClickOrDrag(
                            Math.round(finalPosition.x),
                            Math.round(
                              finalPosition.y - dragPositions!.startOffset.top
                            )
                          );
                        }
                      },
                      onDragMove: (e, parent) => {
                        if (dragging) {
                          const newPosition = e.data.getLocalPosition(parent);

                          this.setState({
                            dragPositions: {
                              startOffset: dragPositions!.startOffset,
                              current: newPosition,
                            },
                          });
                          if (onClickOrDrag) {
                            onClickOrDrag(
                              Math.round(newPosition.x),
                              Math.round(
                                newPosition.y - dragPositions!.startOffset.top
                              )
                            );
                          }
                        }
                      },
                    }}
                  />
                ) : (
                  <></>
                )}
              </CanvasAlignmentViewport>
            )}
          </AppContext.Consumer>
        </Stage>
      </div>
    );
  }

  protected onMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    document.body.style.overflow = "hidden";
  };

  protected onMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    document.body.style.overflow = "auto";
  };

  protected onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    //e.preventDefault(); //TODO Drew is this necessary?
  };
}
