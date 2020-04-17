import React from "react";
import { Alignment } from "../common/Alignment";

export interface ISequenceConsensusProps {
  alignment: Alignment;
  characterWidth: number;

  consensusPlotLoaded(node: HTMLDivElement): void;
  readonly id: string;
}

export class SequenceConsensusComponent extends React.Component<
  ISequenceConsensusProps
> {
  render() {
    if (!this.props.alignment || !this.props.characterWidth) {
      return null;
    }

    const maxSeqLength = this.props.alignment.getMaxSequenceLength();
    const totalWidth = this.props.characterWidth * maxSeqLength;
    const consensus = this.props.alignment.getConsensus();

    return (
      <div
        id={this.props.id}
        ref={(el) => {
          this.props.consensusPlotLoaded(el as HTMLDivElement);
        }}
      ></div>
    );
  }
}
