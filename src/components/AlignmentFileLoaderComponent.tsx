import * as React from "react";
import "./FileInput.scss";
import { Alignment } from "../common/Alignment";
import { FastaAlignment } from "../common/FastaAlignment";
import { StockholmAlignment } from "../common/StockholmAlignment";

export interface IExampleFileProps {
  labelText: string;
  fileURL: string;
  fileName: string;
}

export interface IAlignmentLoaderProps {
  fileSelectorLabelText: string;

  onAlignmentLoaded: (alignment: Alignment) => void; //loading ended

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
    this.fileInput = React.createRef();
  }

  /**
   * Pass the visible button click through to the file input
   * @param event
   */
  private handleClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    event.preventDefault();
    this.fileInput.current?.click();
  }

  /**
   * Read the file text and report loading to the parent
   * @param file
   */
  private readFileText(file: File) {
    const { onAlignmentLoaded } = this.props;

    var reader = new FileReader();
    reader.onload = (e) => {
      const fileText = reader.result as string;
      let alignment: Alignment;
      try {
        alignment = StockholmAlignment.fromFileContents(file.name, fileText);
      } catch (e) {
        alignment = FastaAlignment.fromFileContents(file.name, fileText);
      }

      onAlignmentLoaded(alignment);
      if (this.fileInput.current) {
        this.fileInput.current.value = ""; //reset the input box
      }
    };
    reader.readAsText(file);
  }

  /**
   *
   * @param event
   */
  private handleFileUploadInputChange(
    event: React.FormEvent<HTMLInputElement>
  ) {
    const { onFileLoadStart } = this.props;
    event.preventDefault();

    if (this.fileInput.current && this.fileInput.current.files) {
      if (onFileLoadStart) {
        onFileLoadStart();
      }
      setTimeout(() => {
        //safari needs this in a timeout, otherwise it runs synchronously?!?
        const file = this.fileInput.current!.files![0];
        this.readFileText(file);
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
    const { exampleFiles, onFileLoadStart } = this.props;
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
                const f = new File(
                  [await (await fetch(`${ef.fileURL}`)).blob()],
                  ef.fileName
                );
                this.readFileText(f);
              }}
            >
              {ef.labelText}
            </button>
          );
        })}
      </label>
    );
  }

  render() {
    return (
      <div className="alignment-file-loader">
        <div className="file-upload-input">{this.renderFileUpload()}</div>
        <div className="example-files">{this.renderExampleFiles()}</div>
      </div>
    );
  }
}
