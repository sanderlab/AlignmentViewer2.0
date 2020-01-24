import React from "react";
import "./App.css";
import { T, RawLogo, loadGlyphComponents } from "logojs-react";
import { Sequence } from "./App";

export interface ISequenceLogoComponentProps {
  alignment: Sequence[];
  targetSequence: Sequence;
  characterWidth: number;

  logoLoaded(node: HTMLDivElement): void;

  readonly id: string;
}

interface ISequenceLogoComponentState {
  
}

export class SequenceLogoComponent extends React.Component<ISequenceLogoComponentProps, ISequenceLogoComponentState> {

  _getClassName(aaLetter: string): string{
    switch(aaLetter){
      case 'A': return 'ace_Alanine';
      case 'R': return 'ace_Arginine';
      case 'N': return 'ace_Asparagine';
      case 'D': return 'ace_AsparticAcid';
      case 'C': return 'ace_Cysteine';
      case 'Q': return 'ace_Glutamine';
      case 'E': return 'ace_GlutamicAcid';
      case 'G': return 'ace_Glycine';
      case 'H': return 'ace_Histidine';
      case 'I': return 'ace_Isoleucine';
      case 'L': return 'ace_Leucine';
      case 'K': return 'ace_Lysine';
      case 'M': return 'ace_Methionine';
      case 'F': return 'ace_Phenylalanine';
      case 'P': return 'ace_Proline';
      case 'S': return 'ace_Serine';
      case 'T': return 'ace_Threonine';
      case 'W': return 'ace_Tryptophan';
      case 'Y': return 'ace_Tyrosine';
      case 'V': return 'ace_Valine';
    }
    return 'unknown';
  }

  render() {
    if (!this.props.targetSequence || !this.props.alignment || !this.props.characterWidth){
      return null;
    }

    const start = new Date();
    const allLetters: {[key:string]:number} = {};
    const positionLetterFrequencies: {[key: number]: {[key:string]: number}} = {};

    for (var i=-1; i < this.props.alignment.length; i++){
      const seq = i === -1 ? this.props.targetSequence : this.props.alignment[i];
      for (var j=0; j < seq.sequence.length; j++){
        const aa = seq.sequence[j].toUpperCase();
        allLetters[aa] = 1;

        if (j in positionLetterFrequencies === false){
          positionLetterFrequencies[j] = {};
        }
        if (aa in positionLetterFrequencies[j] === false){
          positionLetterFrequencies[j][aa] = 0;
        }
        positionLetterFrequencies[j][aa]+=1;
      }
    };
    console.log('done parsing alignment in '+(new Date().getTime() - start.getTime())+'ms');
    
    //for all positions, calculate array of frequencies for each letter
    var positionsSorted = Object.keys(positionLetterFrequencies)
                                .map(Number)
                                .sort((a, b) => { return a-b; });

    const lettersSorted = Object.keys(allLetters)
                                .sort()
                                .reduce((arr: string[], value: string) =>{
                                  if(value.match(/[a-z]/i)){ // only keep letters
                                    arr.push(value);
                                  }
                                  return arr;
                                }, []);

    const frequencies: (number[])[] = [];

    for (var i=0; i < positionsSorted.length; i++){
      const position = positionsSorted[i];
      const letterFrequencies = positionLetterFrequencies[position];
      const totalCount = Object.keys(letterFrequencies).reduce((total, letter)=>{
        total += letterFrequencies[letter];
        return total;
      }, 0);

      const positionalFrequencies: number[] = [];
      for (var j=0; j < lettersSorted.length; j++){
        const letter = lettersSorted[j];
        var freqToAdd = 0;
        if (letter in letterFrequencies){
          freqToAdd = letterFrequencies[letter] / totalCount;
        }
        positionalFrequencies.push(freqToAdd);
      }
      frequencies.push(positionalFrequencies);
    }
    
    var alphabet = lettersSorted.map((letter) => {
      return {'regex': letter, 'className': this._getClassName(letter)}
    });

    /*
    //only serine doesn't display as it doesn't take all the props. bad choice. I tried to
    //implement a custom glyph, but it really isn't supported as the RawLogo resets
    //the alphabet when about to render.
    alphabet = alphabet.map(symbol => {

      if (symbol.regex === 'S'){
        return {'regex': 'N', className: 'ace_TESTER', component: T};

        //@ts-ignore
        console.log('component befor: ' + alphabet[i].component);
        //@ts-ignore
        alphabet[i].component = T;//customSGlyph({fill: 'pink', fillOpacity: 50});
        //alphabet[i].regex = '0';//customSGlyph({fill: 'pink', fillOpacity: 50});

        //@ts-ignore
        console.log('component after: ' + alphabet[i].component);
      }

      return symbol;
    });*/

    //console.log('positionLetterFrequencies', positionLetterFrequencies);
    //console.log('positionsSorted', positionsSorted);
    //console.log('alphabet', alphabet);
    //console.log('frequencies', frequencies);
    //console.log('lettersSorted', lettersSorted);

    const glyphWidth = this.props.characterWidth;
    const totalWidth = frequencies.length * glyphWidth;

    return (
      <div
        id={this.props.id}
        ref={el => {
          this.props.logoLoaded(el as HTMLDivElement);
        }}
      >
        <svg viewBox={`0 10 ${totalWidth} 100`} style={{width: totalWidth}}>
          <g transform="translate(0,12) scale(1, 0.95)">
            <RawLogo values={frequencies} 
                    alphabet={alphabet} 
                    glyphWidth={glyphWidth} 
                    stackHeight={100} />
          </g>
        </svg>
      </div>
    );
  }
}
