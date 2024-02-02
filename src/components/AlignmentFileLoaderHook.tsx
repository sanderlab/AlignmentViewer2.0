import * as React from "react";
import "./AlignmentFileLoader.scss";
import { Alignment } from "../common/Alignment";
import { AlignmentLoader, AlignmentLoadError } from "../common/AlignmentLoader";
import { useCallback, useEffect, useRef, useState } from "react";


interface IFileLoaderBasics {
  id: string;
  removeDuplicateSeqs: boolean;

  onAlignmentLoaded: (alignment: Alignment) => void; //loading ended
  onAlignmenLoadError: (e: AlignmentLoadError) => void; //loading error
  onFileLoadStart: () => void; //notify on begin loading
}

export interface IExampleFileProps extends IFileLoaderBasics {
  labelText: string;
  fileURL: string;
  fileName: string;
}

export interface IAlignmentLoaderProps extends IFileLoaderBasics {}


export function AlignmentFileLoader(props: IAlignmentLoaderProps) {
  const {
    id,
    onAlignmentLoaded,
    onFileLoadStart,
    onAlignmenLoadError,
    removeDuplicateSeqs,
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
  
  return (
    <div className="file-upload-input">
      <input
        id={id}
        type="file"
        className="av2-hidden-file-input"
        ref={fileInput}
        onChange={handleFileUploadInputChange}
      />
      <button type="button" onClick={handleLinkClick}>
        Choose File
      </button>
    </div>
  );
}

export const AlignmentExampleFile = (props: IExampleFileProps) => {
  const {
    labelText,
    fileURL,
    fileName,
    onAlignmentLoaded,
    onFileLoadStart,
    onAlignmenLoadError,
    removeDuplicateSeqs
  } = props;

  return (
    <button
      type="button"
      className="button-link"
      key={fileURL}
      onClick={(e) => {
        e.preventDefault();
        if (onFileLoadStart) {
          onFileLoadStart();
        }
        AlignmentLoader.loadAlignmentFromURL(
          fileURL,
          removeDuplicateSeqs,
          onAlignmentLoaded,
          onAlignmenLoadError,
          fileName
        );
      }}
    >
      {labelText}
    </button>
  )
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
        display: isVisible ? "grid" : "none",
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
