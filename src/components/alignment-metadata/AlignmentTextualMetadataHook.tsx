/**
 * Base hook for pure webgl alignment details.
 */
import "./AlignmentTextualMetadata.scss";
import React, { useCallback, useMemo, useState } from "react";

import { ScrollbarOptions, VirtualizedMatrixViewer } from "../virtualization/VirtualizedMatrixViewerHook";

export interface IAlignmentTextualMetadataProps {
  alignmentUUID: string;
  verticalReduxId: string;
  textForEachSeq: string[];
  letterHeight: number;
  letterWidth: number;
  fontSize: number;
  tabFontSize?: number;
  //disableAnnotations?: boolean; //maybe later?
  annotationData?: string[]
}

export function AlignmentTextualMetadata(
  props: IAlignmentTextualMetadataProps
) {
  //props
  const {
    alignmentUUID,
    verticalReduxId,
    textForEachSeq,
    letterHeight,
    letterWidth,
    fontSize,
    tabFontSize = fontSize+4,
    annotationData
  } = props;

  const [showTabs, setShowTabs] = useState(false);
  const [selectedTab, setSelectedTabIdx] = useState<
    "id" | "annotations"
  >("id");

  const genenameReduxId = useMemo(()=>{
    return 'genename_x_'+alignmentUUID;
  }, [alignmentUUID]);

  const annotationsReduxId = useMemo(()=>{
    return 'annotations_x_'+alignmentUUID;
  }, [alignmentUUID]);

  const maxTextLength = useMemo(() => {
    return textForEachSeq.reduce((acc, txt) => {
      return txt.length > acc ? txt.length : acc;
    }, 0);
  }, [textForEachSeq]);
  
  const mouseEntered = useCallback(()=>{
    setShowTabs(true);
  }, []);

  const mouseExited = useCallback(()=>{
    setShowTabs(false);
  }, []);

  /**
   *
   *
   *
   * Render
   *
   *
   *
   */
  return (
    <div className="av2-metadata-box"
      onMouseEnter={mouseEntered}
      onMouseLeave={mouseExited}
    >
      {/* The tabs that allow for viewing of annotations or gene names */}
      <div 
        className={
          ["tab-bar", ...(showTabs ? [] : ["hidden"])].join(' ')
        }
        style={{ 
          height: tabFontSize*3,
          top: -tabFontSize*3,
        }}>
        
        <div className="tab-holder">
          <button
            className={
              [ "id", ...(
                selectedTab === "id" ? ["selected"] : []
              )].join(" ")
            }
            style={{ fontSize: tabFontSize }}
            onClick={()=>{ setSelectedTabIdx("id") }}>
            id
          </button>
        </div>

        <div className="tab-holder">
          <button
            className={
              [ "annotation", ...(
                selectedTab === "annotations" ? ["selected"] : []
              )].join(" ")
            }
            style={{ fontSize: tabFontSize }}
            onClick={()=>{ setSelectedTabIdx("annotations") }}>
            annotations
          </button>
        </div>
      </div>

      { selectedTab === "id" ? undefined : 
        <div className="no-annotations-placeholder">
          <div className="centered-content">
            no annotations auto discovered or uploaded
          </div>
        </div>
      }

      <div style={{
        display: selectedTab === "id" ? "block" : "none"
      }}>
        <VirtualizedMatrixViewer
          verticalReduxId={verticalReduxId}
          horizontalReduxId={genenameReduxId}
          direction="all"
          columnCount={maxTextLength}
          columnWidth={letterWidth}
          rowCount={textForEachSeq.length}
          rowHeight={letterHeight}
          suppressHorizontalHoverTracker={true}
          autoOffset={true}
          verticalScrollbar={ScrollbarOptions.OnHoverWhenOverflowed}
          horizontalScrollbar={ScrollbarOptions.OnHoverWhenOverflowed}
          getContent={({
            rowIdxsToRender,
            colIdxsToRender
          }) => {
            return (
              <div
                className="av2-sequence-names"
                style={{
                  fontSize: fontSize,
                  lineHeight: letterHeight + "px",
                }}
              >
                {rowIdxsToRender.map((rowIdx) => {
                  const fullTextLine = textForEachSeq[rowIdx];
                  return (
                    <div key={fullTextLine}>
                      {colIdxsToRender
                        .map((colIdx) => {
                          return fullTextLine.length > colIdx
                            ? fullTextLine[colIdx]
                            : "";
                        })
                        .join("")}
                    </div>
                  );
                })}
              </div>
            );
          }}
        />
      </div>
      
      <div 
        style={{ 
          display: annotationData && selectedTab === "annotations" 
            ? "block" 
            : "none"
        }}
      >
        <VirtualizedMatrixViewer
          verticalReduxId={verticalReduxId}
          horizontalReduxId={annotationsReduxId}
          direction="all"
          columnCount={5} //todo
          columnWidth={1} //todo
          rowCount={textForEachSeq.length}
          rowHeight={letterHeight}
          autoOffset={true}
          verticalScrollbar={ScrollbarOptions.NeverOn}//ScrollbarOptions.OnHoverWhenOverflowed} //todo
          horizontalScrollbar={ScrollbarOptions.NeverOn}//ScrollbarOptions.OnHoverWhenOverflowed} //todo
          suppressHorizontalHoverTracker={true}
          suppressVerticalHoverTracker={true}
          getContent={({
            rowIdxsToRender,
            colIdxsToRender
          }) => {

            return (
              <div
                className="av2-annotations"
                style={{
                  fontSize: fontSize,
                  lineHeight: letterHeight + "px",
                }}>
                  {/* annotations will go here */}
              </div>
            );
          }}
        />
      </div>
    </div>
  );
}
