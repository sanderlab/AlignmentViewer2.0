import React from "react";
import Alignment from "./Alignment";
import AminoAcid from "./AminoAcid";
import * as PIXI from "pixi.js";
import {
  PixiComponent,
  Stage,
  Sprite,
  AppContext,
  Text
} from "@inlet/react-pixi";
import { Viewport } from "pixi-viewport";
import { TextStyle } from "pixi.js";

export interface IAlignmentCanvasComponentProps {
  alignment: Alignment;
  characterWidth: number;

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

export class AlignmentCanvasComponent extends React.Component<
  IAlignmentCanvasComponentProps
> {
  app?: PIXI.Application;

  constructor(props: IAlignmentCanvasComponentProps) {
    super(props);
  }

  buttonClicked(e: React.MouseEvent<HTMLInputElement, MouseEvent>) {
    console.log(this.app);
    if (this.app) {
      if (e.currentTarget.checked) {
        //this.app.stage.scale.x = 10;
        this.app.stage.children.forEach(sprite => {
          console.log("sprite", sprite);
          sprite.scale.x = 10;
        });
      } else {
        //this.app.stage.scale.x = 1;
        this.app.stage.children.forEach(sprite => {
          console.log("sprite", sprite);
          sprite.scale.x = 1;
        });
      }
    }
  }

  render() {
    if (!this.props.alignment || !this.props.characterWidth) {
      return null;
    }

    const maxSeqLength = this.props.alignment.getMaxSequenceLength();
    const totalWidth = this.props.characterWidth * maxSeqLength;

    PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST; //
    return (
      <div id={this.props.id}>
        <Stage width={maxSeqLength * 2} height={650} options={{}}>
          <AppContext.Consumer>
            {app => {
              this.app = app;
              return <></>;
            }}
          </AppContext.Consumer>
          <AppContext.Consumer>
            {app => (
              <PixiViewport app={app}>
                <PixiAlignmentTiled
                  id="tiled-alignment"
                  alignment={this.props.alignment}
                  characterWidth={this.props.characterWidth}
                />
              </PixiViewport>
            )}
          </AppContext.Consumer>
        </Stage>
        <input
          type="checkbox"
          onClick={e => this.buttonClicked(e)}
          name="scaleX"
          id="scaleX"
        ></input>
        <label htmlFor="scaleX">scaleX</label>
      </div>
    );
  }
}
class PixiAlignmentTiled extends React.Component<
  IAlignmentCanvasComponentProps
> {
  private fullOffscreenImageData?: ImageData;

  render() {
    if (!this.props.alignment) {
      return null;
    }

    let letterCount = 0; //stats
    const start = new Date().getMilliseconds();

    const sequences = this.props.alignment.getSequences();
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

        if (tileImageData && tileCanvasContext) {
          let imageDataIdx = 0;
          for (let seqIdx = 0; seqIdx < tileCanvas.height; seqIdx++) {
            const seq = sequences[seqIdx + seqOffsetY];
            for (let letterIdx = 0; letterIdx < tileCanvas.width; letterIdx++) {
              const letter = seq.sequence[letterIdx + letterOffsetX];
              const aa = AminoAcid.fromSingleLetterCode(letter);

              tileImageData.data[imageDataIdx] = aa.rgba[0];
              tileImageData.data[imageDataIdx + 1] = aa.rgba[1];
              tileImageData.data[imageDataIdx + 2] = aa.rgba[2];

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

    console.log("tiledImages", tiledImages);
    return (
      <>
        {tiledImages.tiles.map(tile => (
          <Sprite
            source={tile.image}
            x={tile.pixelX}
            y={tile.pixelY}
            key={`${tile.tileX}_${tile.tileY}`}
          ></Sprite>
        ))}
        <Text
          text="0, 0"
          anchor={0}
          x={0}
          y={0}
          style={
            new TextStyle({
              fontSize: 50,
              fill: ["#ffffff"]
            })
          }
        ></Text>
      </>
    );
  }
}

const PixiViewport = PixiComponent<any, any>("PixiViewport", {
  create(props: any) {
    const app: PIXI.Application = props.app;
    console.log(
      JSON.stringify({
        screenWidth: props.app.renderer.width,
        screenHeight: props.app.renderer.height,
        worldWidth: 1000,
        worldHeight: 1000
      })
    );

    return new Viewport({
      screenWidth: props.app.renderer.width,
      screenHeight: props.app.renderer.height,
      worldWidth: props.app.renderer.width,
      worldHeight: 24000,
      interaction: props.app.renderer.plugins.interaction
    })

      .drag()
      .pinch()
      .wheel()
      .decelerate()
      .clamp({
        top: true,
        bottom: true,
        right: true,
        left: true
      });
  }
});
