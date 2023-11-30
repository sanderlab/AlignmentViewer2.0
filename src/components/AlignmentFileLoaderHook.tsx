import * as React from "react";
import "./AlignmentFileLoader.scss";
import { Alignment } from "../common/Alignment";
import { AlignmentLoader, AlignmentLoadError } from "../common/AlignmentLoader";
import { useCallback, useEffect, useRef, useState } from "react";

export interface IExampleFileProps {
  labelText: string;
  fileURL: string;
  fileName: string;
}

export interface IAlignmentLoaderProps {
  fileSelectorLabelText: string;

  removeDuplicateSeqs: boolean;
  setRemoveDuplicateSeqs: (newValue: boolean) => void;

  onAlignmentLoaded: (alignment: Alignment) => void; //loading ended
  onAlignmenLoadError: (e: AlignmentLoadError) => void; //loading error

  exampleFiles?: IExampleFileProps[];
  onFileLoadStart?: () => void; //notify on begin loading
}


export function AlignmentFileLoader(props: IAlignmentLoaderProps) {
  
  const {
    exampleFiles,
    onAlignmentLoaded,
    onFileLoadStart,
    onAlignmenLoadError,
    removeDuplicateSeqs,
    setRemoveDuplicateSeqs
  } = props;

  const {
    fileSelectorLabelText = "Upload"
  } = props;

  const fileInput  = useRef<HTMLInputElement>(null)


  //
  //useCallback methods
  //
  const handleLinkClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();
    fileInput.current?.click();
  }, [fileInput]);

  const alignmentLoaded = useCallback((alignment: Alignment) => {
    onAlignmentLoaded(alignment);
    if (fileInput.current) {
      fileInput.current.value = ""; //reset the input box
    }
  }, [fileInput, onAlignmentLoaded]);

  const handleFileUploadInputChange = useCallback((
    e: React.FormEvent<HTMLInputElement>
  ) => {
    e.preventDefault();
    if (fileInput.current && fileInput.current.files) {
      if (onFileLoadStart) { onFileLoadStart(); }
      setTimeout(() => {
        //safari needs this in a timeout, otherwise it runs synchronously?!?
        const file = fileInput.current!.files![0];
        AlignmentLoader.loadAlignmentFromFile(
          file,
          removeDuplicateSeqs,
          alignmentLoaded,
          onAlignmenLoadError
        );
      });
    }
  }, [
    alignmentLoaded,
    fileInput, 
    onAlignmenLoadError,
    onFileLoadStart,
    removeDuplicateSeqs
  ]);

  //
  //render methods - useCallback
  //
  const renderFileUpload = useCallback(() => {
    return (
      <label>
        <strong>{fileSelectorLabelText}</strong>
        <input
          type="file"
          className="av2-hidden-file-input"
          ref={fileInput}
          onChange={handleFileUploadInputChange}
        />
        <button type="button" onClick={handleLinkClick}>
          Choose File
        </button>
      </label>
    );
  }, [
    fileSelectorLabelText, 
    handleFileUploadInputChange, 
    handleLinkClick
  ]);

  const renderExampleFiles = useCallback(() => {
    return !exampleFiles ? null : (
      <label>
        <strong>Example Alignments:</strong>
        {exampleFiles.map((ef) => {
          return (
            <button
              type="button"
              className="button-link"
              key={ef.fileURL}
              onClick={(e) => {
                e.preventDefault();
                if (onFileLoadStart) {
                  onFileLoadStart();
                }
                AlignmentLoader.loadAlignmentFromURL(
                  ef.fileURL,
                  removeDuplicateSeqs,
                  alignmentLoaded,
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
  }, [
    onFileLoadStart, 
    alignmentLoaded, 
    exampleFiles,
    onAlignmenLoadError,
    removeDuplicateSeqs
  ]);

  const renderRemoveDuplicatesCheckbox = useCallback(() => {
    return (
      <label>
        <strong>Remove Duplicate Sequences on Load:</strong>
        <input
          name="Remove Duplicates"
          type="checkbox"
          checked={removeDuplicateSeqs}
          onChange={(e) => {
            setRemoveDuplicateSeqs(e.target.checked);
          }}
        />
      </label>
    );
  }, [removeDuplicateSeqs, setRemoveDuplicateSeqs]);

  return (
    <div className="av2-input-file-loader">
      <div className="file-upload-input">{renderFileUpload()}</div>
      <div className="example-files">{renderExampleFiles()}</div>
      <div className="remove-duplicates">
        {renderRemoveDuplicatesCheckbox()}
      </div>
    </div> 
  );
}


export const AlignmentFileDrop = (props: {
  removeDuplicateSeqs: boolean,
  alignmentLoaded: (alignment: Alignment) => void,
  onAlignmenLoadError: (e: AlignmentLoadError) => void,
  onFileLoadStart?: () => void,
}) => {
  //inspired by https://stackoverflow.com/questions/38689741
  const {
    alignmentLoaded,
    onAlignmenLoadError,
    removeDuplicateSeqs,
    onFileLoadStart
  } = props;

  //
  // state
  //
  const [isVisible, setIsVisible] = useState(false);
  const [mouseoverTarget, setMouseoverTarget] = useState(false);

  const onDragEnter = useCallback((e: DragEvent | React.DragEvent) => {
    if (e.dataTransfer?.items.length === 1 && 
        e.dataTransfer?.types.indexOf('Files') !== -1){
      setIsVisible(true);
      e.stopPropagation();
      e.preventDefault();
      return false;
    }
  }, []);

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }, []);

  const onDragLeave = useCallback((e: DragEvent | MouseEvent | React.DragEvent) => {
    setIsVisible(false);
    e.stopPropagation();
    e.preventDefault();
    return false;
  }, []);

  const onDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;

    if (files && files.length > 0 && mouseoverTarget) {
      if (onFileLoadStart) { onFileLoadStart(); }
      setTimeout(() => {
        //safari needs this in a timeout, otherwise it runs synchronously?!?
        const file = files[0];
        AlignmentLoader.loadAlignmentFromFile(
          file,
          removeDuplicateSeqs,
          alignmentLoaded,
          onAlignmenLoadError
        );
      });
    }

    // Upload files
    setIsVisible(false);
    setMouseoverTarget(false);
    return false;
  }, [
    alignmentLoaded,
    mouseoverTarget,  
    onAlignmenLoadError,
    onFileLoadStart,
    removeDuplicateSeqs, 
  ]);

  useEffect(() => {
    window.addEventListener('mouseup', onDragLeave);
    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('mouseup', onDragLeave);
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, [onDragEnter, onDragLeave, onDragOver, onDrop]);

  return (
    <div 
      id="av2-fileloader-fullpage-id"
      className="av2-fileloader-fullpage"
      style={{
        display: isVisible ? "block" : "none",
      }}
      onDragLeave={(e)=>{
        if (!e.relatedTarget){
          onDragLeave(e);
        }
        //setMouseoverTarget(false); 
      }}
    >
      <div 
        className="av2-fileloader-dropbox"
        style={{
          opacity: mouseoverTarget ? 1 : .4,
        }}
        onDragEnter={(e)=>{
          setMouseoverTarget(true);
          onDragEnter(e);
        }}
        onDragLeave={(e)=>{
          setMouseoverTarget(false); 
        }}
      >
       Drop alignment file here to load
      </div>
    </div>
  );
};
