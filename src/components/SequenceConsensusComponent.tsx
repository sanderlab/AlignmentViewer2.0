import React from "react";
import Alignment from "../common/Alignment";

export interface ISequenceConsensusComponentProps {
  alignment: Alignment;
  characterWidth: number;

  consensusPlotLoaded(node: HTMLDivElement): void;
  readonly id: string;
}

interface ISequenceConsensusComponentState {}

export class SequenceConsensusComponent extends React.Component<
  ISequenceConsensusComponentProps,
  ISequenceConsensusComponentState
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
        ref={el => {
          this.props.consensusPlotLoaded(el as HTMLDivElement);
        }}
      ></div>
    );
  }
}
