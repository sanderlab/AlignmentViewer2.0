import React from "react";
import { Alignment, SequenceSortOptions, ISequence } from "../common/Alignment";
import { Nucleotide, AminoAcid } from "../common/Residues";
import * as PIXI from "pixi.js";
import { PixiComponent, Stage, Sprite, AppContext } from "@inlet/react-pixi";
import { Viewport } from "pixi-viewport";
import { Graphics } from "pixi.js";

import {
  IColorScheme,
  PositionsToStyle,
  AlignmentTypes,
} from "../common/MolecularStyles";

export interface IAlignmentCanvasProps {
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
  viewportProps?: Partial<IViewportProps>;

  mouseDown?(x: number, y: number): void;

  readonly id: string;
}

interface ITiledImages {
  targetTileWidth: number;
  targetTileHeight: number;
  lastTileWidth: number;
  lastTileHeight: number;
  numXTiles: number;
  numYTiles: number;
  tiles: {
    tileX: number;
    tileY: number;
    pixelX: number;
    pixelY: number;
    width: number;
    height: number;
    image: HTMLCanvasElement;
  }[];
}

const AlignmentHighlighter = PixiComponent("AlignmentHighlighter", {
  create: (props: any) => new Graphics(),
  applyProps: (instance, _, props) => {
    const { x, y, width, height, fillColor, fillAlpha } = props;
    instance.clear();
    instance.beginFill(fillColor, fillAlpha);
    instance.drawRect(x, y, width, height);
    instance.endFill();
  },
});

export class AlignmentCanvasComponent extends React.Component<
  IAlignmentCanvasProps
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

  sliderChanged(newValue: number, xy: "x" | "y") {
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
    const {
      alignment,
      alignmentType,
      colorScheme,
      highlightRows,
      id,
      positionsToStyle,
      sortBy,
      stageResolution,
      viewportProps,
    } = this.props;
    if (!alignment) {
      return null;
    }
    const numSequences = alignment.getSequences().length;
    const maxSeqLength = alignment.getMaxSequenceLength();

    PIXI.utils.skipHello();
    PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST; //
    //TODO: still anti-aliases on retina devices. probably requires
    //      writing 4x the pixels and telling pixi that it is a retina
    //      image
    //PIXI.settings.RESOLUTION = 2;
    //PIXI.settings.ROUND_PIXELS = true; //
    const height = highlightRows
      ? highlightRows[1] - highlightRows[0]
      : undefined;

    return (
      <div
        id={id}
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
              <PixiViewport
                app={app}
                numColumns={maxSeqLength}
                numRows={numSequences}
                mouseDown={this.props.mouseDown}
                {...viewportProps}
              >
                <PixiAlignmentTiled
                  id="tiled-alignment"
                  alignment={alignment}
                  alignmentType={alignmentType}
                  sortBy={sortBy}
                  colorScheme={colorScheme}
                  positionsToStyle={positionsToStyle}
                />
                {height ? (
                  <>
                    {this.renderAlignmentHighlighter({
                      x: 0,
                      y: this.props.highlightRows![0],
                      width: maxSeqLength,
                      height,
                    })}
                  </>
                ) : (
                  <></>
                )}
              </PixiViewport>
            )}
          </AppContext.Consumer>
        </Stage>
      </div>
    );
  }

  protected renderAlignmentHighlighter = (props: {
    x: number;
    y: number;
    width: number;
    height: number;
    fillColor?: number;
    fillAlpha?: number;
  }) => (
    <AlignmentHighlighter
      {...{ fillColor: 0xff0000, fillAlpha: 0.25, ...props }}
    />
  );

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
class PixiAlignmentTiled extends React.Component<IAlignmentCanvasProps> {
  shouldComponentUpdate(nextProps: IAlignmentCanvasProps) {
    const toReturn =
      nextProps.alignment !== this.props.alignment ||
      nextProps.colorScheme !== this.props.colorScheme ||
      nextProps.positionsToStyle !== this.props.positionsToStyle ||
      nextProps.sortBy !== this.props.sortBy;
    /*console.log(
      "UPDATING Canvas Tiling: " +
        (nextProps.colorScheme !== this.currentColorScheme) +
        ":" +
        (nextProps.positionsToStyle !== this.currentPositionsStyled) +
        " :: " +
        toReturn
    );*/
    //console.log("CANVAS rerender??");
    return toReturn;
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

export interface IViewportProps {
  useDrag?: boolean; // Allows the user to drag the viewport around.
  usePinch?: boolean; // Allows the user to pinch to zoom; e.g. on a trackpad.
  useWheel?: boolean; // Allows the user to use a mouse wheel to zoom.
  numColumns: number;
  numRows: number;
  app: PIXI.Application;
  mouseDown?: (x: number, y: number) => void;
  zoomPercent?: number;
}

const PixiViewport = PixiComponent<IViewportProps, any>("PixiViewport", {
  create(props: IViewportProps) {
    const {
      app,
      numColumns,
      numRows,
      useDrag,
      usePinch,
      useWheel,
      zoomPercent,
    } = props;
    app.renderer.backgroundColor = 0xffffff;

    let vp = new Viewport({
      screenWidth: app.renderer.width,
      screenHeight: app.renderer.height,
      worldWidth: numColumns,
      worldHeight: numRows,
      interaction: app.renderer.plugins.interaction,
    })
      .decelerate()
      .clamp({
        direction: "all",
      })
      .bounce({ friction: 0.1, time: 150, underflow: "center" })
      .clampZoom({
        maxHeight: app.renderer.height,
        maxWidth: app.renderer.width,
      });
    /*
      .drag()
      .pinch()
      .wheel()
      .decelerate()
      .clamp({
        direction: "all"
      })
      .bounce({ friction: 0.1, time: 500, underflow: "center" })
      .clampZoom({
        maxHeight: app.renderer.height,
        maxWidth: app.renderer.width
      });*/

    // !IMPORTANT
    // Two-finger drag on trackpad is also enabled by this.
    // Issue currently open: https://github.com/davidfig/pixi-viewport/issues/143
    if (useDrag) {
      vp = vp.drag({
        direction: "all", //this is the line that kills pinch
      });
    }

    if (usePinch) {
      vp = vp.pinch();
    }

    if (useWheel) {
      vp = vp.wheel();
    }

    if (zoomPercent) {
      vp = vp.zoomPercent(zoomPercent);
    }
    vp.on("clicked", (e) => {
      if (props.mouseDown) {
        props.mouseDown(e.world.x, e.world.y);
      }
    });

    //start the component zoomed such that the entire alignment width
    //is visible in the frame.
    //vp = vp.setZoom(app.renderer.width / numColumns, true);
    //vp = vp.fitWorld(true);
    return vp;
  },

  applyProps(
    vp: Viewport, //PIXI.Graphics,
    oldProps: IViewportProps,
    newProps: IViewportProps
  ) {
    //if (oldProps.zoomPercent !== newProps.zoomPercent && newProps.zoomPercent) {
    //  viewport = viewport.setZoom(newProps.zoomPercent, false);
    // }
    //vp = vp.fitWorld(true);
    //vp = vp.setZoom(50, false);
    if (
      oldProps.numColumns !== newProps.numColumns ||
      oldProps.numRows !== newProps.numRows
    ) {
      vp.screenWidth = newProps.app.renderer.width;
      vp.screenHeight = newProps.app.renderer.height;
      vp.worldWidth = newProps.numColumns;
      vp.worldHeight = newProps.numRows;
      vp = vp.fitWorld(true);
      vp = vp.setZoom(newProps.app.renderer.width / newProps.numColumns, false);
    }
    return vp;
  },
});
