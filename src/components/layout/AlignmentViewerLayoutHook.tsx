import "./AlignmentViewerLayout.scss"
import React, { useCallback, useMemo, useState } from "react";
import { useResizeGrid } from "./ResizeGridHook";
import { IBounds, ReactResizeSensor } from "../ResizeSensorHook";

interface IMetadataAndContent{
  metadata: string | React.JSX.Element,
  content: React.JSX.Element
}

export interface IFixedWidth{
  type: "fixed-width";
  width: number;
}
export interface IAdjustableWidth{
  type: "adjustable-width";
  startingWidth: number;
  minWidth: number;
  maxWidth: number;
}

export type IAlignmentViewerLayoutProps = {
  alignmentDetails: IMetadataAndContent,
  consensus?: IMetadataAndContent,
  query?: IMetadataAndContent,
  positionalAxis?: IMetadataAndContent,
  logoPlot?: IMetadataAndContent,
  minimapPlot?: React.JSX.Element,

  showConsensus: boolean,
  showQuery: boolean,
  showPositionalAxis: boolean,
  showLogoPlot: boolean,
  showMinimap: boolean,

  //misc
  rulerConsensusQueryHeightPx: number;
  titleFontSize?: number;

} & Partial<typeof defaultProps>;

const defaultProps = {
  barplots: [] as IMetadataAndContent[], //undefined or length === 0 means no barplots

  //misc
  showMetadata: true,

  //layout sizing
  gapBetweenColumnsAndRowsPx: 6,
  gapViewportTopPx: 0,
  gapViewportBottomPx: 6,
  gapViewportLeftPx: 6,
  gapViewportRightPx: 6,

  //element sizing
  barplotsHeightPx: 50,
  logoHeightPx: 100,
  resizeBarSizePx: 4, //width of resize bar (or height if we implement later)
  metadataSizing: {
    type: "adjustable-width", 
    startingWidth: 150,
    minWidth: 100, 
    maxWidth: 400
  } as IFixedWidth | IAdjustableWidth,

  minimapSizing: {
    type: "adjustable-width", 
    startingWidth: 100,
    minWidth: 100, 
    maxWidth: 300
  } as IFixedWidth | IAdjustableWidth,
}

/**
 * Main react hook for laying out the entire alignment viewer 2.0 visualization.
 * @param props 
 * @returns 
 */
