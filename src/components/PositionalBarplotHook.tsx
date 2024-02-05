import "./PositionalBarplot.scss";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { Tooltip, TooltipRefProps } from 'react-tooltip';
import { Alignment } from "../common/Alignment";
import { mapGroupBy, ArrayOneOrMore, generateUUIDv4 } from "../common/Utils";
import { VirtualizedHorizontalViewer } from "./virtualization/VirtualizedMatrixViewerHook";
import { IControllerRole, IResponderRole, IVirtualizeParamBasics, IVirtualizeParams, ScrollbarOptions, VirtualizationRole, VirtualizationStrategy } from "./virtualization/VirtualizationTypes";
import { IBounds } from "./ResizeSensorHook";
import { ISearchMatchDetails } from "./search/SequenceSearchHook";
import { IListOfPropObjects } from "../common/GlobalEnumObject";

export interface IPositionalBarplotDataSeries {
  key: string; //must be unique for each series
  description: string;
  cssClass: string;
  color?: string;
  plotOptions?: {
    fixYMax?(alignment: Alignment): number; //defaults to data max
    //fixYMin?: number; //defaults to data min
  };
  getBars(
    alignment: Alignment,
    searchDetails?: ISearchMatchDetails
  ): ISingleBarDetails[];
}

export interface IPositionalBarplotProps {
  //don't expose these props in AlignmentViewer
  svgId: string; //used for exporting
  searchDetails?: ISearchMatchDetails;
  alignment: Alignment;
  positionWidth: number;

  //props that should be exposed in AlignmentViewer:
  dataSeriesSet: ArrayOneOrMore<IPositionalBarplotDataSeries>;

  //tooltip props
  tooltipPlacement?: tooltipPlacement;
  tooltipOffset?: number;

  //for the virtualization .. directly decomposed to VirtualizedHorizontalViewer 
  horizontalVirtualization?: IControllerRole | IResponderRole;

  //for the virtualization
  hoverTracker?: IVirtualizeParamBasics["hoverTracker"];
}

export interface ISingleBarDetails {
  height: number | undefined;
  tooltipValueText?: string;
}
export interface ISingleBarDetailsFull extends ISingleBarDetails {
  normalizedHeight: number | undefined;
  position: number;
  dataSeriesSet: IPositionalBarplotDataSeries;
}

