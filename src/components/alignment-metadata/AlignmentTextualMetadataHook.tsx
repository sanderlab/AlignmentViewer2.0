/**
 * Base hook for pure webgl alignment details.
 */
import "./AlignmentTextualMetadata.scss";
import React, { useCallback, useMemo, useState } from "react";

import { VirtualizedMatrixViewer } from "../virtualization/VirtualizedMatrixViewerHook";
import { generateUUIDv4, startEndIdxToArray } from "../../common/Utils";
import { IControllerRole, IResponderRole, ScrollbarOptions, VirtualizationRole, VirtualizationStrategy } from "../virtualization/VirtualizationTypes";

export interface IAlignmentTextualMetadataProps {
  alignmentUUID: string;
  textForEachSeq: string[];
  letterHeight: number;
  letterWidth: number;
  fontSize: number;
  tabFontSize?: number;
  //disableAnnotations?: boolean; //maybe later?
  annotationData?: string[]

  vertVirtualization: IControllerRole | IResponderRole | "Automatic";
  genenameHorizVirtualization: IControllerRole | IResponderRole | "Automatic";
  annotationHorizVirtualization: IControllerRole | IResponderRole | "Automatic";
}

export function AlignmentTextualMetadata(
  props: IAlignmentTextualMetadataProps
) {
  //props
  const {
    alignmentUUID,
    textForEachSeq,
    letterHeight,
    letterWidth,
    fontSize,
    tabFontSize = fontSize+4,
    annotationData
  } = props;

  //
  //state and callbacks
  //
  const containerId = useState<string>(generateUUIDv4()); //unique id for virtualization
  const [showTabs, setShowTabs] = useState(false);
  const [selectedTab, setSelectedTabIdx] = useState<
    "id" | "annotations"
  >("id");

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

  //
  //load virtualizations - either from props or auto generate. or don't virtualize
  //
  const seqLength = textForEachSeq.length < 1 ? 0 : textForEachSeq[0].length; //empty alignment
  const vertVirtualization = useMemo(()=>{
    return props.vertVirtualization === "Automatic"
      ? {
          virtualizationId: 
            `y_auto_generated_metadata_virtualization_${alignmentUUID}_${containerId}`,
          role: VirtualizationRole.Controller,
          cellCount: seqLength,
          cellSizePx: letterHeight,
        } as IControllerRole
      : props.vertVirtualization;
  }, [
    alignmentUUID, 
    containerId,
    seqLength,
    props.vertVirtualization,
    letterHeight
  ]); 

  const genenameHorizVirtualization = useMemo(()=>{
    return props.genenameHorizVirtualization === "Automatic"
      ? {
          virtualizationId: 
            `x_auto_generated_genename_virtualization_${alignmentUUID}_${containerId}`,
          role: VirtualizationRole.Controller,
          cellCount: maxTextLength,
          cellSizePx: letterWidth
        } as IControllerRole
      : props.genenameHorizVirtualization;
  }, [
    alignmentUUID,
    containerId, 
    letterWidth,
    maxTextLength,
    props.genenameHorizVirtualization
  ]);

  const annotationHorizVirtualization = props.annotationHorizVirtualization === "Automatic"
    ? {
        virtualizationId: 
          `x_auto_generated_annotation_virtualization_${alignmentUUID}_${containerId}`,
        axisId: `x_auto_generated_annotation_axis_${alignmentUUID}_${containerId}`,
        role: VirtualizationRole.Controller,
        cellCount: 10, //TODO Update when implemented
        cellSizePx: letterHeight //TODO Update when implemented
      } as IControllerRole
    : props.annotationHorizVirtualization;

  const renderGenenames = useCallback((props: {
    firstRowIdxToRender: number, lastRowIdxToRender: number,
    firstColIdxToRender: number, lastColIdxToRender: number
  })=>{
    const {
      firstRowIdxToRender, lastRowIdxToRender,
      firstColIdxToRender, lastColIdxToRender
    } = props;
    
    return (
      <div
        className="av2-sequence-names"
        style={{
          fontSize: fontSize,
          lineHeight: letterHeight + "px",
        }}
      >
        <div className="virtualized-sequence-name">
          {startEndIdxToArray(firstRowIdxToRender, lastRowIdxToRender).map((rowIdx)=>{
            const fullTextLine = textForEachSeq[rowIdx];
            return (
              <React.Fragment key={fullTextLine}>
                {startEndIdxToArray(firstColIdxToRender, lastColIdxToRender).map(
                    (colIdx) => {
                      return fullTextLine.length > colIdx
                        ? fullTextLine[colIdx]
                        : "";//"\u00A0";
                  }).join("")}
                <br />
              </React.Fragment>
            );
          })}
        </div>
        <div className="hidden-sequence-names-for-copy-paste">
          {startEndIdxToArray(firstRowIdxToRender, lastRowIdxToRender).map((rowIdx)=>{
            const fullTextLine = textForEachSeq[rowIdx];
            return (
              <React.Fragment key={`cp_${fullTextLine}`}>
                {fullTextLine}
                <br />
              </React.Fragment>
            )
          })}
        </div>
      </div>
    )
  }, [fontSize, letterHeight, textForEachSeq]);

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
          ["metadata-tab-bar", ...(showTabs ? [] : ["hidden"])].join(' ')
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
            onClick={(e)=>{ 
              setSelectedTabIdx("id"); 
              e.preventDefault(); 
            }}>
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
            onClick={(e)=>{ 
              setSelectedTabIdx("annotations"); 
              e.preventDefault(); 
            }}>
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
          horizontalParams={{
            ...genenameHorizVirtualization,
            scrollbar: ScrollbarOptions.OnHoverWhenOverflowed,
            virtualizationStrategy: VirtualizationStrategy.Virtualize,
            hoverTracker: undefined
          }}
          verticalParams={{
            ...vertVirtualization,
            scrollbar: ScrollbarOptions.OnHoverWhenOverflowed,
            virtualizationStrategy: VirtualizationStrategy.Virtualize,
            hoverTracker: "both"
          }}
          getMatrixContent={renderGenenames}
        />
      </div>
      
      <div 
        style={{ 
          display: annotationData && selectedTab === "annotations" 
            ? "block" 
            : "none"
        }}
      >
        {
          <VirtualizedMatrixViewer
            horizontalParams={{
              ...annotationHorizVirtualization,
              virtualizationStrategy: VirtualizationStrategy.Virtualize,
              scrollbar: ScrollbarOptions.OnHoverWhenOverflowed,
              hoverTracker: undefined
            }}
            verticalParams={{
              ...vertVirtualization,
              virtualizationStrategy: VirtualizationStrategy.Virtualize,
              scrollbar: ScrollbarOptions.OnHoverWhenOverflowed,
              hoverTracker: "both"
            }}
            getMatrixContent={(params)=>{
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
        }
      </div>
    </div>
  );
}
