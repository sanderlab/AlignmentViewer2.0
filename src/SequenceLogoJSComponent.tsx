import React from "react";
import Alignment from "./Alignment";
import { RawLogo } from "logojs-react";

export interface ISequenceLogoJSComponentProps {
  alignment: Alignment;
  characterWidth: number;

  logoLoaded(node: HTMLDivElement): void;

  readonly id: string;
}

export class SequenceLogoJSComponent extends React.Component<
  ISequenceLogoJSComponentProps
> {
  private scrollerDiv?: HTMLDivElement | null;
  private loaded: boolean = false;

  divLoaded(e: HTMLDivElement | null) {
    if (e && !this.scrollerDiv) {
      //only run if first time element available
      this.scrollerDiv = e;
      this.props.logoLoaded(this.scrollerDiv);
    }
  }

  shouldComponentUpdate() {
    if (this.loaded === false) {
      return true;
    }
    return false;
  }

  render() {
    if (!this.props.alignment || !this.props.characterWidth) {
      return null;
    }

    const positionalLetterCounts = this.props.alignment.getPositionalLetterCounts();
    const lettersSorted = this.props.alignment.getSortedAlphaLetters();

    //calculate the frequencies of all letters in each column
    const frequencies: number[][] = [];
    positionalLetterCounts.forEach((letterCounts, position) => {
      const totalCount = Object.keys(letterCounts).reduce((total, letter) => {
        total += letterCounts[letter];
        return total;
      }, 0);

      const positionalFrequencies: number[] = lettersSorted.map(letter => {
        let freq = 0;
        if (letter in letterCounts) {
          freq = letterCounts[letter] / totalCount;
        }
        return freq;
      });

      frequencies.push(positionalFrequencies);
    });

    var alphabet = lettersSorted.map(letter => {
      return {
        regex: letter,
        className: "ace_" + letter
      };
    });

    const glyphWidth = this.props.characterWidth;
    const totalWidth = frequencies.length * glyphWidth;

    this.loaded = true;
    return (
      <div id={this.props.id} ref={e => this.divLoaded(e)}>
        <svg viewBox={`0 10 ${totalWidth} 100`} style={{ width: totalWidth }}>
          <g transform="translate(0,12) scale(1, 0.95)">
            <RawLogo
              values={frequencies}
              alphabet={alphabet}
              glyphWidth={glyphWidth}
              stackHeight={100}
            />
          </g>
        </svg>
      </div>
    );
  }
}
