import * as React from "react";

export interface IFileInputProps {
  labelText: string;
  onFileLoadCb?: (file: File, event: React.FormEvent) => void;
}

// Shamelessly based on from https://reactjs.org/docs/uncontrolled-components.html
export class FileInputComponent extends React.Component<IFileInputProps> {
  public static defaultProps = {
    labelText: "Upload:"
  };

  protected fileInput: React.RefObject<HTMLInputElement>;
  constructor(props: IFileInputProps) {
    super(props);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.fileInput = React.createRef();
  }

  handleSubmit(event: React.FormEvent) {
    const { onFileLoadCb } = this.props;
    event.preventDefault();
    if (
      onFileLoadCb &&
      this.fileInput.current &&
      this.fileInput.current.files
    ) {
      onFileLoadCb(this.fileInput.current.files[0], event);
    }
  }

  render() {
    const { labelText } = this.props;
    return (
      <label>
        <strong>{labelText}</strong>
        <input type="file" ref={this.fileInput} onInput={this.handleSubmit} />
      </label>
    );
  }
}
