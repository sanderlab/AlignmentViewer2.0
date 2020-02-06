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

interface ISliderComponentProps {
  init: number;
  min: number;
  max: number;
  label: string;
  sliderChanged(newValue: number): void;
}
interface ISliderComponentState {
  value: number;
}

class SliderComponent extends React.Component<
  ISliderComponentProps,
  ISliderComponentState
> {
  constructor(props: ISliderComponentProps) {
    super(props);
    this.state = {
      value: this.props.init
    };
  }

  render() {
    return (
      <div>
        <label htmlFor={this.props.label}>{this.props.label}</label>
        <input
          type="range"
          min={this.props.min}
          max={this.props.max}
          value={this.state.value}
          className="slider"
          id={this.props.label}
          onChange={e => {
            const value = parseFloat(e.currentTarget.value);
            this.setState({
              value
            });
            this.props.sliderChanged(value);
          }}
        ></input>
        <span>({this.state.value})</span>
      </div>
    );
  }
}

export class AlignmentCanvasComponent extends React.Component<
  IAlignmentCanvasComponentProps
> {
  app?: PIXI.Application;
  scaleX: number = 1;
  scaleY: number = 1;

  constructor(props: IAlignmentCanvasComponentProps) {
    super(props);
  }

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
    if (!this.props.alignment || !this.props.characterWidth) {
      return null;
    }
    const numSequences = this.props.alignment.getSequences().length;
    const maxSeqLength = this.props.alignment.getMaxSequenceLength();

    PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST; //
    //TODO: still anti-aliases on retina devices. probably requires
    //      writing 4x the pixels and telling pixi that it is a reina
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
              >
                <PixiAlignmentTiled
                  id="tiled-alignment"
                  alignment={this.props.alignment}
                  characterWidth={this.props.characterWidth}
                />
              </PixiViewport>
            )}
          </AppContext.Consumer>
        </Stage>

        <SliderComponent
          init={1}
          min={1}
          max={10}
          label={"scaleX"}
          sliderChanged={newValue => {
            this.sliderChanged(newValue, "x");
          }}
        ></SliderComponent>

        <SliderComponent
          init={1}
          min={1}
          max={10}
          label={"scaleY"}
          sliderChanged={newValue => {
            this.sliderChanged(newValue, "y");
          }}
        ></SliderComponent>
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

              tileImageData.data[imageDataIdx] = aa.rgb.red;
              tileImageData.data[imageDataIdx + 1] = aa.rgb.green;
              tileImageData.data[imageDataIdx + 2] = aa.rgb.blue;

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

        {/* debugging - orient a zero zero 
        <Text
          text="0, 0"
          anchor={0}
          x={0}
          y={0}
          style={
            new TextStyle({
              fontSize: 25,
              fill: ["#000"]
            })
          }
        ></Text>*/}
      </>
    );
  }
}

const PixiViewport = PixiComponent<any, any>("PixiViewport", {
  create(props: any) {
    const app: PIXI.Application = props.app;
    app.renderer.backgroundColor = 0xffffff;

    return new Viewport({
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
  }
});
