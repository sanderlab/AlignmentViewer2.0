import React from "react";
import { ISequence, Alignment } from "../common/Alignment";
import { Nucleotide, AminoAcid } from "../common/Residues";
import { Sprite } from "@inlet/react-pixi";

import {
  PositionsToStyle,
  AlignmentTypes,
  IColorScheme,
  ResidueStyle,
} from "../common/MolecularStyles";
import { SequenceSorter } from "../common/AlignmentSorter";

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
  alignment: Alignment;
  alignmentType: AlignmentTypes;
  sortBy: SequenceSorter;
  positionsToStyle: PositionsToStyle;
  colorScheme: IColorScheme;
  residueDetail: ResidueStyle;
  scale?: { x: number; y: number };
  drawSequencesIndicies?: number[];
  translateY?: number;
}

export class CanvasAlignmentTiled extends React.Component<
  ICanvasAlignmentTiledProps
> {
  //shallow array equality
  protected arraysEqual(
    arr1: number[] | undefined,
    arr2: number[] | undefined
  ) {
    if (arr1 === undefined || arr2 === undefined) {
      return arr1 === arr2;
    }
    return (
      arr1.length === arr2.length &&
      arr1.every(function (element, index) {
        return element === arr2[index];
      })
    );
  }

  shouldComponentUpdate(nextProps: ICanvasAlignmentTiledProps) {
    return (
      nextProps.alignment !== this.props.alignment ||
      nextProps.colorScheme !== this.props.colorScheme ||
      nextProps.positionsToStyle !== this.props.positionsToStyle ||
      nextProps.sortBy !== this.props.sortBy ||
      nextProps.scale !== this.props.scale ||
      !this.arraysEqual(
        nextProps.drawSequencesIndicies,
        this.props.drawSequencesIndicies
      )
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
      drawSequencesIndicies,
      residueDetail,
      scale,
      sortBy,
    } = this.props;

    // Generate multiple tiled images from the alignment
    const allSequencesSorted = alignment.getSequences(sortBy);
    const sequences = !drawSequencesIndicies
      ? allSequencesSorted
      : drawSequencesIndicies.map((idx) => allSequencesSorted[idx]);
    const fullWidth = alignment.getMaxSequenceLength();
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
            x={tile.pixelX * (scale ? scale.x : 1)}
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
                  ${sortBy.key}_
                  ${residueDetail.key}_
                  ${alignment.getName()}_
                  ${
                    drawSequencesIndicies ? drawSequencesIndicies.join("-") : ""
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

  protected static WHITE_RGB = { red: 255, green: 255, blue: 255 };
  protected getCurrentMoleculeColors(
    letter: string,
    letterIdx: number,
    offsets: { seqY: number; letterX: number }
  ) {
    const {
      alignment,
      alignmentType,
      colorScheme,
      positionsToStyle,
      residueDetail,
    } = this.props;
    const consensusSequence = alignment.getConsensus().sequence;
    const querySequence = alignment.getQuerySequence().sequence;
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
      ? molecule.colors[colorScheme.commonName].default.rgb
      : residueDetail === ResidueStyle.LIGHT
      ? molecule.colors[colorScheme.commonName].backgroundColorOnLightTheme.rgb
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
