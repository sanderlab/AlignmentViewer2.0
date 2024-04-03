import "./AlignmentViewerLayout.scss"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useResizeGrid } from "./ResizeGridHook";
import { IBounds, ReactResizeSensor } from "../ResizeSensorHook";

export interface IMetadataAndContent{
  metadata: string | React.JSX.Element;
  content: React.JSX.Element;
}

export interface IMetadataContentAndHeight extends IMetadataAndContent{
  heightPx: number;
}

export interface IMetadataContentAndKey extends IMetadataAndContent{
  contentKey: string;
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

export interface IFixedHeight{
  type: "fixed-height";
  height: number;
}
export interface IAdjustableHeight{
  type: "adjustable-height";
  startingHeight: number;
  minHeight: number;
  maxHeight: number;
}

export type IAlignmentViewerLayoutProps = {
  alignmentDetails: IMetadataAndContent,
  consensus?: IMetadataContentAndHeight,
  query?: IMetadataContentAndHeight,
  positionalAxis?: IMetadataContentAndHeight,
  logoPlot?: IMetadataAndContent,
  minimapPlot?: React.JSX.Element,

  showConsensus: boolean,
  showQuery: boolean,
  showPositionalAxis: boolean,
  showLogoPlot: boolean,
  showMinimap: boolean,

  //misc
  titleFontSize: number;

} & Partial<typeof defaultProps>;

const defaultProps = {
  barplots: [] as IMetadataContentAndKey[], //undefined or length === 0 means no barplots

  //misc
  showMetadata: true,

  //layout sizing
  gapBetweenColumnsAndRowsPx: 4,
  gapViewportTopPx: 0,
  gapViewportBottomPx: 6,
  gapViewportLeftPx: 6,
  gapViewportRightPx: 6,

  //element sizing
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

  barplotSizing: {
    type: "adjustable-height", 
    startingHeight: 60,
    minHeight: 25, 
    maxHeight: 200
  } as IFixedHeight | IAdjustableHeight,

  logoSizing: {
    type: "adjustable-height", 
    startingHeight: 100,
    minHeight: 50, 
    maxHeight: 300
  } as IFixedHeight | IAdjustableHeight,
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

    //layout sizing
    metadataSizing,
    minimapSizing,

    barplotSizing,
    logoSizing,

    resizeBarSizePx,
    gapBetweenColumnsAndRowsPx,
    gapViewportTopPx,
    gapViewportBottomPx,
    gapViewportLeftPx,
    gapViewportRightPx,

    titleFontSize
  } = {
    ...defaultProps,
    ...props
  };

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

  const barplotStartingHeight = barplotSizing.type === "fixed-height" 
    ? barplotSizing.height
    : barplotSizing.startingHeight;

  const logoStartingHeight = logoSizing.type === "fixed-height" 
    ? logoSizing.height
    : logoSizing.startingHeight;
  
  //state and ref
  const [currentGridDimensions, setCurrentGridDimensions] = useState<IBounds>();
  const rootRef = useRef<HTMLDivElement>(null);

  const [metadataWidth, setMetadataWidth] = useState<number>(metadataStartingWidth);
  const [minimapWidth, setMinimapWidth] = useState<number>(minimapStartingWidth);
  const [logoHeight, setLogoHeight] = useState<number>(logoStartingHeight);
  const [barplotHeights, setBarplotHeights] = useState(
    barplots.reduce((acc, bp)=>{
      acc[bp.contentKey] = barplotStartingHeight;
      return acc;
    }, {} as {[contentKey: string]: number})
  );

