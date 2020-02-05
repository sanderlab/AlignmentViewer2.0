import React from "react";
import Alignment from "./Alignment";
import AminoAcid from "./AminoAcid";
import { Stage, Sprite } from '@inlet/react-pixi'
import { Viewport } from 'pixi-viewport'

export interface IAlignmentCanvasComponentProps {
  alignment: Alignment;
  characterWidth: number;

  readonly id: string;
}

interface ITiledImages{
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
  }[]
}


export class AlignmentCanvasComponent extends React.Component<IAlignmentCanvasComponentProps> {

  private topDiv?: HTMLDivElement | null; 
  private fullOffscreenImageData?: ImageData;                                                       
  //private map: Map<{ children: any; center: L.LatLngTuple; zoom: 5; style: { height: number; width: string; }; ref: unknown; }, L.Map> | null;

  constructor(props: IAlignmentCanvasComponentProps){
    super(props);
  }

  

  async divLoaded(e: HTMLDivElement | null){
    if(e && !this.topDiv){ //only run if editor not loaded

      const start = new Date().getMilliseconds();

      const sequences = this.props.alignment.getSequences();
      const fullWidth = this.props.alignment.getMaxSequenceLength();
      const fullLength = this.props.alignment.getSequences().length;

      const fullOffscreenCanvas = document.createElement('canvas');
      fullOffscreenCanvas.width = fullWidth;
      fullOffscreenCanvas.height = fullLength;
      const context = fullOffscreenCanvas.getContext('2d');
      context?.fillRect(0, 0, fullWidth, fullLength);
      
      this.fullOffscreenImageData = context?.getImageData(
        0, 0, fullWidth, fullLength
      );

      let letterCount = 0;

      //step 1: generate full alignment in memory
      if(context !== null && this.fullOffscreenImageData !== undefined){
        let idx = 0;
        for(let seqIdx = 0; seqIdx < sequences.length; seqIdx++){
          const seq = sequences[seqIdx];
          for(let letterIdx = 0; letterIdx < seq.sequence.length; letterIdx++){
            const letter = seq.sequence[letterIdx];
            const aa = AminoAcid.fromSingleLetterCode(letter);
            letterCount+=1;

            this.fullOffscreenImageData.data[idx] = aa.rgba[0];
            this.fullOffscreenImageData.data[idx+1] = aa.rgba[1];
            this.fullOffscreenImageData.data[idx+2] = aa.rgba[2];;
            idx += 4;
          }
        };
        context.putImageData(this.fullOffscreenImageData, 0, 0);
      }

      console.log('canvas loaded [' + letterCount + ' letters], time=' + (new Date().getMilliseconds()-start)+'ms');
      this.topDiv = e;
      this.topDiv.append(fullOffscreenCanvas);
      
    }
  }

  render() {
    if (!this.props.alignment || !this.props.characterWidth){
      return null;
    }

    const maxSeqLength = this.props.alignment.getMaxSequenceLength();
    const totalWidth = this.props.characterWidth * maxSeqLength;

    return (
      <div id={this.props.id}
           ref={e => console.log('TODO: REMOVE!') /*this.divLoaded(e)*/}>
        {
          <Stage width={maxSeqLength} height={5000}>
            <PixiAlignment id="tiled-alignment" 
                          alignment={this.props.alignment} 
                          characterWidth={this.props.characterWidth}/>
          </Stage>
        }
      </div>
    );
  }
}
class PixiAlignment extends React.Component<IAlignmentCanvasComponentProps> {
  private fullOffscreenImageData?: ImageData;  
  

  render() {
    if (!this.props.alignment){
      return null;
    }

    let letterCount = 0;//stats
    const start = new Date().getMilliseconds();

    const sequences = this.props.alignment.getSequences();
    const fullWidth = this.props.alignment.getMaxSequenceLength();
    const fullHeight = sequences.length;
    
    //
    //generate multiple tiled images from the alignment
    //
    const targetTileWidth = Math.min(70, fullWidth);
    const targetTileHeight = Math.min(700, fullHeight);

    const tiledImages: ITiledImages = {
      targetTileWidth: targetTileWidth,
      targetTileHeight: targetTileHeight,
      lastTileWidth: fullWidth % targetTileWidth !== 0 ? fullWidth % targetTileWidth : targetTileWidth,
      lastTileHeight: fullHeight % targetTileHeight !== 0 ? fullHeight % targetTileHeight : targetTileHeight,
      numXTiles: fullWidth % targetTileWidth !== 0 ? Math.floor(fullWidth/targetTileWidth)+1 : Math.floor(fullWidth/targetTileWidth),
      numYTiles: fullHeight % targetTileHeight !== 0 ? Math.floor(fullHeight/targetTileHeight)+1 : Math.floor(fullHeight/targetTileHeight),
      tiles: []
    };

    for(let tileYNumber = 0; tileYNumber < tiledImages.numYTiles; tileYNumber++){
      for(let tileXNumber = 0; tileXNumber < tiledImages.numXTiles; tileXNumber++){

        const tileCanvas = document.createElement('canvas') as HTMLCanvasElement;
        tileCanvas.height = (tileYNumber === tiledImages.numYTiles - 1) ? tiledImages.lastTileHeight : targetTileHeight;
        tileCanvas.width = (tileXNumber === tiledImages.numXTiles - 1) ? tiledImages.lastTileWidth : targetTileWidth;
        
        const seqOffsetY = tileYNumber * targetTileHeight;
        const letterOffsetX = tileXNumber * targetTileWidth;

        const tileCanvasContext = tileCanvas.getContext('2d');
        tileCanvasContext?.fillRect(0, 0, tileCanvas.width, tileCanvas.height); //unclear why necessary
        const tileImageData = tileCanvasContext?.getImageData(
          0, 0, tileCanvas.width, tileCanvas.height
        );
        
        if(tileImageData && tileCanvasContext){
          let imageDataIdx = 0;
          for(let seqIdx = 0; seqIdx < tileCanvas.height; seqIdx++){
            const seq = sequences[seqIdx + seqOffsetY];
            for(let letterIdx = 0; letterIdx < tileCanvas.width; letterIdx++){
              const letter = seq.sequence[letterIdx + letterOffsetX];
              const aa = AminoAcid.fromSingleLetterCode(letter);
    
              tileImageData.data[imageDataIdx] = aa.rgba[0];
              tileImageData.data[imageDataIdx+1] = aa.rgba[1];
              tileImageData.data[imageDataIdx+2] = aa.rgba[2];

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

    console.log('tiledImages', tiledImages);
    return (
      <>
        {
          tiledImages.tiles.map(tile => 
            <Sprite source={tile.image} 
                    x={tile.pixelX} 
                    y={tile.pixelY} 
                    key={`${tile.tileX}_${tile.tileY}`}></Sprite>
          )
        }
      </>
    )
    
  }
}