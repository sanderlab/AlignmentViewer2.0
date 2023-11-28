import React, { useCallback, useMemo, useState } from "react";
import "./SequenceBarplot.scss";
import { Tooltip } from 'react-tooltip';
import { Alignment } from "../common/Alignment";
import { mapGroupBy, ArrayOneOrMore, generateUUIDv4 } from "../common/Utils";
import { VirtualizedMatrixViewer } from "./virtualization/VirtualizedMatrixViewerHook";

export interface IPositionalBarplotDataSeries {
  id: string; //must be unique for each series
  name: string;
  cssClass: string;
  color?: string;
  plotOptions?: {
    fixYMax?(alignment: Alignment): number; //defaults to data max
    //fixYMin?: number; //defaults to data min
  };
  getBars(alignment: Alignment): ISingleBarDetails[];
}

export interface IPositionalBarplotProps {
  //don't expose these props in AlignmentViewer
  alignment: Alignment;
  positionWidth: number;

  //props that should be exposed in AlignmentViewer:
  dataSeriesSet: ArrayOneOrMore<IPositionalBarplotDataSeries>;
  tooltipPlacement?: "top" | "right" | "bottom" | "left"; //default to undefined => automatic
  height?: string;
  horizontalReduxId?: string;
}

interface ISingleBarDetails {
  height: number | undefined;
  tooltipValueText?: string;
}
interface ISingleBarDetailsFull extends ISingleBarDetails {
  normalizedHeight: number | undefined;
  position: number;
  dataSeriesSet: IPositionalBarplotDataSeries;
}
interface IPreconfiguredBarplots {
  ShannonEntropy: IPositionalBarplotDataSeries,
  Conservation: IPositionalBarplotDataSeries,
  KullbacLeiblerDivergence: IPositionalBarplotDataSeries,
  Gaps: IPositionalBarplotDataSeries,
}