  useEffect(()=>{
    barplots.forEach(bp => {
      if(!barplotHeights[bp.contentKey]){
        barplotHeights[bp.contentKey] = barplotStartingHeight;
      }
    })
  }, [barplots, barplotHeights, barplotStartingHeight]);

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
    metadataAndContent: IMetadataAndContent | typeof alignmentDetails | undefined;
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
            className={metadataClassname} 
            style={{
              gridArea: metadataGridArea,
              fontSize: titleFontSize,
              display: !showMetadata || forceHide ? "none" : undefined,
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
  //BARPLOT Resizing
  //

  const barplotsResized = useCallback((newBarClientY: number, barplotKey: string)=>{
    if(barplotSizing.type==="fixed-height" || !rootRef.current) return;
    const barplotElems = rootRef.current.getElementsByClassName(`${barplotKey}`);
    if(barplotElems.length !== 1){
      console.error(`Internal error: unable to find class "${barplotKey}" during resize.`);
      return;
    }

    const barplotBounds = barplotElems[0].getBoundingClientRect();

    //relate metadata width to offset of resizer
    const newProposedHeight = (
      newBarClientY - 
      (resizeBarSizePx/2) -             //center of resize element
      gapBetweenColumnsAndRowsPx -
      barplotBounds.y
    );
    const newFinalHeight = newProposedHeight > barplotSizing.maxHeight
      ? barplotSizing.maxHeight
      : newProposedHeight < barplotSizing.minHeight
        ? barplotSizing.minHeight
        : newProposedHeight;

    setBarplotHeights({
      ...barplotHeights,
      [barplotKey]: newFinalHeight
    });
  }, [
    barplotHeights, 
    barplotSizing,
    gapBetweenColumnsAndRowsPx,
    resizeBarSizePx
  ]);

  const barplotAreaNames = useMemo(()=>{
    return {
      gridAreas: barplots.map((bp)=>{
        return `barplot-${bp.contentKey}-resizer`;
      }),
      keys: barplots.map((bp)=>{
        return bp.contentKey;
      }),
    }
  }, [barplots]);

  const barplotResizers = useResizeGrid({
    resizeSeparatorGridAreaNames: barplotAreaNames.gridAreas,
    resizeDirection: "vertical",
    draggerMoved: barplotsResized,
    keys: barplotAreaNames.keys
  });

  //
  //LOGO Resizing
  //
  const logoResized = useCallback((newBarClientY: number)=>{
    if(logoSizing.type==="fixed-height" || !rootRef.current) return;
    const logoElems = rootRef.current.getElementsByClassName("logoplot");
    if(logoElems.length !== 1){
      console.error(`Internal error: unable to find class "logoplot" during resize.`);
      return;
    }
    const logoBounds = logoElems[0].getBoundingClientRect();

    //relate metadata width to offset of resizer
    const newProposedHeight = (
      newBarClientY - 
      (resizeBarSizePx/2) -          //center of resize element
      gapBetweenColumnsAndRowsPx -
      logoBounds.y
    );
    setLogoHeight(
      newProposedHeight > logoSizing.maxHeight
        ? logoSizing.maxHeight
        : newProposedHeight < logoSizing.minHeight
          ? logoSizing.minHeight
          : newProposedHeight
    );
  }, [
    logoSizing,
    gapBetweenColumnsAndRowsPx,
    resizeBarSizePx
  ]);

  const logoResizer = useResizeGrid({
    resizeSeparatorGridAreaNames: ["logo-resizer"],
    keys: ["logo-resizer"],
    resizeDirection: "vertical",
    draggerMoved: logoResized,
  });


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
    resizeSeparatorGridAreaNames: ["metadata-resizer"],
    keys: ["metadata-resizer"],
    resizeDirection: "horizontal",
    draggerMoved: metadataBarResized,
    zIndex: 1799
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
    resizeSeparatorGridAreaNames: ["minimap-resizer"],
    keys: ["minimap-resizer"],
    resizeDirection: "horizontal",
    draggerMoved: minimapBarResized
  });

