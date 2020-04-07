import AceMultipleSequenceAlignmentComponent from "./AceMultipleSequenceAlignmentComponent";

export default class AceTargetSequenceComponent extends AceMultipleSequenceAlignmentComponent {
  getText() {
    return this.props.alignment.getTargetSequence().sequence;
  }
}
