import { AceMultipleSequenceAlignmentComponent } from "./AceMultipleSequenceAlignmentComponent";

export class AceQuerySequenceComponent extends AceMultipleSequenceAlignmentComponent {
  getText() {
    return this.props.alignment.getQuerySequence().sequence;
  }
}