//
// EXPORT SOME BARPLOTS
//
export const PreconfiguredPositionalBarplots = (() => {

  //define shannonEntropy first as it is referenced by conservation barplot
  const shannonEntropy = {
    key: "entropy",
    description: "Entropy",
    cssClass: "barplot-shannon-entropy",
    color: "#000000",
    plotOptions: {
      fixYMax: (al: Alignment) => {
        const allLettersInAlignment = al.getAllUpperAlphaLettersInAlignmentSorted();
        const p = 1 / allLettersInAlignment.length;
        return (
          -1 *
          allLettersInAlignment.reduce((acc) => {
            return acc + p * Math.log2(p);
          }, 0)
        );
      },
    },
    getBars: (al: Alignment) => {
      const toReturn: ISingleBarDetails[] = [];
      const plc = al.getPositionalLetterCounts(
        true,
        al.getAllUpperAlphaLettersInAlignmentSorted()
      );
  
      const maxSeqLength = al.getSequenceLength();
      for (let i = 0; i < maxSeqLength; i++) {
        const singlePlc = plc.get(i);
        if (!singlePlc || Object.keys(singlePlc).length === 0) {
          toReturn.push({ height: undefined });
        } else {
          toReturn.push({
            height:
              -1 *
              Object.values(singlePlc).reduce((acc, p) => {
                return acc + p * Math.log2(p);
              }, 0),
          });
        }
      }
      return toReturn;
    }
  }


  //list all preconfigured barplots
  const propList = {
    /**
     * ShannonEntropy barplot
     * Plot the shannon entropy at each position -sum(p * log p)
     *   - p is the fraction of each upper case letter at the position
     *   - ymax is set to the maximum entropy, which is an equal number
     *     of all upper case letters in the alignment.
     */
    ShannonEntropy: shannonEntropy,

    /**
     * Conservation barplot
     * Plot the positional conservation defined as 1 - shannon entropy
     */
    Conservation: {
      key: "conservation",
      description: "Conservation",
      cssClass: "barplot-conservation",
      color: "#414141",
      plotOptions: {
        fixYMax: (al: Alignment) => {
          return shannonEntropy.plotOptions!
            .fixYMax!(al);
        },
      },
      getBars: (al: Alignment) => {
        const ymax = shannonEntropy.plotOptions!
          .fixYMax!(al);
        const entropyBars = shannonEntropy.getBars(al);
        return entropyBars.map((entropyBar) => {
          return {
            ...entropyBar,
            height:
              entropyBar.height === undefined
                ? undefined
                : ymax - entropyBar.height,
          };
        });
      }
    },

    /**
     * KullbacLeiblerDivergence
     * Plot the Kullback-Leibler (KL) divergence for individual columns in the alignment
     *        S = sum(pk * log(pk / qk)
     *   also see scipy docs:
     *     https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.entropy.html
     *
     * No maximum is explicitly set (so it because the max value)
     */
    KullbacLeiblerDivergence: {
      key: "kullback-leibler-divergence",
      description: "KL Divergence",
      cssClass: "barplot-kullback-leibler-divergence",
      color: "darkred",
      getBars: (al: Alignment) => {
        const allLetters = al.getAllUpperAlphaLettersInAlignmentSorted();
        const pk = al.getPositionalLetterCounts(true, allLetters);
        const qk = al.getGlobalAlphaLetterCounts(true, allLetters);

        const toReturn: ISingleBarDetails[] = [];
        const maxSeqLength = al.getSequenceLength();
        for (let i = 0; i < maxSeqLength; i++) {
          const positionsPk = pk.get(i);
          if (!positionsPk || Object.keys(positionsPk).length === 0) {
            toReturn.push({ height: undefined });
          } else {
            toReturn.push({
              height: allLetters.reduce((acc, letter) => {
                if (letter in positionsPk) {
                  acc +=
                    positionsPk[letter] *
                    Math.log(positionsPk[letter] / qk[letter]);
                }
                return acc;
              }, 0),
            });
          }
        }
        return toReturn;
      },
    },

    /**
     * Gaps
     * Plot the number of gaps at each position. The y max is set to
     * the total length of the alignment and not the largest number of
     * gaps.
     */
    Gaps: {
      key: "gaps",
      description: "Gaps",
      cssClass: "barplot-gaps",
      color: "#b7b7b7",
      plotOptions: {
        fixYMax: (al: Alignment) => al.getSequenceCount(),
      },
      getBars: (al: Alignment) => {
        const toReturn: ISingleBarDetails[] = [];
        const maxSeqLength = al.getSequenceLength();
        for (let i = 0; i < maxSeqLength; i++) {
          const gapCount = al.getGapCountAtColumn(i);
          toReturn.push({
            height: gapCount,
            tooltipValueText: `${(
              (gapCount / al.getSequenceCount()) *
              100
            ).toFixed(1)}% (${gapCount})`,
          });
        }
        return toReturn;
      },
    }
  }

  return {
    ...propList,
    ...IListOfPropObjects<IPositionalBarplotDataSeries>(Object.values(propList))
  };
})();



