import { AceMultipleSequenceAlignmentComponent } from "./AceMultipleSequenceAlignmentComponent";

export class AceTargetSequenceComponent extends AceMultipleSequenceAlignmentComponent {
  getText() {
    return this.props.alignment.getTargetSequence().sequence;
  }
}
