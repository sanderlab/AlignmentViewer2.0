import React from "react";
import { Sprite } from "@pixi/react";
import { Nucleotide, AminoAcid } from "../common/Residues";

import {
  PositionsToStyle,
  AlignmentTypes,
  IColorScheme,
  ResidueStyle,
} from "../common/MolecularStyles";
import { generateUUIDv4 } from "../common/Utils";

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

export interface ICanvasAlignmentTiledProps {
  sequences: string[];
  consensusSequence: string;
  querySequence: string;
  alignmentType: AlignmentTypes;
  positionsToStyle: PositionsToStyle;
  colorScheme: IColorScheme;
  residueDetail: ResidueStyle;
  scale?: { x: number; y: number };
  translateY?: number;
  translateX?: number;
}

export class CanvasAlignmentTiled extends React.Component<
  ICanvasAlignmentTiledProps
> {
  //shallow array equality
  protected arraysEqual(
    arr1: number[] | string[] | undefined,
    arr2: number[] | string[] | undefined
  ) {
    if (arr1 === undefined || arr2 === undefined) {
      return arr1 === arr2;
    }
    return (
      arr1.length === arr2.length &&
      arr1.every((element: string | number, index: number) => {
        return element === arr2[index];
      })
    );
  }

  shouldComponentUpdate(nextProps: ICanvasAlignmentTiledProps) {
    return (
      !this.arraysEqual(nextProps.sequences, this.props.sequences) ||
      nextProps.consensusSequence !== this.props.consensusSequence ||
      nextProps.querySequence !== this.props.querySequence ||
      nextProps.colorScheme !== this.props.colorScheme ||
      nextProps.positionsToStyle !== this.props.positionsToStyle ||
      nextProps.scale !== this.props.scale ||
      nextProps.translateX !== this.props.translateX ||
      nextProps.translateY !== this.props.translateY
    );
  }

  render() {
    const {
      sequences,
      alignmentType,
      colorScheme,
      positionsToStyle,
      residueDetail,
      scale,
    } = this.props;

    // Generate multiple tiled images from the alignment
    const fullWidth = sequences.length > 0 ? sequences[0].length : 0;
    const fullHeight = sequences.length;

    const sizes = {
      fullWidth,
      fullHeight,
      targetTileWidth: Math.min(500, fullWidth),
      targetTileHeight: Math.min(500, fullHeight),
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

    return (
      <>
        {tiledImages.tiles.map((tile) => (
          <Sprite
            source={tile.image}
            x={
              tile.pixelX * (scale ? scale.x : 1) +
              (this.props.translateX ? this.props.translateX : 0)
            }
            y={
              tile.pixelY * (scale ? scale.y : 1) +
              (this.props.translateY ? this.props.translateY : 0)
            }
            scale={scale ? [scale.x, scale.y] : [1, 1]}
            key={`${tile.tileX}_
                  ${tile.tileY}_
                  ${colorScheme.commonName}_
                  ${positionsToStyle.key}_
                  ${alignmentType.key}_
                  ${residueDetail.key}_
                  ${this.props.scale}_
                  ${this.props.translateY}_
                  ${this.props.translateX}_
                  ${
                    //outputting all sequences leads to huge memory usage!
                    //outputting ids may cause duplicates if changes sequences
                    //TODO: modify to return same value based on seq - but shorter. unclear how.
                    //   maybe "uuid-by-string" library (https://www.npmjs.com/package/uuid-by-string?
                    //   or add uuid to ISequence an output here (probably not as one could
                    //   presumably cut up sequences before, e.g., if we don't output
                    //   complete sequences, but only viewport sequences, in the future?
                    generateUUIDv4() /*sequences.map((seq, idx) => idx).join("")*/
                  }`}
            roundPixels={true}
          ></Sprite>
        ))}
      </>
    );
  }

  protected colorCanvasWithSequence(
    tileImageData: ImageData,
    tileCanvasContext: CanvasRenderingContext2D,
    tileCanvas: HTMLCanvasElement,
    sequences: string[],
    offsets: { seqY: number; letterX: number }
  ) {
    let imageDataIdx = 0;

    for (let seqIdx = 0; seqIdx < tileCanvas.height; seqIdx++) {
      const seq = sequences[seqIdx + offsets.seqY];
      for (let letterIdx = 0; letterIdx < tileCanvas.width; letterIdx++) {
        const letter = seq[letterIdx + offsets.letterX];
        const colorScheme = this.getCurrentMoleculeColors(
          letter,
          letterIdx,
          offsets
        );

        tileImageData.data[imageDataIdx] = colorScheme.red;
        tileImageData.data[imageDataIdx + 1] = colorScheme.green;
        tileImageData.data[imageDataIdx + 2] = colorScheme.blue;
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
    sequences: string[]
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

  protected static WHITE_RGB = { red: 255, green: 255, blue: 255 };
  protected getCurrentMoleculeColors(
    letter: string,
    letterIdx: number,
    offsets: { seqY: number; letterX: number }
  ) {
    const {
      consensusSequence,
      querySequence,
      alignmentType,
      colorScheme,
      positionsToStyle,
      residueDetail,
    } = this.props;
    const moleculeClass =
      alignmentType === AlignmentTypes.AMINOACID ? AminoAcid : Nucleotide;
    let molecule = moleculeClass.UNKNOWN;

    if (positionsToStyle === PositionsToStyle.ALL) {
      molecule = moleculeClass.fromSingleLetterCode(letter);
    } else {
      const isConsensus =
        consensusSequence[letterIdx + offsets.letterX] === letter;
      const isQuery = querySequence[letterIdx + offsets.letterX] === letter;
      if (
        (positionsToStyle === PositionsToStyle.CONSENSUS && isConsensus) ||
        (positionsToStyle === PositionsToStyle.CONSENSUS_DIFF &&
          !isConsensus) ||
        (positionsToStyle === PositionsToStyle.QUERY && isQuery) ||
        (positionsToStyle === PositionsToStyle.QUERY_DIFF && !isQuery)
      ) {
        molecule = moleculeClass.fromSingleLetterCode(letter);
      }
    }

    //TODO: ripe for speed increases / caching etc
    return residueDetail === ResidueStyle.DARK
      ? molecule.colors[colorScheme.commonName].darkTheme.backgroundColor.rgb
      : residueDetail === ResidueStyle.LIGHT
      ? molecule.colors[colorScheme.commonName].lightTheme.backgroundColor.rgb
      : CanvasAlignmentTiled.WHITE_RGB;
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