export function AlignmentViewerLayout(props: IAlignmentViewerLayoutProps) {

  const {
    //elements
    barplots,
    logoPlot,
    alignmentDetails,
    consensus,
    query,
    positionalAxis,
    minimapPlot,

    showConsensus,
    showQuery,
    showPositionalAxis,
    showLogoPlot,
    showMinimap,

    //misc
    showMetadata,

    //element heights
    rulerConsensusQueryHeightPx,
    barplotsHeightPx,
    logoHeightPx,

    //layout sizing
    metadataSizing,
    minimapSizing,

    resizeBarSizePx,
    gapBetweenColumnsAndRowsPx,
    gapViewportTopPx,
    gapViewportBottomPx,
    gapViewportLeftPx,
    gapViewportRightPx,
  } = {
    ...defaultProps,
    ...props
  };

  const {
    titleFontSize = rulerConsensusQueryHeightPx - 2
  } = props;

  const metadataStartingWidth = !showMetadata 
    ? 100 //won't be shown though so doesn't matter what is here
    : metadataSizing.type === "fixed-width"
      ? metadataSizing.width
      : metadataSizing.startingWidth;

  const minimapStartingWidth = !showMinimap 
    ? 100 //won't be shown though so doesn't matter what is here
    : minimapSizing.type === "fixed-width"
      ? minimapSizing.width
      : minimapSizing.startingWidth;

  //state and ref
  const [
    metadataWidth, setMetadataWidth
  ] = useState<number>(metadataStartingWidth)

  const [
    minimapWidth, setMinimapWidth
  ] = useState<number>(minimapStartingWidth);

  const [
    currentGridDimensions, setCurrentGridDimensions
  ] = useState<IBounds>();

  //
  // calculate current sizing for dragging
  //
  const resizeSensor = useCallback((bounds: IBounds)=>{
    setCurrentGridDimensions(bounds);
  }, []);

  //
  //render a single row worth of info - metadata and content, or for the
  //main viewport, content and content
  //
  const renderWidget = useCallback((props: {
    key: string;
    metadataAndContent: IMetadataAndContent | undefined;
    metadataGridArea: string;
    contentGridArea: string;
    forceHide?: boolean;
    metadataClassname?: string;
    contentClassname?: string;
  })=>{
    const {
      key,
      metadataAndContent,
      metadataGridArea,
      contentGridArea,
      forceHide = false,
      metadataClassname = "metadata-title",
      contentClassname = "content"
    } = props;

    return !metadataAndContent 
      ? undefined 
      : (//empty tag doesn't support key, so need to use fragment
        <React.Fragment key={key}>
          <div 
            className={`${metadataClassname}`} 
            style={{
              gridArea: metadataGridArea,
              fontSize: titleFontSize,
              display: !showMetadata || forceHide ? "none" : undefined
            }}>
            {typeof metadataAndContent.metadata === "string"
              ? `${metadataAndContent.metadata}:`
              : metadataAndContent.metadata}
          </div>
          <div 
            className={contentClassname} 
            style={{
              gridArea: contentGridArea,
              display: forceHide ? "none" : undefined
            }}>
            {metadataAndContent.content}
          </div>
        </React.Fragment>
      );
  }, [
    showMetadata,
    titleFontSize
  ]);

  //
  //METADATA Resizing
  //
  const metadataBarResized = useCallback((newBarClientX: number)=>{
    if(metadataSizing.type==="fixed-width" || !currentGridDimensions) return; //shouldn't happen

    //relate metadata width to offset of resizer
    const newProposedWidth = (
      newBarClientX - 
      (resizeBarSizePx/2) -             //center of resize element
      gapBetweenColumnsAndRowsPx -      //extra gap size between resizer and metadata
      currentGridDimensions.getLiveLeft() -     //actual offset of grid
      gapViewportLeftPx                 //gap between edge of browser and entire grid
    );

    setMetadataWidth(
      newProposedWidth > metadataSizing.maxWidth
        ? metadataSizing.maxWidth
        : newProposedWidth < metadataSizing.minWidth
          ? metadataSizing.minWidth
          : newProposedWidth
    );
  }, [
    currentGridDimensions,
    metadataSizing,
    resizeBarSizePx,
    gapBetweenColumnsAndRowsPx,
    gapViewportLeftPx
  ]);

  const metadataResizer = useResizeGrid({
    resizeSeparatorGridAreaName: "metadata-resizer",
    resizeDirection: "horizontal",
    draggerMoved: metadataBarResized
  });

  //
  //MINIMAP Resizing
  //
  const minimapBarResized = useCallback((newBarClientX: number)=>{
    if(minimapSizing.type==="fixed-width" || !currentGridDimensions) return; //shouldn't happen

    const newProposedWidth = (
      currentGridDimensions.getLiveRight() -  //minimap is on the right side of the viewport
      newBarClientX -                //on the right side of the screen so remove
      (resizeBarSizePx/2) -          //center of resize element
      gapBetweenColumnsAndRowsPx -   //size between 
      gapViewportRightPx             //gap between edge of browser and entire grid
    );

    setMinimapWidth(
      newProposedWidth > minimapSizing.maxWidth
        ? minimapSizing.maxWidth
        : newProposedWidth < minimapSizing.minWidth
          ? minimapSizing.minWidth
          : newProposedWidth
    );
  }, [
    currentGridDimensions,
    minimapSizing,
    resizeBarSizePx,
    gapBetweenColumnsAndRowsPx,
    gapViewportRightPx
  ]);
  const minimapResizer = useResizeGrid({
    resizeSeparatorGridAreaName: "minimap-resizer",
    resizeDirection: "horizontal",
    draggerMoved: minimapBarResized
  });

  //
  //get the grid template areas string
  //
  const gridTemplateAreas = useMemo(()=>{
    const accountForMetadataAndMinimap = (
      metadataColArea: string, contentColArea: string
    ) => {
      const metadataText = !showMetadata
        ? ""
        : metadataSizing.type==="adjustable-width"
          ? `${metadataColArea} metadata-resizer`
          : metadataColArea;

      const minimapText = !showMinimap
        ? ""
        : minimapSizing.type==="adjustable-width"
          ? "minimap-resizer minimap"
          : "minimap";

      return `"${metadataText} ${contentColArea} ${minimapText}"`
    };

    return [
      ...barplots.map((bp, idx) => {
        return accountForMetadataAndMinimap(
          `barplot-${idx}-metadata`, `barplot-${idx}`
        );
      }),

      ...!showLogoPlot 
        ? [] 
        : [accountForMetadataAndMinimap("logo-metadata", "logo")],

      ...!showConsensus 
        ? []
        : [accountForMetadataAndMinimap("consensus-metadata", "consensus")],

      ...!showQuery 
        ? []
        : [accountForMetadataAndMinimap("query-metadata", "query")],

      ...!showPositionalAxis 
        ? []
        : [accountForMetadataAndMinimap("position-axis-metadata", "position-axis")],
      
      accountForMetadataAndMinimap("ids-and-annotations", "main-viewport"),
    ].join("\n");
  }, [
    metadataSizing.type,
    minimapSizing.type,
    showMetadata, 
    showMinimap,
    barplots,
    showConsensus,
    showLogoPlot,
    showPositionalAxis,
    showQuery,
  ]);

  const gridTemplateColumns = useMemo(()=>{
    const metadataText = !showMetadata
      ? ""
      : metadataSizing.type==="adjustable-width"
        ? `${metadataWidth}px ${resizeBarSizePx}px`
        : `${metadataWidth}px`; //fixed

    const minimapText = !showMinimap
      ? ""
      : minimapSizing.type==="adjustable-width"
        ? `${resizeBarSizePx}px ${minimapWidth}px`
        : `${minimapWidth}px`; //fixed

    return `${metadataText} auto ${minimapText}`;

  }, [
    resizeBarSizePx,
    metadataSizing.type,
    minimapSizing.type,
    showMetadata, 
    showMinimap,
    metadataWidth,
    minimapWidth
  ]);

  //
  // output full alignmentviewer
  //
  return (
    <>
      {
        !showMetadata 
          ? undefined 
          : metadataResizer.draggerFullScreenElement
      }
      {
        !showMinimap 
          ? undefined 
          : minimapResizer.draggerFullScreenElement
      }
      <ReactResizeSensor onSizeChanged={resizeSensor}>
        <div className="alignment-viewer-2" style={{
          top: `${gapViewportTopPx}px`,
          bottom: `${gapViewportBottomPx}px`,
          left: `${gapViewportLeftPx}px`,
          right: `${gapViewportRightPx}px`,
          gap: `${gapBetweenColumnsAndRowsPx}px`,
          gridTemplateColumns: gridTemplateColumns,
          gridTemplateRows: `
            ${barplots.map(bp => `${barplotsHeightPx}px`).join("\n")}
            ${showLogoPlot ? `${logoHeightPx}px` : ""} 
            ${showConsensus ? `${rulerConsensusQueryHeightPx}px` : ""} 
            ${showQuery ? `${rulerConsensusQueryHeightPx}px` : ""} 
            ${showPositionalAxis ? `${rulerConsensusQueryHeightPx}px` : ""}
            auto
          `,
          gridTemplateAreas: gridTemplateAreas
        }}>

          { 
            //
            //primary area w/o minimap 
            //
          }

          { //barplots
            barplots.map((bp, idx) => {
              return renderWidget({
                key: `bp${idx}`,
                metadataAndContent: bp,
                metadataGridArea: `barplot-${idx}-metadata`,
                contentGridArea: `barplot-${idx}`,
              });
            })
          }

          { //logo
            renderWidget({
              key: `logo`,
              metadataAndContent: logoPlot,
              metadataGridArea: "logo-metadata",
              contentGridArea: "logo",
              forceHide: !showLogoPlot
            })
          }

          { //consensus
            renderWidget({
              key: `c`,
              metadataAndContent: consensus,
              metadataGridArea: "consensus-metadata",
              contentGridArea: "consensus",
              forceHide: !showConsensus
            })
          }

          { //consensus
            renderWidget({
              key: `q`,
              metadataAndContent: query,
              metadataGridArea: "query-metadata",
              contentGridArea: "query",
              forceHide: !showQuery
            })
          }


          { //positional axis
            renderWidget({
              key: `ruler`,
              metadataAndContent: positionalAxis,
              metadataGridArea: "position-axis-metadata",
              contentGridArea: "position-axis",
              forceHide: !showPositionalAxis
            })
          }

          { //main viewport
            renderWidget({
              key: `main`,
              metadataAndContent: alignmentDetails,
              metadataGridArea: "ids-and-annotations",
              contentGridArea: "main-viewport",
              metadataClassname: "content"
            })
          }

          {
            // minimap 
            <div 
              className="minimap-content" 
              style={{
                gridArea: "minimap", 
                display: !showMinimap ? "none" : undefined
              }}>
              {minimapPlot}
            </div>
          }

          {
            //minimap resizing
            !showMinimap || minimapSizing.type !== "adjustable-width"
              ? undefined
              : minimapResizer.resizeSeparator
          }

          {
            // metadata 
            !showMetadata || metadataSizing.type !== "adjustable-width"
              ? undefined 
              : (
                metadataResizer.resizeSeparator
              )
          }
        </div>
      </ReactResizeSensor>
    </>
  );
}
