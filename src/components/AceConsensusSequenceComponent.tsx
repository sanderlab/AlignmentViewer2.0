import { AceMultipleSequenceAlignmentComponent } from "./AceMultipleSequenceAlignmentComponent";

export class AceConsensusSequenceComponent extends AceMultipleSequenceAlignmentComponent {
  getText() {
    return this.props.alignment.getConsensus().sequence.sequence;
  }
}
