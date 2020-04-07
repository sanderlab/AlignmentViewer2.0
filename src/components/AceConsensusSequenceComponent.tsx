import AceMultipleSequenceAlignmentComponent from "./AceMultipleSequenceAlignmentComponent";

export default class AceConsensusSequenceComponent extends AceMultipleSequenceAlignmentComponent {
  getText() {
    return this.props.alignment
      .getConsensus()
      .map((letter) => {
        return letter.letter;
      })
      .join("");
  }
}
