import React from "react";
import Alignment from "./Alignment";

export interface ISequenceConservationComponentProps {
  alignment: Alignment;
  characterWidth: number;

  conservationPlotLoaded(node: HTMLDivElement): void;

  readonly id: string;
}

interface ISequenceConservationComponentState {
  isHovered: boolean;
}

export class SequenceConservationComponent extends React.Component<
  ISequenceConservationComponentProps,
  ISequenceConservationComponentState
> {
  private scrollerDiv?: HTMLDivElement | null;

  constructor(props: ISequenceConservationComponentProps) {
    super(props);
    this.state = {
      isHovered: false
    };
    this.handleSvgHover = this.handleSvgHover.bind(this);
  }

  handleSvgHover(isHovered: boolean) {
    this.setState({
      isHovered: isHovered
    });
  }

  /**
   * Compute the Kullback-Leibler (KL) entropy for individual columns in the alignment
   *        S = sum(pk * log(pk / qk)
   * also see scipy docs:
   *     https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.entropy.html
   *
   * @param pk Column data: an object whose keys are all letters in the column and
   *           values are normalized (sum to 1) frequency of occurrence.
   *           From scipy docs: "the (discrete) distribution. pk[i] is the
   *                              ... probability of event i"
   * @param qk an object whose keys are all letters in the alignment and values are
   *           normalized (sum to 1) frequency of occurrence.
   *           From scipy docs: "Sequence against which the relative entropy is
   *                              computed. Should be in the same format as pk."
   */
  computeEntropy(
    allLetters: string[],
    pk: { [letter: string]: number },
    qk: { [letter: string]: number },
    doLog?: boolean
  ) {
    return allLetters.reduce((acc, letter) => {
      if (letter in pk) {
        acc += pk[letter] * Math.log(pk[letter] / qk[letter]);
      }
      return acc;
    }, 0);
  }

  /**
   *
   * @param maxSeqLength
   */
  createConservationCountGs() {
    const toReturn: JSX.Element[] = [];
    const allLetters = this.props.alignment.getSortedAlphaLetters();
    const positionalLetterCounts = this.props.alignment.getPositionalLetterCounts(
      true,
      allLetters
    );
    const backgroundLetterCounts = this.props.alignment.getGlobalAlphaLetterCounts(
      true,
      allLetters
    );

    //const maximumEntropy = this.computeEntropy(allLetters, backgroundLetterCounts, backgroundLetterCounts);
    const entropies = Array.from(positionalLetterCounts).map(
      ([position, letterCounts]) => {
        return this.computeEntropy(
          allLetters,
          letterCounts,
          backgroundLetterCounts
        );
      }
    );

    //normalize between 0 and 1
    const maxEmpiricalEntropy = Math.max(...entropies);
    const normalizedEntropies = entropies.map(entropy => {
      return (entropy / maxEmpiricalEntropy) * 100;
    });
    //console.log('entropies', entropies);
    //console.log('normalizedEntropies', normalizedEntropies);

    normalizedEntropies.forEach((normalizedEntropy, idx) => {
      toReturn.push(
        <g transform={`translate(${idx},${100 - normalizedEntropy})`} key={idx}>
          <rect width={0.5} height={`${normalizedEntropy}`}></rect>
        </g>
      );
    });
    return toReturn;
  }

  /**
   * Generate a chart to depict the number of gaps in each column. The bar
   * chart is normalized to a maximum height of 100 (if the number of gaps in
   * a particular column was equal to the number of sequences in that column)
   * @param maxSeqLength The total number of possible sequences in the column.
   *                     Used to normalize the output to a maximum height of 100.
   */
  createGapCountGs(maxSeqLength: number) {
    const toReturn: JSX.Element[] = [];
    const numSequences = this.props.alignment.getSequences().length;
    const gapCounts = this.props.alignment.getGapsPerColumn();

    for (let i = 0; i < maxSeqLength; i++) {
      const gapPercentage = (gapCounts[i] / numSequences) * 100;
      toReturn.push(
        <g transform={`translate(${i + 0.5},${100 - gapPercentage})`} key={i}>
          <rect width={0.5} height={gapPercentage}></rect>
        </g>
      );
    }
    return toReturn;
  }

  divLoaded(e: HTMLDivElement | null) {
    if (e && !this.scrollerDiv) {
      //only run if first time element available
      this.scrollerDiv = e;
      this.props.conservationPlotLoaded(this.scrollerDiv);
    }
  }

  componentWillUnmount() {
    //TODO: notify parent of unloading and release dom
  }

  render() {
    if (!this.props.alignment || !this.props.characterWidth) {
      return null;
    }

    const maxSeqLength = this.props.alignment.getMaxSequenceLength();
    const totalWidth = this.props.characterWidth * maxSeqLength;
    const hoveredClass = this.state.isHovered
      ? "conservation hovered"
      : "conservation";

    return (
      <div>
        <div
          style={{
            backgroundColor: "rgba(255,255,255,0.9)",
            border: "solid 1px black",
            position: "absolute",
            padding: "3px",
            top: 0,
            right: 0,
            color: "red",
            visibility: this.state.isHovered ? "visible" : "hidden",
            zIndex: 1000
          }}
        >
          <span style={{ color: "#000000" }}>Entropy</span>
          <span style={{ color: "#b7b7b7", paddingLeft: 10 }}>&#35; Gaps</span>
        </div>

        <div id={this.props.id} ref={e => this.divLoaded(e)}>
          <div className="svg_container">
            <svg
              preserveAspectRatio="none"
              viewBox={`0 0 ${maxSeqLength} 100`}
              style={{ width: totalWidth, height: 100 }}
              className={hoveredClass}
              xmlns="http://www.w3.org/2000/svg"
              onMouseEnter={() => this.handleSvgHover(true)}
              onMouseLeave={() => this.handleSvgHover(false)}
            >
              <g className="gapCount">{this.createGapCountGs(maxSeqLength)}</g>
              <g className="entropy">{this.createConservationCountGs()}</g>
            </svg>
          </div>
        </div>
      </div>
    );
  }
}
