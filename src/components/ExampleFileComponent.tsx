import * as React from "react";

export interface IExampleFileProps {
  labelText: string;
  fileURL: string;
  fileName: string;
  onFileLoaded: (file: File) => void;
  onStartLoading?: () => void;
}

export class ExampleFileComponent extends React.Component<IExampleFileProps> {
  render() {
    const {
      fileURL,
      fileName,
      labelText,
      onStartLoading,
      onFileLoaded,
    } = this.props;
    return (
      <button
        type="button"
        className="button-link"
        onClick={async (e) => {
          if (onStartLoading) {
            onStartLoading();
          }
          const f = new File(
            [await (await fetch(`${fileURL}`)).blob()],
            fileName
          );
          onFileLoaded(f);
        }}
      >
        {labelText}
      </button>
    );
  }
}
