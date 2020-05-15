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
    this.alignmentLoaded = this.alignmentLoaded.bind(this);
    this.handleFileUploadInputChange = this.handleFileUploadInputChange.bind(
      this
    );
    this.fileInput = React.createRef();
  }

  /*
   *
   *
   * STATIC METHODS
   *
   *
   */
  public static async loadAlignmentFromURL(
    url: string,
    callback: (a: Alignment) => void,
    filename?: string
  ) {
    const f = new File(
      [await (await fetch(`${url}`)).blob()],
      filename ? filename : url.substring(url.lastIndexOf("/") + 1)
    );
    return AlignmentFileLoaderComponent.readAlignmentFileText(f, callback);
  }

  /**
   * Read the file text and report loading to the parent
   * @param file
   */
  private static readAlignmentFileText(
    file: File,
    callback: (a: Alignment) => void
  ) {
    var reader = new FileReader();
    reader.onload = (e) => {
      const fileText = reader.result as string;
      let alignment: Alignment;
      try {
        alignment = StockholmAlignment.fromFileContents(file.name, fileText);
      } catch (e) {
        alignment = FastaAlignment.fromFileContents(file.name, fileText);
      }
      callback(alignment);
    };
    reader.readAsText(file);
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
    const { onFileLoadStart } = this.props;
    event.preventDefault();

    if (this.fileInput.current && this.fileInput.current.files) {
      if (onFileLoadStart) {
        onFileLoadStart();
      }
      setTimeout(() => {
        //safari needs this in a timeout, otherwise it runs synchronously?!?
        const file = this.fileInput.current!.files![0];
        AlignmentFileLoaderComponent.readAlignmentFileText(
          file,
          this.alignmentLoaded
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
                AlignmentFileLoaderComponent.loadAlignmentFromURL(
                  ef.fileURL,
                  this.alignmentLoaded,
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
