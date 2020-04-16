import { Alignment, SequenceSortOptions } from "../common/Alignment";
import { AceEditorComponent, IAceEditorProps } from "./AceEditorComponent";

export interface IAceMultipleSequenceAlignmentProps extends IAceEditorProps {
  alignment: Alignment;
  sortBy?: SequenceSortOptions;
}

export class AceMultipleSequenceAlignmentComponent extends AceEditorComponent<
  IAceMultipleSequenceAlignmentProps,
  {}
> {
  static defaultProps = {
    sortBy: SequenceSortOptions.INPUT,
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