export function PositionalBarplot(props: IPositionalBarplotProps){
  const {
    svgId,
    alignment,
    searchDetails,
    positionWidth,
    dataSeriesSet,
    tooltipPlacement = "top",
    tooltipOffset = 8, //distance that the arrow will be from the hovered bar
    horizontalVirtualization,
    hoverTracker = "end"
  } = props;

  //
  // constants
  //
  const POSITION_VIEWBOX_HEIGHT = 100; //for svg viewport
  const POSITION_VIEWBOX_WIDTH = 1;    //for svg viewport

  //
  // ref
  //
  const tooltipRef = useRef<TooltipRefProps>(null);
  const tooltipClosingTimeoutRef = useRef<NodeJS.Timeout>()

  //
  // state
  //
  const [hoverKey] = useState<string>(generateUUIDv4());
  const [
    calculatedTooltipOffset, setCalculatedTooltipOffset
  ] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);

  //
  // callbacks
  //
  /**
   * Normalize bars to fall between 0 and POSITION_MAX_HEIGHT in svg space. Obey the
   * fixYMax if specified
   * @param bars the same bars as input, with the "normalizeHeight"
   *             attribute added
   */
  const normalizeBarHeights = useCallback((
    bars: ISingleBarDetailsFull[]
  ): ISingleBarDetailsFull[] =>  {
    const allValidHeights = bars.reduce((acc, bar) => {
      if (bar.height !== undefined) {
        acc.push(bar.height);
      }
      return acc;
    }, [] as number[]);
    const overallMinHeight = Math.min(...allValidHeights);
    const overallMaxHeight = Math.max(...allValidHeights);
    return bars.map((bar) => {
      const minHeight = overallMinHeight;
      const maxHeight =
        bar.dataSeriesSet.plotOptions && bar.dataSeriesSet.plotOptions.fixYMax
          ? bar.dataSeriesSet.plotOptions.fixYMax(alignment)
          : overallMaxHeight;
      
      const normalizedHeight = bar.height === undefined
        ? NaN
        : ((bar.height - minHeight) / (maxHeight - minHeight)) *
          POSITION_VIEWBOX_HEIGHT;
      
      return {
        ...bar,
        normalizedHeight: isNaN(normalizedHeight) 
          ? undefined 
          : normalizedHeight
      };
    });
  }, [alignment]);




  //
  // cache
  //
  const barsObj = useMemo(()=>{
    let allBars = [] as ISingleBarDetailsFull[];
    dataSeriesSet.forEach((ds) => {
      allBars = allBars.concat(
        ds.getBars(alignment, searchDetails).map((bar, idx) => {
          return {
            ...bar,
            position: idx,
            dataSeriesSet: ds,
            normalizedHeight: -1, // define below
          };
        })
      );
    });

    //normalize bars group by group
    const normalizedBars = Object.values(
        allBars.reduce((acc, bar)=>{
          acc[bar.dataSeriesSet.key] = acc[bar.dataSeriesSet.key] 
            ? [...acc[bar.dataSeriesSet.key], bar] : [bar];
          return acc;
        }, {} as {[seriesId: string]: ISingleBarDetailsFull[]})    
      )
      .map((categoryBars) => {
        return normalizeBarHeights(categoryBars);
      })
      .flat();

    const barsGroupedByPosition = mapGroupBy(
      normalizedBars,
      (bar) => bar.position
    );

    const barsGroupedByDataseries = mapGroupBy(
      normalizedBars,
      (item) => item.dataSeriesSet
    );

    return {
      svgId: svgId,
      normaliedBars: normalizedBars,
      barsGroupedByPosition: barsGroupedByPosition,
      barsGroupedByDataseries: barsGroupedByDataseries,
    };
  }, [
    alignment, 
    dataSeriesSet, 
    normalizeBarHeights,
    searchDetails, 
    svgId
  ])

  //
  // tooltip itself is hovered .. keep it open
  //
  const tooltipHovered = useCallback(()=>{
    clearTimeout(tooltipClosingTimeoutRef.current); 
  }, []);

  //
  //close the tooltip
  //
  const closeTooltip = useCallback(()=>{
    tooltipClosingTimeoutRef.current = setTimeout(()=>{ 
      //allow a bit of time before closing in case the user wants
      //to interact with the tooltip
      tooltipRef.current?.close();
    }, 500);
  }, []);

  //
  //
  // tooltip stuff
  //
  //
  const getTooltipForPosition = useCallback((pos: string)=>{
    if (!pos || !barsObj.barsGroupedByPosition.get(parseInt(pos))) {
      return null;
    }

    const posPlusOne = parseInt(pos) + 1; // positions should be 1 based, not zero based
    const barsAtPostion = barsObj.barsGroupedByPosition.get(parseInt(pos))!;
    const numValidBars = !barsAtPostion
      ? 0
      : barsAtPostion.reduce((acc, bar) => {
          return acc + (bar.height !== undefined ? 1 : 0);
        }, 0 as number);

    return numValidBars < 1 ? undefined : (
      <div 
        className="bar-position-textblock"
        onMouseEnter={tooltipHovered}
        onMouseLeave={closeTooltip}
        onClick={(e)=>{
          e.stopPropagation();
          e.preventDefault();
        }}
      >
        <h1>Position: {posPlusOne}</h1>
        {barsAtPostion.map((bar) => {
          return (
            <div
              className={`dataseries-line ${bar.dataSeriesSet.cssClass}`}
              key={bar.dataSeriesSet.key}
            >
              <span
                className="legend-square"
                style={{
                  backgroundColor: bar.dataSeriesSet.color
                    ? bar.dataSeriesSet.color
                    : undefined,
                }}
              ></span>
              <span className="legend-text">
                {bar.dataSeriesSet.description}:{" "}
                {bar.tooltipValueText
                  ? bar.tooltipValueText
                  : bar.height !== undefined
                  ? +bar.height.toFixed(1)
                  : "undefined"}
              </span>
            </div>
          );
        })}
      </div>
    );
  }, [barsObj, closeTooltip, tooltipHovered]);
  
  //
  // open the react tooltip
  //
  const openTooltip = useCallback((
    e: React.MouseEvent<SVGRectElement, MouseEvent>
  )=>{
    //stop any close timeout as an adjacent tip is now being opened 
    //and it uses the same tooltip.
    clearTimeout(tooltipClosingTimeoutRef.current); 

    const id = (e.target as SVGRectElement).getAttribute("data-tooltip-id")!;
    const posIdx = (e.target as SVGRectElement).getAttribute("data-tooltip-content")!;
    const boundingRect = (e.target as SVGRectElement).getBoundingClientRect();
    const content = getTooltipForPosition(posIdx!);
    if (content){
      setCalculatedTooltipOffset(
        tooltipOffset + (
          [
            "top", "top-start", "top-end", "bottom", "bottom-start", "bottom-end"
          ].includes(tooltipPlacement)
            ? (boundingRect.height/2)
            : (boundingRect.width/2)
        )
      );

      tooltipRef.current?.open({
        anchorSelect: id,
        content: content,
        position: {
          x: boundingRect.x + (boundingRect.width/2),
          y: boundingRect.y + (boundingRect.height/2),
        }
      });
    }
  }, [
    getTooltipForPosition, 
    tooltipOffset,
    tooltipPlacement
  ]);

  //
  // the react tooltip declaration. enables us to grab a reference
  // to the tooltip and show hide on mouseover of individual positions
  //
  const renderedTooltip = useMemo(() => {
    return (
      <Tooltip
        ref={tooltipRef}
        className="barplot-tooltip-holder"
        border="solid black 1px"
        positionStrategy="fixed"
        variant="light"
        imperativeModeOnly={true}
        place={tooltipPlacement}
        offset={calculatedTooltipOffset}
      />
    )
  }, [
    calculatedTooltipOffset, 
    tooltipPlacement
  ]);

  //
  //
  // SVG caching
  //
  //

  /**
   * Render the bar plot svg, with each bar appearing as a single rectangle.
   * Final form:
   *    <svg ...>
   *      <g position 1>
   *         <rect transparant rectangle for interaction for position 1>
   *         <rect for dataseries 1 position 1>
   *         <rect for dataseries 2 position 1>
   *      </g>
   *      <g position 2>
   *         <rect transparant rectangle for interaction for position 2>
   *         <rect for dataseries 1 position 2>
   *         <rect for dataseries 2 position 2>
   *      </g>
   *   </svg>
   */
  const cachedBarplot = useMemo(() => {
    const maxSeqLength = alignment.getSequenceLength();
    const totalWidth = positionWidth * maxSeqLength;
    return (
      <svg
        id={svgId}
        preserveAspectRatio="none"
        width={`${totalWidth}px`}
        height={`${height}px`}
        viewBox={`0 0 ${
          maxSeqLength * POSITION_VIEWBOX_WIDTH
        } ${POSITION_VIEWBOX_HEIGHT}`}
        style={{
          width: totalWidth,
          height: height
        }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {Array.from(barsObj.barsGroupedByPosition.entries()).map(
          ([pos, bars]) => {
            const allBarsHeightsAtPosition = bars.reduce((acc, bar) => {
              if (bar.normalizedHeight !== undefined) {
                acc.push(bar.normalizedHeight);
              }
              return acc;
            }, [] as number[]);
            const maxBarHeight =
              allBarsHeightsAtPosition.length < 1
                ? 0
                : Math.max(...allBarsHeightsAtPosition);

            const numDataSeries = barsObj.barsGroupedByDataseries.size;
            const barWidth =
              (numDataSeries === 1 ? 0.9 : 1 / numDataSeries) * POSITION_VIEWBOX_WIDTH;
            const firstBarOffset =
              (numDataSeries === 1 ? pos + 0.05 : pos) * POSITION_VIEWBOX_WIDTH;
              
            return allBarsHeightsAtPosition.length < 1 ? null : (
              <g
                transform={`translate(${firstBarOffset},0)`}
                className={"position-container pos" + pos}
                key={pos}
              >
                {bars.reduce((acc, bar, dataseriesIdx) => {
                  if (bar.normalizedHeight !== undefined) {
                    acc.push(
                      <rect
                        className={bar.dataSeriesSet.cssClass}
                        style={{
                          fill: bar.dataSeriesSet.color
                            ? bar.dataSeriesSet.color
                            : undefined,
                          color: bar.dataSeriesSet.color
                            ? bar.dataSeriesSet.color
                            : undefined,
                        }}
                        transform={`translate(${
                          ((dataseriesIdx * 1) / bars.length) * POSITION_VIEWBOX_WIDTH
                        },${
                          POSITION_VIEWBOX_HEIGHT - bar.normalizedHeight
                        })`}
                        width={barWidth}
                        height={bar.normalizedHeight}
                        key={`${bar.position}_${bar.dataSeriesSet.key}`}
                      />
                    );
                  }
                  return acc;

                  //something off here with typescript and this accumulator.
                  //can't specify type as rect
                }, new Array<JSX.Element>())}

                {/* mouse interactions can happen only over the actual bar(s) */}
                <rect
                  className="interaction-placeholder"
                  transform={`translate(0,${
                    POSITION_VIEWBOX_HEIGHT - maxBarHeight
                  })`}
                  width={POSITION_VIEWBOX_WIDTH}
                  height={maxBarHeight}
                  data-tooltip-id={`bp${pos}${hoverKey}`}
                  data-tooltip-content={pos}
                  onMouseEnter={openTooltip}
                  onMouseLeave={closeTooltip}
                ></rect>
                {/* mouse interactions can happen over entire position (rather than just 
                    over the bars) useful if we want to inform the parent etc
                <rect
                  className="interaction-placeholder-full"
                  width={POSITION_VIEWBOX_WIDTH}
                  height={POSITION_VIEWBOX_HEIGHT}
                ></rect>  */}
              </g>
            );
          }
        )}
      </svg>
    );
  }, [
    alignment, 
    barsObj, 
    closeTooltip,
    height, 
    hoverKey, 
    openTooltip,
    positionWidth,
    svgId
  ]);

  //some cache and helper functions
  const containerBoundsUpdated = useCallback((bounds: IBounds)=>{
    setHeight(bounds.height);
  }, []);

  const getCachedBarplot = useCallback(()=>{
    return cachedBarplot;
  }, [cachedBarplot])

  const horizParamsCache: IVirtualizeParams = useMemo(()=>{
    const barplotIds = dataSeriesSet.map(bp=>bp.key).join("-");
    return {
      ...(
        horizontalVirtualization
          ? horizontalVirtualization
          : {//virtualization if caller doesn't provide (for standalone use - needs testing)
            virtualizationId: `bp-${barplotIds}-${alignment.getUUID()}`,
            role: VirtualizationRole.Controller,
            cellCount: alignment.getSequenceLength(),
            cellSizePx: positionWidth
          }
      ),
      virtualizationStrategy: VirtualizationStrategy.ShiftOnlyFullyRendered,
      scrollbar: ScrollbarOptions.NeverOn,
      hoverTracker: hoverTracker,
      containerBoundsUpdated: containerBoundsUpdated
    }
  }, [
    alignment,
    containerBoundsUpdated,
    dataSeriesSet,
    horizontalVirtualization,
    hoverTracker,
    positionWidth
  ]);

  //
  //
  // render
  //
  //
  return !alignment
    ? undefined 
    : (
      <div className="barplot">
        <VirtualizedHorizontalViewer
          getContentForColumns={getCachedBarplot}
          horizontalParams={horizParamsCache}
        />
        {renderedTooltip}
      </div>
    );

}