//
// EXPORT SOME BARPLOTS
//
export const PreconfiguredPositionalBarplots: IPreconfiguredBarplots = {
  /**
   * ShannonEntropy barplot
   * Plot the shannon entropy at each position -sum(p * log p)
   *   - p is the fraction of each upper case letter at the position
   *   - ymax is set to the maximum entropy, which is an equal number
   *     of all upper case letters in the alignment.
   */
  ShannonEntropy: {
    id: "entropy",
    name: "Entropy",
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
  },

  /**
   * Conservation barplot
   * Plot the positional conservation defined as 1 - shannon entropy
   */
  Conservation: {
    id: "conservation",
    name: "Conservation",
    cssClass: "barplot-conservation",
    color: "#414141",
    plotOptions: {
      fixYMax: (al: Alignment) => {
        return PreconfiguredPositionalBarplots.ShannonEntropy.plotOptions!
          .fixYMax!(al);
      },
    },
    getBars: (al: Alignment) => {
      const ymax = PreconfiguredPositionalBarplots.ShannonEntropy.plotOptions!
        .fixYMax!(al);
      const entropyBars = PreconfiguredPositionalBarplots.ShannonEntropy.getBars(
        al
      );
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
    id: "kullback-leibler-divergence",
    name: "KL Divergence",
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
    id: "gaps",
    name: "Gaps",
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



export function PositionalBarplot(props: IPositionalBarplotProps){
  const {
    alignment,
    positionWidth,
    dataSeriesSet,
    tooltipPlacement,
    horizontalReduxId,
    height = "100px"
  } = props;

  //
  // constants
  //
  const POSITION_VIEWBOX_HEIGHT = 100; //for svg viewport
  const POSITION_VIEWBOX_WIDTH = 1;    //for svg viewport


  //
  // state
  //
  const [hoverKey] = useState<string>(generateUUIDv4());

  /*
  private ref: React.RefObject<HTMLDivElement>;

  private cache: Partial<ISequenceBarplotProps> & {
    bars?: ISingleBarDetailsFull[];
    barsGroupedByPosition?: Map<number, ISingleBarDetailsFull[]>;
    barsGroupedByDataseries?: Map<
      ISequenceBarplotDataSeries,
      ISingleBarDetailsFull[]
    >;
  } = {};*/


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
        ds.getBars(alignment).map((bar, idx) => {
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
          acc[bar.dataSeriesSet.id] = acc[bar.dataSeriesSet.id] 
            ? [...acc[bar.dataSeriesSet.id], bar] : [bar];
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
      normaliedBars: normalizedBars,
      barsGroupedByPosition: barsGroupedByPosition,
      barsGroupedByDataseries: barsGroupedByDataseries,
    };
  }, [alignment, dataSeriesSet, normalizeBarHeights])




  //
  // tooltip stuff
  //

  const getTooltipForBar = useCallback((position: number)=>{
    const posPlusOne = position + 1; // positions should be 1 based, not zero based
    const barsAtPostion = barsObj.barsGroupedByPosition.get(position)!;
    const numValidBars = !barsAtPostion
      ? 0
      : barsAtPostion.reduce((acc, bar) => {
          return acc + (bar.height !== undefined ? 1 : 0);
        }, 0 as number);

    return numValidBars < 1 ? undefined : (
      <div className="bar-position-textblock">
        <h1>Position: {posPlusOne}</h1>
        {barsAtPostion.map((bar) => {
          return (
            <div
              className={`dataseries-line ${bar.dataSeriesSet.cssClass}`}
              key={bar.dataSeriesSet.id}
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
                {bar.dataSeriesSet.name}:{" "}
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
  }, [barsObj]);




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
        preserveAspectRatio="none"
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
                data-tooltip-id={`getBarTooltip-${hoverKey}`}
                data-tooltip-content={pos}
                data-tooltip-position-strategy="fixed"
                data-tooltip-variant="light"
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
                        key={`${bar.position}_${bar.dataSeriesSet.id}`}
                      />
                    );
                  }
                  return acc;

                  //something off here with typescript and this accumulator.
                  //can't specify type as rect
                }, new Array<JSX.Element>())}
  
                <rect
                  className="interaction-placeholder"
                  transform={`translate(0,${
                    POSITION_VIEWBOX_HEIGHT - maxBarHeight
                  })`}
                  width={POSITION_VIEWBOX_WIDTH}
                  height={maxBarHeight}
                ></rect>
              </g>
            );
          }
        )}
      </svg>
    );
  }, [
    alignment, 
    barsObj, 
    height, 
    hoverKey, 
    positionWidth
  ]);

  //
  // render
  //
  return !alignment ? null : (
    <div className="barplot">
      <VirtualizedMatrixViewer
        horizontalReduxId={horizontalReduxId}
        direction="x"
        columnCount={alignment.getSequenceLength()}
        columnWidth={positionWidth}
        rowCount={1}
        rowHeight={75} //TODO unhardcode
        autoOffset={false}
        suppressVerticalScrollbar={true}
        suppressHorizontalScrollbar={true}
        getContent={({
          colIdxsToRender,
          additionalHorizontalOffset,
        }) => {
          return (
            <div
              style={{
                position:"absolute",
                width: alignment.getSequenceLength() * positionWidth,
                left:
                  colIdxsToRender.length > 0
                    ? colIdxsToRender[0] * positionWidth * -1 + additionalHorizontalOffset
                    : additionalHorizontalOffset,
              }}
            >
              {cachedBarplot}
            </div>
          );
        }}
      />

      <Tooltip
        id={`getBarTooltip-${hoverKey}`}
        className="barplot-tooltip-holder"
        border="solid black 1px"
        place={tooltipPlacement}
        openEvents={{"mouseenter": true, "focus": false}}
        closeEvents={{"mouseleave": true, "blur": false}}
        globalCloseEvents={{
          "clickOutsideAnchor": true,
          "escape": true, 
          "scroll": true, 
          "resize": true
        }}
        render={({ content }) => {
          return getTooltipForBar(parseInt(content!));
        }}
      />

    </div>
  );

}
