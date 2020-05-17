import { Alignment } from "../common/Alignment";
import { SequenceSorter } from "../common/AlignmentSorter";
import { AceEditorComponent, IAceEditorProps } from "./AceEditorComponent";

export interface IAceMultipleSequenceAlignmentProps extends IAceEditorProps {
  alignment: Alignment;
  sortBy?: SequenceSorter;
}

export class AceMultipleSequenceAlignmentComponent extends AceEditorComponent<
  IAceMultipleSequenceAlignmentProps,
  {}
> {
  static defaultProps = {
    sortBy: SequenceSorter.INPUT,
    fontSize: 14,
  };

  getText(): string {
    return this.props.alignment
      .getSequences(this.props.sortBy)
      .map((x) => x.sequence)
      .join("\n");
  }
  getEditorMode() {
    return this.props.alignment.getAceEditorMode();
  }
}
