import React from "react";
import Alignment, { SequenceSortOptions } from "./Alignment";
import { Nucleotide, AminoAcid } from "./Residues";
import * as PIXI from "pixi.js";
import { PixiComponent, Stage, Sprite, AppContext } from "@inlet/react-pixi";
import { Viewport } from "pixi-viewport";
import { Graphics } from "pixi.js";
import {
  IColorScheme,
  PositionsToStyle,
  AlignmentTypes
} from "./MolecularStyles";

export interface IAlignmentCanvasComponentProps {
  alignment: Alignment;
  alignmentType: AlignmentTypes;
  sortBy: SequenceSortOptions;
  positionsToStyle: PositionsToStyle;
  colorScheme: IColorScheme;
  highlightRows?: [number, number]; //[startRowNum, endRowNum]

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
  }
});

export class AlignmentCanvasComponent extends React.Component<
  IAlignmentCanvasComponentProps
> {
  app?: PIXI.Application;
  scaleX: number = 1;
  scaleY: number = 1;

  sliderChanged(newValue: number, xy: "x" | "y") {
    if (this.app) {
      this.app.stage.children.forEach(sprite => {
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
    const numSequences = this.props.alignment.getSequences().length;
    const maxSeqLength = this.props.alignment.getMaxSequenceLength();

    PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST; //
    //TODO: still anti-aliases on retina devices. probably requires
    //      writing 4x the pixels and telling pixi that it is a retina
    //      image
    //PIXI.settings.RESOLUTION = 2;
    //PIXI.settings.ROUND_PIXELS = true; //

    return (
      <div id={this.props.id}>
        <Stage width={485} height={650} options={{}}>
          <AppContext.Consumer>
            {app => {
              this.app = app;
              return <></>;
            }}
          </AppContext.Consumer>
          <AppContext.Consumer>
            {app => (
              <PixiViewport
                app={app}
                numColumns={maxSeqLength}
                numRows={numSequences}
                mouseDown={this.props.mouseDown}
              >
                <PixiAlignmentTiled
                  id="tiled-alignment"
                  alignment={this.props.alignment}
                  alignmentType={this.props.alignmentType}
                  sortBy={this.props.sortBy}
                  colorScheme={this.props.colorScheme}
                  positionsToStyle={this.props.positionsToStyle}
                />
                {this.props.highlightRows ? (
                  <>
                    <AlignmentHighlighter
                      x={0}
                      y={this.props.highlightRows[0]}
                      width={maxSeqLength / 100} //1%
                      height={
                        this.props.highlightRows[1] -
                        this.props.highlightRows[0]
                      }
                      fillColor={0xff0000}
                      fillAlpha={0.75}
                    />
                    <AlignmentHighlighter
                      x={maxSeqLength - maxSeqLength / 100}
                      y={this.props.highlightRows[0]}
                      width={maxSeqLength / 100} //1%
                      height={
                        this.props.highlightRows[1] -
                        this.props.highlightRows[0]
                      }
                      fillColor={0xff0000}
                      fillAlpha={0.75}
                    />
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
}
class PixiAlignmentTiled extends React.Component<
  IAlignmentCanvasComponentProps
> {
  shouldComponentUpdate(nextProps: IAlignmentCanvasComponentProps) {
    const toReturn =
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
    return toReturn;
  }

  render() {
    if (!this.props.alignment) {
      return null;
    }

    const sequences = this.props.alignment.getSequences(this.props.sortBy);
    const fullWidth = this.props.alignment.getMaxSequenceLength();
    const fullHeight = sequences.length;

    //
    //generate multiple tiled images from the alignment
    //
    const targetTileWidth = Math.min(400, fullWidth);
    const targetTileHeight = Math.min(400, fullHeight);

    const tiledImages: ITiledImages = {
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
      tiles: []
    };

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
        const tileCanvas = document.createElement(
          "canvas"
        ) as HTMLCanvasElement;
        tileCanvas.height =
          tileYNumber === tiledImages.numYTiles - 1
            ? tiledImages.lastTileHeight
            : targetTileHeight;
        tileCanvas.width =
          tileXNumber === tiledImages.numXTiles - 1
            ? tiledImages.lastTileWidth
            : targetTileWidth;

        const seqOffsetY = tileYNumber * targetTileHeight;
        const letterOffsetX = tileXNumber * targetTileWidth;

        const tileCanvasContext = tileCanvas.getContext("2d");
        tileCanvasContext?.fillRect(0, 0, tileCanvas.width, tileCanvas.height); //unclear why necessary
        const tileImageData = tileCanvasContext?.getImageData(
          0,
          0,
          tileCanvas.width,
          tileCanvas.height
        );

        const consensusSequence = this.props.alignment.getConsensus();
        const querySequence = this.props.alignment.getTargetSequence().sequence;
        const moleculeClass =
          this.props.alignmentType === AlignmentTypes.AMINOACID
            ? AminoAcid
            : Nucleotide;

        if (tileImageData && tileCanvasContext) {
          let imageDataIdx = 0;
          for (let seqIdx = 0; seqIdx < tileCanvas.height; seqIdx++) {
            const seq = sequences[seqIdx + seqOffsetY];
            for (let letterIdx = 0; letterIdx < tileCanvas.width; letterIdx++) {
              const letter = seq.sequence[letterIdx + letterOffsetX];
              let molecule = moleculeClass.UNKNOWN;

              if (this.props.positionsToStyle === PositionsToStyle.ALL) {
                molecule = moleculeClass.fromSingleLetterCode(letter);
              } else {
                const isConsensus =
                  consensusSequence[letterIdx + letterOffsetX].letter ===
                  letter;
                const isQuery =
                  querySequence[letterIdx + letterOffsetX] === letter;
                if (
                  (this.props.positionsToStyle === PositionsToStyle.CONSENSUS &&
                    isConsensus) ||
                  (this.props.positionsToStyle ===
                    PositionsToStyle.CONSENSUS_DIFF &&
                    !isConsensus) ||
                  (this.props.positionsToStyle === PositionsToStyle.QUERY &&
                    isQuery) ||
                  (this.props.positionsToStyle ===
                    PositionsToStyle.QUERY_DIFF &&
                    !isQuery)
                ) {
                  molecule = moleculeClass.fromSingleLetterCode(letter);
                }
              }

              const colorScheme =
                molecule.colors[this.props.colorScheme.commonName];
              tileImageData.data[imageDataIdx] = colorScheme.rgb.red;
              tileImageData.data[imageDataIdx + 1] = colorScheme.rgb.green;
              tileImageData.data[imageDataIdx + 2] = colorScheme.rgb.blue;
              tileImageData.data[imageDataIdx + 3] = 255; //alpha between 0 (transparent) and 255 (opaque)

              imageDataIdx += 4;
            }
          }
          tileCanvasContext.putImageData(tileImageData, 0, 0);
        }

        tiledImages.tiles.push({
          tileX: tileXNumber,
          tileY: tileYNumber,
          pixelX: letterOffsetX,
          pixelY: seqOffsetY,
          width: tileCanvas.width,
          height: tileCanvas.height,
          image: tileCanvas
        });
      }
    }

    console.log("CANVAS rerender [" + this.props.sortBy.key + "]", sequences);

    return (
      <>
        {tiledImages.tiles.map(tile => (
          <Sprite
            source={tile.image}
            x={tile.pixelX}
            y={tile.pixelY}
            key={`${tile.tileX}_
                  ${tile.tileY}_
                  ${this.props.colorScheme.commonName}_
                  ${this.props.positionsToStyle.key}_
                  ${this.props.alignmentType.key}_
                  ${this.props.sortBy.key}`}
          ></Sprite>
        ))}
      </>
    );
  }
}

const PixiViewport = PixiComponent<any, any>("PixiViewport", {
  create(props: any) {
    const app: PIXI.Application = props.app;
    app.renderer.backgroundColor = 0xffffff;
    const vp = new Viewport({
      screenWidth: app.renderer.width,
      screenHeight: app.renderer.height,
      worldWidth: props.numColumns, //app.renderer.width,
      worldHeight: props.numRows, //23627,
      interaction: app.renderer.plugins.interaction
    })
      .drag()
      .pinch()
      .wheel()
      .decelerate()
      .clamp({
        direction: "all"
      })
      .bounce({ friction: 0.1, time: 500, underflow: "center" })
      .clampZoom({
        maxHeight: props.app.renderer.height,
        maxWidth: props.app.renderer.width
      });

    vp.on("clicked", e => {
      if (props.mouseDown) {
        props.mouseDown(e.world.x, e.world.y);
      }
    });
    return vp;
  }
});
