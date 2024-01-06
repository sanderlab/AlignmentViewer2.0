import React, { useCallback, useMemo } from "react";
import { Sprite } from "@pixi/react";

import {
  PositionsToStyle,
  AlignmentTypes,
  IColorScheme,
  ResidueColoring,
} from "../common/MolecularStyles";
import { generateUUIDv4 } from "../common/Utils";
import { Alignment } from "../common/Alignment";

interface ISingleTile {
  tileX: number;
  tileY: number;
  pixelX: number;
  pixelY: number;
  width: number;
  height: number;
  image: HTMLCanvasElement;
}

interface ITiledImages {
  targetTileWidth: number;
  targetTileHeight: number;
  lastTileWidth: number;
  lastTileHeight: number;
  numXTiles: number;
  numYTiles: number;
  tiles: ISingleTile[];
}

export interface ICanvasAlignmentTiledProps {
  sequences: string[];
  consensusSequence: string;
  querySequence: string;
  alignmentType: AlignmentTypes;
  positionsToStyle: PositionsToStyle;
  colorScheme: IColorScheme;
  residueColoring: ResidueColoring;
  scale?: { x: number; y: number };
  translateX?: number;
  translateY?: number;
}

export const CanvasAlignmentTiled = (props: ICanvasAlignmentTiledProps) => {

  const {
    sequences,
    consensusSequence,
    querySequence,
    alignmentType,
    positionsToStyle,
    colorScheme,
    residueColoring,
    scale,
    translateX,
    translateY
  } = props;

  // Generate multiple tiled images from the alignment
  const fullWidth = sequences.length > 0 ? sequences[0].length : 0;
  const fullHeight = sequences.length;

  const positionalLetterColors = useMemo(()=>{
    return Alignment.getPositionalLetterColors(
      sequences,
      querySequence,
      consensusSequence,
      alignmentType,
      positionsToStyle,
      residueColoring,
      colorScheme
    );
  }, [
    sequences,
    querySequence,
    consensusSequence,
    alignmentType,
    positionsToStyle,
    residueColoring,
    colorScheme
  ]);

  const colorCanvasWithSequences = useCallback((
    tileImageData: ImageData,
    tileCanvasContext: CanvasRenderingContext2D,
    tileCanvas: HTMLCanvasElement,
    offsets: { seqY: number; letterX: number }
  ) => {
    let imageDataIdx = 0;

    for (let seqIdx = 0; seqIdx < tileCanvas.height; seqIdx++) {
      for (let letterIdx = 0; letterIdx < tileCanvas.width; letterIdx++) {
        const seq = sequences[seqIdx + offsets.seqY];
        const posIdx = letterIdx + offsets.letterX;
        const letter = seq[posIdx]
        const colorScheme = positionalLetterColors[posIdx][letter].backgroundColor.rgb;
        
        tileImageData.data[imageDataIdx] = colorScheme.red;
        tileImageData.data[imageDataIdx + 1] = colorScheme.green;
        tileImageData.data[imageDataIdx + 2] = colorScheme.blue;
        tileImageData.data[imageDataIdx + 3] = 255; //alpha between 0 (transparent) and 255 (opaque)

        imageDataIdx += 4;
      }
    }
    tileCanvasContext.putImageData(tileImageData, 0, 0);
  }, [
    positionalLetterColors,
    sequences
  ]);

  const generateCanvasForTile = useCallback((
    tileXNumber: number,
    tileYNumber: number,
    tileWidth: number,
    tileHeight: number,
    targetTileWidth: number,
    targetTileHeight: number
  ): ISingleTile => {
    const tileCanvas = document.createElement("canvas") as HTMLCanvasElement;
    tileCanvas.height = tileHeight;
    tileCanvas.width = tileWidth;

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
      colorCanvasWithSequences(
        tileImageData,
        tileCanvasContext,
        tileCanvas,
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
  }, [colorCanvasWithSequences])

  const tiledImages = useMemo((): ITiledImages => {
    const targetTileWidth = Math.min(1000, 1000);
    const targetTileHeight = Math.min(1000, 1000);

    const toreturn = {
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
      tiles: [] as ISingleTile[],
    };

    for (
      let tileYNumber = 0;
      tileYNumber < toreturn.numYTiles;
      tileYNumber++
    ) {
      for (
        let tileXNumber = 0;
        tileXNumber < toreturn.numXTiles;
        tileXNumber++
      ) {
        const tiledImage = generateCanvasForTile(
          tileXNumber,
          tileYNumber,

          tileXNumber === toreturn.numXTiles - 1 //is this the last tile?
            ? toreturn.lastTileWidth
            : targetTileWidth,

          tileYNumber === toreturn.numYTiles - 1 //is this the last tile?
            ? toreturn.lastTileHeight
            : targetTileHeight,

          targetTileWidth,
          targetTileHeight,
        );
        toreturn.tiles.push(tiledImage);
      }
    }
    return toreturn;
  }, [
    fullHeight,
    fullWidth, 
    generateCanvasForTile
  ]);

  const renderedAlignment = useMemo(()=>{
    return (
      <>
        {tiledImages.tiles.map((tile) => (
          <Sprite
            source={tile.image}
            x={
              tile.pixelX * (scale ? scale.x : 1) + (translateX ? translateX : 0)
            }
            y={
              tile.pixelY * (scale ? scale.y : 1) + (translateY ? translateY : 0)
            }
            scale={scale ? [scale.x, scale.y] : [1, 1]}
            key={`${tile.tileX}_
                  ${tile.tileY}_
                  ${colorScheme.commonName}_
                  ${positionsToStyle.key}_
                  ${alignmentType.key}_
                  ${residueColoring.key}_
                  ${scale}_
                  ${translateY}_
                  ${translateX}_
                  ${
                    //outputting all sequences leads to huge memory usage!
                    //outputting ids may cause duplicates if changes sequences
                    //TODO: modify to return same value based on seq - but shorter. unclear how.
                    //   maybe "uuid-by-string" library (https://www.npmjs.com/package/uuid-by-string?
                    //   or add uuid to ISequence an output here (probably not as one could
                    //   presumably cut up sequences before, e.g., if we don't output
                    //   complete sequences, but only viewport sequences, in the future?
                    generateUUIDv4() //sequences.map((seq, idx) => idx).join("")
                  }`}
            roundPixels={true}
          ></Sprite>
        ))}
      </>
    )
  }, [
    alignmentType.key, 
    colorScheme.commonName, 
    positionsToStyle.key,
    residueColoring.key,
    scale, 
    tiledImages, 
    translateX,
    translateY
  ]);

  return renderedAlignment;
}
