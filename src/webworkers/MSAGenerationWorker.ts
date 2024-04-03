

//inspired by https://javascript.plainenglish.io/web-worker-in-react-9b2efafe309c

import { ISearchMatchDetails } from "../components/search/SequenceSearchHook";


export interface ICombinedColor {
  hexString: string;
  rgb: {
    red: number;
    green: number;
    blue: number;
  };
}

interface ISingleTile {
  tileX: number;
  tileY: number;
  pixelX: number;
  pixelY: number;
  width: number;
  height: number;
  image: ImageBitmap;
}

export interface ITiledImages {
  targetTileWidth: number;
  targetTileHeight: number;
  lastTileWidth: number;
  lastTileHeight: number;
  numXTiles: number;
  numYTiles: number;
  tiles: ISingleTile[];
}

export type ICanvasAlignmentTiledProps = {
  extraPosSeqCount: number;
  tileSize: number;
  positionalLetterColors: {
    [posIdx: number]: {
        [letter: string]: {
            letter: string;
            backgroundColor: ICombinedColor;
            letterColor: ICombinedColor;
        };
    };
  };
  sequences: string[];
  highlightPositionalMatches?: ISearchMatchDetails;
}

// eslint-disable-next-line import/no-anonymous-default-export
export function generateCanvases() {
  // eslint-disable-next-line no-restricted-globals
  self.onmessage = (
    message: {data: ICanvasAlignmentTiledProps}
  ) => {
    
    //
    // primary function
    //
    const generateAlignmentTiles = (props: ICanvasAlignmentTiledProps) => {
      const {
        extraPosSeqCount,
        tileSize,
        positionalLetterColors,
        sequences,
        highlightPositionalMatches,
      } = props;
    
      // Generate multiple tiled images from the alignment
      // NOTE: add 2 extra "blank" seq and pos to each returned image to 
      //       account for a safari bug and rounding errors 
      const fullWidth = (sequences.length > 0 ? sequences[0].length : 0) + extraPosSeqCount;
      const fullHeight = (sequences.length) + extraPosSeqCount;
    
      const colorCanvasWithSequences = (
        tileImageData: Uint8ClampedArray | Uint8Array,
        width: number, height: number,
        offsets: { seqY: number; letterX: number }
      ) => {
        let imageDataIdx = 0;
    
        //if we are highlighting 
        const alpha = !highlightPositionalMatches 
          ? 255        //completely opaque
          : 0.2 * 255; //somewhat transparant (0 = fully transparant)
        const [seqPosidxsHM, highlightColor] = highlightPositionalMatches
          ? [
            highlightPositionalMatches.posidxsMatchedPerSequence,
            highlightPositionalMatches.highlightColor
          ]
          : [
            {} as {[key: string]: number[]}, 
            {red:255, green:0, blue:0}
          ];
    
        for (let seqIdx = 0; seqIdx < height; seqIdx++) {
          const seq = sequences[seqIdx + offsets.seqY];
          const highlightPosIdxs = seqPosidxsHM[seq]
            ? seqPosidxsHM[seq]
            : [];
    
          for (let letterIdx = 0; letterIdx < width; letterIdx++) {
            const posIdx = letterIdx + offsets.letterX;
            if(seq && seq[posIdx]){ //we add an extra seq/pos on all returned objects to account for rounding errors/safari bug
              const letter = seq[posIdx]
              const colorScheme = positionalLetterColors[posIdx][letter].backgroundColor.rgb;
      
              if(highlightPosIdxs.indexOf(posIdx) !== -1){
                tileImageData[imageDataIdx] = highlightColor.red;
                tileImageData[imageDataIdx + 1] = highlightColor.green;
                tileImageData[imageDataIdx + 2] = highlightColor.blue;
                tileImageData[imageDataIdx + 3] = 255; //alpha between 0 (transparent) and 255 (opaque)
              }
              else{
                tileImageData[imageDataIdx] = colorScheme.red;
                tileImageData[imageDataIdx + 1] = colorScheme.green;
                tileImageData[imageDataIdx + 2] = colorScheme.blue;
                tileImageData[imageDataIdx + 3] = alpha; //alpha between 0 (transparent) and 255 (opaque)
              }
              imageDataIdx += 4;
            }
            else{
              imageDataIdx += 4;
            }
          }
        }
      };
    
      const generateCanvasForTile = (
        tileXNumber: number,
        tileYNumber: number,
        tileWidth: number,
        tileHeight: number,
        targetTileWidth: number,
        targetTileHeight: number
      ) => {
        const tileCanvas = new OffscreenCanvas(tileWidth, tileHeight);
        tileCanvas.height = tileHeight;
        tileCanvas.width = tileWidth;
    
        const offsets = {
          seqY: tileYNumber * targetTileHeight,
          letterX: tileXNumber * targetTileWidth,
        };
        const tileCanvasContext = tileCanvas.getContext("2d"); //tileCanvas.getContext("2d");
        //~30% of the time (500-1000 ms on large test) - most of the time is "getImageData"
        //also note that filLRect is 20% slower than using path.
        //TODO  can skip this if we cache the context and teh width/height is the same.
        //tileCanvasContext?.beginPath();
        //tileCanvasContext?.rect(0, 0, tileCanvas.width, tileCanvas.height);
        //tileCanvasContext?.fill();
        //tileCanvasContext?.closePath();
        const tileImageData = tileCanvasContext?.getImageData(
          0,
          0,
          tileCanvas.width,
          tileCanvas.height
        );
    
        //~70% of the time is spent here (2000-3000)ms on large test)
        if (tileImageData && tileCanvasContext) {
          colorCanvasWithSequences(
            tileImageData.data,
            tileWidth, 
            tileHeight,
            offsets
          );
          tileCanvasContext.putImageData(tileImageData, 0, 0);
        }
        return {
          tileX: tileXNumber,
          tileY: tileYNumber,
          pixelX: offsets.letterX,
          pixelY: offsets.seqY,
          width: tileCanvas.width,
          height: tileCanvas.height,
          image: tileCanvas.transferToImageBitmap(),
        };
      };
    
      //slow with large alignments - webworker?
      const getTiledImages = (): ITiledImages => {
        const targetTileWidth = tileSize;//1000000;
        const targetTileHeight = tileSize;//1000000;
    
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
      };
      return getTiledImages();
    }
    const toreturn = generateAlignmentTiles({
        extraPosSeqCount: message.data.extraPosSeqCount,
        tileSize: message.data.tileSize,
        positionalLetterColors: message.data.positionalLetterColors,
        sequences: message.data.sequences,
        highlightPositionalMatches: message.data.highlightPositionalMatches
      } as ICanvasAlignmentTiledProps
    );
    postMessage(toreturn);
  };
};