  //
  //get the grid template areas string
  //
  const gridTemplateAreas = useMemo(()=>{
    const accountForMetadataAndMinimap = (
      metadataColArea: string, contentColArea: string, resizeableHeight?: boolean
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

      return (`"${metadataText} ${contentColArea} ${minimapText}"`) + 
        (!resizeableHeight 
          ? "" 
          : `\n"${metadataText.replaceAll(
                  metadataColArea, 
                  metadataColArea+"-resizer"
            )} ${contentColArea}-resizer ${minimapText}"`);
    };

    return [
      ...barplots.map((bp) => {
        return accountForMetadataAndMinimap(
          `barplot-${bp.contentKey}-metadata`, 
          `barplot-${bp.contentKey}`, 
          barplotSizing.type==="adjustable-height"
        );
      }),

      ...!showLogoPlot 
        ? [] 
        : [accountForMetadataAndMinimap(
            "logo-metadata", 
            "logo", 
            logoSizing.type==="adjustable-height"
          )],

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
    logoSizing.type,
    barplotSizing.type,
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
      { !showMetadata ? undefined : metadataResizer.draggerFullScreenElement }
      { !showMinimap ? undefined : minimapResizer.draggerFullScreenElement}
      { !showLogoPlot ? undefined : logoResizer.draggerFullScreenElement }
      { barplotResizers.draggerFullScreenElement }

      <ReactResizeSensor onSizeChanged={resizeSensor} logId="alignment-viewer-layout">
        <div className="alignment-viewer-2" ref={rootRef} style={{
          top: `${gapViewportTopPx}px`,
          bottom: `${gapViewportBottomPx}px`,
          left: `${gapViewportLeftPx}px`,
          right: `${gapViewportRightPx}px`,
          gap: `${gapBetweenColumnsAndRowsPx}px`,
          gridTemplateColumns: gridTemplateColumns,
          gridTemplateRows: `
            ${barplots.map((bp) => {
              const toreturn = [`${barplotHeights[bp.contentKey]}px`];
              if(barplotSizing.type === "adjustable-height"){
                toreturn.push(`${resizeBarSizePx}px`);
              }
              return toreturn.join("\n");
            }).join("\n")}
            ${showLogoPlot && logoPlot ? `${logoHeight}px` : ""} 
            ${showLogoPlot && logoPlot && logoSizing.type === "adjustable-height" ? `${resizeBarSizePx}px` : ""}
            ${showConsensus && consensus ? `${consensus.heightPx}px` : ""} 
            ${showQuery && query ? `${query.heightPx}px` : ""} 
            ${showPositionalAxis && positionalAxis ? `${positionalAxis.heightPx}px` : ""}
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
            barplots.map((bp) => {
              const metadataGridArea = `barplot-${bp.contentKey}-metadata`;
              const contentGridArea = `barplot-${bp.contentKey}`;
              return (
                <React.Fragment key={bp.contentKey}>
                  {renderWidget({
                    key: `bp-${bp.contentKey}`,
                    metadataAndContent: bp,
                    metadataGridArea: metadataGridArea,
                    contentGridArea: contentGridArea,
                    contentClassname: `content ${bp.contentKey}`
                  })}
                  {barplotSizing.type !== "adjustable-height"
                    ? <></>
                    : barplotResizers.resizeSeparators[bp.contentKey]//<div className="vertical-resizer" style={{gridArea: `${contentGridArea}-resizer`}}/>
                  }
                </React.Fragment>
              );
            })
          }

          { //logo
            <>
              {renderWidget({
                key: `logo`,
                metadataAndContent: logoPlot,
                metadataGridArea: "logo-metadata",
                contentGridArea: "logo",
                forceHide: !showLogoPlot,
                contentClassname: `content logoplot`
              })}
              {logoSizing.type !== "adjustable-height" || !showLogoPlot
                ? <></>
                : logoResizer.resizeSeparators["logo-resizer"]
              }
            </>
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
              : minimapResizer.resizeSeparators["minimap-resizer"]
          }

          {
            // metadata 
            !showMetadata || metadataSizing.type !== "adjustable-width"
              ? undefined 
              : (
                metadataResizer.resizeSeparators["metadata-resizer"]
              )
          }
        </div>
      </ReactResizeSensor>
    </>
  );
}
