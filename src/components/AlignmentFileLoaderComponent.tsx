import * as React from "react";
import "./FileInput.scss";
import { Alignment } from "../common/Alignment";
import { AlignmentLoader, AlignmentLoadError } from "../common/AlignmentLoader";

export interface IExampleFileProps {
  labelText: string;
  fileURL: string;
  fileName: string;
}

export interface IAlignmentLoaderProps {
  fileSelectorLabelText: string;

  onAlignmentLoaded: (alignment: Alignment) => void; //loading ended
  onAlignmenLoadError: (e: AlignmentLoadError) => void; //loading error

  exampleFiles?: IExampleFileProps[];
  onFileLoadStart?: () => void; //notify on begin loading
}

// Inspired by https://reactjs.org/docs/uncontrolled-components.html
export class AlignmentFileLoaderComponent extends React.Component<
  IAlignmentLoaderProps
> {
  public static defaultProps = {
    fileSelectorLabelText: "Upload:",
  };

  protected fileInput: React.RefObject<HTMLInputElement>;
  constructor(props: IAlignmentLoaderProps) {
    super(props);
    this.handleFileUploadInputChange = this.handleFileUploadInputChange.bind(
      this
    );
    this.handleClick = this.handleClick.bind(this);
    this.alignmentLoaded = this.alignmentLoaded.bind(this);
    this.handleFileUploadInputChange = this.handleFileUploadInputChange.bind(
      this
    );
    this.fileInput = React.createRef();
  }

  /*
   *
   *
   * PRIVATE METHODS
   *
   *
   */

  /**
   * Pass the visible button click through to the file input
   * @param event
   */
  private handleClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    event.preventDefault();
    this.fileInput.current?.click();
  }

  /**
   *
   * @param alignment
   */
  private alignmentLoaded(alignment: Alignment) {
    this.props.onAlignmentLoaded(alignment);
    if (this.fileInput.current) {
      this.fileInput.current.value = ""; //reset the input box
    }
  }

  /**
   *
   * @param event
   */
  private handleFileUploadInputChange(
    event: React.FormEvent<HTMLInputElement>
  ) {
    const { onFileLoadStart, onAlignmenLoadError } = this.props;
    event.preventDefault();

    if (this.fileInput.current && this.fileInput.current.files) {
      if (onFileLoadStart) {
        onFileLoadStart();
      }
      setTimeout(() => {
        //safari needs this in a timeout, otherwise it runs synchronously?!?
        const file = this.fileInput.current!.files![0];
        AlignmentLoader.loadAlignmentFromFile(
          file,
          this.alignmentLoaded,
          onAlignmenLoadError
        );
      });
    }
  }

  /**
   * Render the file upload button and hidden input box
   */
  private renderFileUpload() {
    const { fileSelectorLabelText } = this.props;
    return (
      <label>
        <strong>{fileSelectorLabelText}</strong>
        <input
          type="file"
          className="hidden-file-input"
          ref={this.fileInput}
          onChange={this.handleFileUploadInputChange}
        />
        <button type="button" onClick={this.handleClick}>
          Choose File
        </button>
      </label>
    );
  }

  /**
   * render example fileset
   */
  private renderExampleFiles() {
    const { exampleFiles, onFileLoadStart, onAlignmenLoadError } = this.props;
    return !exampleFiles ? null : (
      <label>
        <strong>Example Alignments:</strong>
        {exampleFiles.map((ef) => {
          return (
            <button
              type="button"
              className="button-link"
              key={ef.fileURL}
              onClick={async (e) => {
                if (onFileLoadStart) {
                  onFileLoadStart();
                }
                AlignmentLoader.loadAlignmentFromURL(
                  ef.fileURL,
                  this.alignmentLoaded,
                  onAlignmenLoadError,
                  ef.fileName
                );
              }}
            >
              {ef.labelText}
            </button>
          );
        })}
      </label>
    );
  }

  /*
   *
   *
   * REACT METHODS
   *
   *
   */
  render() {
    return (
      <div className="alignment-file-loader">
        <div className="file-upload-input">{this.renderFileUpload()}</div>
        <div className="example-files">{this.renderExampleFiles()}</div>
      </div>
    );
  }
}
