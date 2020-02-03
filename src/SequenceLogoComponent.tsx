import React from "react";
import "./App.css";
import { T, RawLogo, loadGlyphComponents } from "logojs-react";
import Alignment from "./Alignment";

export interface ISequenceLogoComponentProps {
  alignment: Alignment;
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
    if (!this.props.alignment || !this.props.characterWidth){
      return null;
    }

    const positionalLetterCounts = this.props.alignment.getPositionalLetterCounts();
    const lettersSorted = this.props.alignment.getSortedAlphaLetters();
    console.log('positionalLetterCounts', positionalLetterCounts);
    console.log('lettersSorted:', lettersSorted);

    //calculate the frequencies of all letters in each column
    const frequencies: (number[])[] = [];
    positionalLetterCounts.forEach((letterCounts, position) => {
      const totalCount = Object.keys(letterCounts).reduce((total, letter)=>{
        total += letterCounts[letter];
        return total;
      }, 0);

      const positionalFrequencies: number[] = lettersSorted.map((letter) => {
        let freq = 0;
        if (letter in letterCounts){
          freq = letterCounts[letter] / totalCount;
        }
        return freq;
      });

      frequencies.push(positionalFrequencies);
    });


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
