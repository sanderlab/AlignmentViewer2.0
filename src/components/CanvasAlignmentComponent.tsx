import React from "react";
import { Alignment, SequenceSortOptions, ISequence } from "../common/Alignment";
import { Nucleotide, AminoAcid } from "../common/Residues";
import * as PIXI from "pixi.js";
import { Stage, Sprite, AppContext } from "@inlet/react-pixi";
import {
  CanvasAlignmentViewport,
  ICanvasAlignmentViewportProps,
} from "./CanvasAlignmentViewportComponent";
import { CanvasAlignmentHighlighter } from "./CanvasAlignmentHighlighterComponent";
import {
  CanvasAlignmentTiled,
  ITiledImages,
} from "./CanvasAlignmentTiledComponent";

import {
  IColorScheme,
  PositionsToStyle,
  AlignmentTypes,
} from "../common/MolecularStyles";
import _ from "lodash";

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

  dragPosition?: { x: number; y: number };
}

export class CanvasAlignmentComponent extends React.Component<
  ICanvasAlignmentProps,
  ICanvasAlignmentState
> {
  app?: PIXI.Application;
  scaleX: number = 1;
  scaleY: number = 1;

  static defaultProps = {
    mouseDown: () => {},
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
      onClickOrDrag: mouseDown,
      positionsToStyle,
      sortBy,
      stageResolution,
      viewportProps,
    } = this.props;
    const { dragging, dragPosition } = this.state;

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
      rowHighlighterHeight = highlightRows[1] - highlightRows[0];
      rowHighlightStart =
        dragging && dragPosition
          ? dragPosition.y - rowHighlighterHeight / 2
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
                mouseClick={mouseDown}
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
                rowHighlighterHeight !== undefined ? (
                  <CanvasAlignmentHighlighter
                    fillColor={0xff0000}
                    fillAlpha={0.25}
                    x={0}
                    y={rowHighlightStart}
                    width={maxSeqLength}
                    height={rowHighlighterHeight}
                    dragFunctions={{
                      onDragStart: (e) => {
                        this.setState({ dragging: true });
                      },
                      onDragEnd: (e, parent) => {
                        this.setState({ dragging: false });
                        const newPosition = e.data.getLocalPosition(parent);
                        newPosition.x = Math.round(newPosition.x);
                        newPosition.y = Math.round(newPosition.y);

                        if (mouseDown) {
                          mouseDown(newPosition.x, newPosition.y); //final release position
                        }
                      },
                      onDragMove: (e, parent) => {
                        if (dragging) {
                          const newPosition = e.data.getLocalPosition(parent);
                          newPosition.x = Math.round(newPosition.x);
                          newPosition.y = Math.round(newPosition.y);

                          this.setState({
                            dragPosition: newPosition,
                          });
                          if (mouseDown) {
                            mouseDown(newPosition.x, newPosition.y);
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

class PixiAlignmentTiled extends React.Component<ICanvasAlignmentProps> {
  shouldComponentUpdate(nextProps: ICanvasAlignmentProps) {
    return (
      nextProps.alignment !== this.props.alignment ||
      nextProps.colorScheme !== this.props.colorScheme ||
      nextProps.positionsToStyle !== this.props.positionsToStyle ||
      nextProps.sortBy !== this.props.sortBy
    );
  }

  render() {
    if (!this.props.alignment) {
      return null;
    }

    const {
      alignment,
      alignmentType,
      colorScheme,
      positionsToStyle,
      sortBy,
    } = this.props;

    // Generate multiple tiled images from the alignment
    const sequences = alignment.getSequences(sortBy);
    const fullWidth = alignment.getMaxSequenceLength();
    const fullHeight = sequences.length;

    const sizes = {
      fullWidth,
      fullHeight,
      targetTileWidth: Math.min(400, fullWidth),
      targetTileHeight: Math.min(400, fullHeight),
    };

    const tiledImages: ITiledImages = this.initializeTiledImages(sizes);

    for (
      let tileYNumber = 0;
      tileYNumber < tiledImages.numYTiles;
      tileYNumber++
    ) {
      for (
        let tileXNumber = 0;
        tileXNumber < tiledImages.numXTiles;
        tileXNumber++
      ) {
        const tiledImage = this.generateCanvasForTile(
          tileXNumber,
          tileYNumber,
          sizes.targetTileWidth,
          sizes.targetTileHeight,
          tiledImages,
          sequences
        );
        tiledImages.tiles.push(tiledImage);
      }
    }

    //console.log("CANVAS rerender [" + sortBy.key + "]", sequences);
    return (
      <>
        {tiledImages.tiles.map((tile) => (
          <Sprite
            source={tile.image}
            x={tile.pixelX}
            y={tile.pixelY}
            key={`${tile.tileX}_
                  ${tile.tileY}_
                  ${colorScheme.commonName}_
                  ${positionsToStyle.key}_
                  ${alignmentType.key}_
                  ${sortBy.key}_
                  ${alignment.getName()}`}
          ></Sprite>
        ))}
      </>
    );
  }

  protected colorCanvasWithSequence(
    tileImageData: ImageData,
    tileCanvasContext: CanvasRenderingContext2D,
    tileCanvas: HTMLCanvasElement,
    sequences: ISequence[],
    offsets: { seqY: number; letterX: number }
  ) {
    let imageDataIdx = 0;

    for (let seqIdx = 0; seqIdx < tileCanvas.height; seqIdx++) {
      const seq = sequences[seqIdx + offsets.seqY];
      for (let letterIdx = 0; letterIdx < tileCanvas.width; letterIdx++) {
        const letter = seq.sequence[letterIdx + offsets.letterX];
        const colorScheme = this.getCurrentMoleculeColors(
          letter,
          letterIdx,
          offsets
        );

        tileImageData.data[imageDataIdx] = colorScheme.rgb.red;
        tileImageData.data[imageDataIdx + 1] = colorScheme.rgb.green;
        tileImageData.data[imageDataIdx + 2] = colorScheme.rgb.blue;
        tileImageData.data[imageDataIdx + 3] = 255; //alpha between 0 (transparent) and 255 (opaque)

        imageDataIdx += 4;
      }
    }
    tileCanvasContext.putImageData(tileImageData, 0, 0);
  }

  protected generateCanvasForTile(
    tileXNumber: number,
    tileYNumber: number,
    targetTileWidth: number,
    targetTileHeight: number,
    tiledImages: ITiledImages,
    sequences: ISequence[]
  ) {
    const tileCanvas = document.createElement("canvas") as HTMLCanvasElement;
    tileCanvas.height =
      tileYNumber === tiledImages.numYTiles - 1
        ? tiledImages.lastTileHeight
        : targetTileHeight;
    tileCanvas.width =
      tileXNumber === tiledImages.numXTiles - 1
        ? tiledImages.lastTileWidth
        : targetTileWidth;

    const offsets = {
      seqY: tileYNumber * targetTileHeight,
      letterX: tileXNumber * targetTileWidth,
    };

    const tileCanvasContext = tileCanvas.getContext("2d");
    tileCanvasContext?.fillRect(0, 0, tileCanvas.width, tileCanvas.height); //unclear why necessary
    const tileImageData = tileCanvasContext?.getImageData(
      0,
      0,
      tileCanvas.width,
      tileCanvas.height
    );

    if (tileImageData && tileCanvasContext) {
      this.colorCanvasWithSequence(
        tileImageData,
        tileCanvasContext,
        tileCanvas,
        sequences,
        offsets
      );
    }

    return {
      tileX: tileXNumber,
      tileY: tileYNumber,
      pixelX: offsets.letterX,
      pixelY: offsets.seqY,
      width: tileCanvas.width,
      height: tileCanvas.height,
      image: tileCanvas,
    };
  }

  protected getCurrentMoleculeColors(
    letter: string,
    letterIdx: number,
    offsets: { seqY: number; letterX: number }
  ) {
    const { alignment, alignmentType, colorScheme } = this.props;
    const consensusSequence = alignment.getConsensus();
    const querySequence = alignment.getTargetSequence().sequence;
    const moleculeClass =
      alignmentType === AlignmentTypes.AMINOACID ? AminoAcid : Nucleotide;
    let molecule = moleculeClass.UNKNOWN;

    if (this.props.positionsToStyle === PositionsToStyle.ALL) {
      molecule = moleculeClass.fromSingleLetterCode(letter);
    } else {
      const isConsensus =
        consensusSequence[letterIdx + offsets.letterX].letter === letter;
      const isQuery = querySequence[letterIdx + offsets.letterX] === letter;
      if (
        (this.props.positionsToStyle === PositionsToStyle.CONSENSUS &&
          isConsensus) ||
        (this.props.positionsToStyle === PositionsToStyle.CONSENSUS_DIFF &&
          !isConsensus) ||
        (this.props.positionsToStyle === PositionsToStyle.QUERY && isQuery) ||
        (this.props.positionsToStyle === PositionsToStyle.QUERY_DIFF &&
          !isQuery)
      ) {
        molecule = moleculeClass.fromSingleLetterCode(letter);
      }
    }
    return molecule.colors[colorScheme.commonName];
  }

  protected initializeTiledImages({
    targetTileWidth = 0,
    targetTileHeight = 0,
    fullWidth = 0,
    fullHeight = 0,
  }): ITiledImages {
    return {
      targetTileWidth: targetTileWidth,
      targetTileHeight: targetTileHeight,
      lastTileWidth:
        fullWidth % targetTileWidth !== 0
          ? fullWidth % targetTileWidth
          : targetTileWidth,
      lastTileHeight:
        fullHeight % targetTileHeight !== 0
          ? fullHeight % targetTileHeight
          : targetTileHeight,
      numXTiles:
        fullWidth % targetTileWidth !== 0
          ? Math.floor(fullWidth / targetTileWidth) + 1
          : Math.floor(fullWidth / targetTileWidth),
      numYTiles:
        fullHeight % targetTileHeight !== 0
          ? Math.floor(fullHeight / targetTileHeight) + 1
          : Math.floor(fullHeight / targetTileHeight),
      tiles: [],
    };
  }
}
