import React, {useState} from "react";
import "./App.css";
import Alignment from "./Alignment";
import AminoAcid from "./AminoAcid";

export interface IAlignmentCanvasComponentProps {
  alignment: Alignment;
  characterWidth: number;

  readonly id: string;
}

interface IAlignmentCanvasComponentState {
}


export class AlignmentCanvasComponent extends React.Component<IAlignmentCanvasComponentProps, 
                                                              IAlignmentCanvasComponentState> {

  private topDiv?: HTMLDivElement | null;                                                              

  constructor(props: IAlignmentCanvasComponentProps){
    super(props);
  }

  async divLoaded(e: HTMLDivElement | null){
    if(e && !this.topDiv){ //only run if editor not loaded

      const start = new Date().getMilliseconds();

      const fullOffscreenCanvas = document.createElement('canvas');
      fullOffscreenCanvas.width = this.props.alignment.getMaxSequenceLength();
      fullOffscreenCanvas.height = this.props.alignment.getSequences().length;
      const context = fullOffscreenCanvas.getContext('2d');
      const imageData = context?.getImageData(
        0, 0, this.props.alignment.getMaxSequenceLength(), this.props.alignment.getSequences().length
      );

      let letterCount = 0;

      //step 1: generate full alignment in memory
      if(context !== null && imageData){

        /*
        //speed increase 2x: don't change fillStyle on every rectangle,
        //                   rather do in batches by color
        const colorToCoordinates = AminoAcid.canonicalAminoAcids.reduce((acc, aa)=>{
          acc[aa.hexString] = [];
          return acc;
        }, {} as {[color:string]: number[][]});

        this.props.alignment.getSequences().forEach((seq, seqIdx) => {
          for(let letterIdx = 0; letterIdx < seq.sequence.length; letterIdx+=1){
            const letter = seq.sequence[letterIdx];
            const aa = AminoAcid.fromSingleLetterCode(letter);
            colorToCoordinates[aa.hexString].push([letterIdx, seqIdx]);
            letterCount+=1;
          }
        });
        */

       let idx = 0;
        this.props.alignment.getSequences().forEach((seq, seqIdx) => {
          for(let letterIdx = 0; letterIdx < seq.sequence.length; letterIdx+=1){
            const letter = seq.sequence[letterIdx];
            const aa = AminoAcid.fromSingleLetterCode(letter);
            letterCount+=1;

            imageData.data[idx] = aa.rgba[0];
            imageData.data[idx+1] = aa.rgba[1];
            imageData.data[idx+2] = aa.rgba[2];;
            idx += 4;
          }
        });
        context.putImageData(imageData, 0, 0);

        /*
        requestAnimationFrame(() => {
          for(const [color, coordinates] of Object.entries(colorToCoordinates)){
            context.fillStyle = color;
            for(const xy of coordinates){
              context.fillRect(xy[0], xy[1], 1, 1);
            }
          }
        })*/
        /*
        Object.entries(colorToCoordinates).forEach(([color, coordinates]) => {
          //context.fillStyle = color;
          coordinates.forEach((xy) =>{
            context.fillRect(xy[0], xy[1], 1, 1);
          });
        });*/
      }

      console.log('canvas loaded [' + letterCount + ' letters], time=' + (new Date().getMilliseconds()-start)+'ms');
      this.topDiv = e;
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
           ref={e => this.divLoaded(e)}>
        AlignmentCanvasComponent
      </div>
    );
  }
}
