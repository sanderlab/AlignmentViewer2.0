import React from "react";
import "./SequenceBarplot.scss";
import _ from "lodash";
import { Alignment } from "../common/Alignment";
import { mapGroupBy, ArrayOneOrMore } from "../common/Utils";
import ReactTooltip from "react-tooltip";

export interface ISequenceBarplotDataSeries {
  id: string; //must be unique for each series
  name: string;
  cssClass: string;
  plotOptions?: {
    fixYMax?(alignment: Alignment): number; //defaults to data max
    //fixYMin?: number; //defaults to data min
  };
  getPositionalInfo(pos: number, alignment: Alignment): ISingleBarDetails;
}

export interface ISequenceBarplotProps {
  alignment: Alignment;
  dataSeries: ArrayOneOrMore<ISequenceBarplotDataSeries>;
  positionWidth: number;

  height?: number;
  onPositionSelectionChanged?(
    positionsSelected: {
      position: number;
      element: SVGRectElement;
      bars: ISingleBarDetailsFull[];
    }[]
  ): void;
  onPositionMouseEnter?(
    position: number,
    element: SVGRectElement,
    bars: ISingleBarDetailsFull[]
  ): void;
  onPositionMouseLeave?(
    position: number,
    element: SVGRectElement,
    bars: ISingleBarDetailsFull[]
  ): void;
}

interface ISingleBarDetails {
  height: number;
}
interface ISingleBarDetailsFull extends ISingleBarDetails {
  normalizedHeight: number;
  position: number;
  dataSeries: ISequenceBarplotDataSeries;
}
interface ISequenceBarplotState {
  positionHovered?: {
    position: number;
    element: SVGRectElement;
    bars: ISingleBarDetailsFull[];
  };
  positionsSelected: {
    position: number;
    element: SVGRectElement;
    bars: ISingleBarDetailsFull[];
  }[];
  svgHovered: boolean;
}

export class SequenceBarplotComponent extends React.Component<
  ISequenceBarplotProps,
  ISequenceBarplotState
> {
  private static POSITION_VIEWBOX_HEIGHT = 100;
  private static POSITION_VIEWBOX_WIDTH = 20;

  private cache: Partial<ISequenceBarplotProps> & {
    bars?: ISingleBarDetailsFull[];
    barsGroupedByPosition?: Map<number, ISingleBarDetailsFull[]>;
    barsGroupedByDataseries?: Map<
      ISequenceBarplotDataSeries,
      ISingleBarDetailsFull[]
    >;
  } = {};

  static defaultProps = {
    height: 100,
  };

  constructor(props: ISequenceBarplotProps) {
    super(props);
    this.state = {
      svgHovered: false,
      positionsSelected: [],
    };
    this.handleSvgHover = this.handleSvgHover.bind(this);
    this.handlePositionHover = this.handlePositionHover.bind(this);
    this.handlePositionClicked = this.handlePositionClicked.bind(this);
  }

  /*
   *
   *
   * PRE-CONFIGURED BARPLOTS
   *
   *
   */
  /**
   * Plot the shannon entropy at each position -sum(p * log p)
   *   - p is the fraction of each upper case letter at the position
   *   - ymax is set to the maximum entropy, which is an equal number
   *     of all upper case letters in the alignment.
   */
  public static SHANNON_ENTROPY_BARPLOT: ISequenceBarplotDataSeries = {
    id: "entropy",
    name: "Entropy",
    cssClass: "barplot-shannon-entropy",
    plotOptions: {
      fixYMax: (al) => {
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
    getPositionalInfo: (pos, al) => {
      const plc = al
        .getPositionalLetterCounts(
          true,
          al.getAllUpperAlphaLettersInAlignmentSorted()
        )
        .get(pos);
      return {
        height:
          !plc || Object.keys(plc).length === 0
            ? 0
            : -1 *
              Object.values(plc).reduce((acc, p) => {
                return acc + p * Math.log2(p);
              }, 0),
      };
    },
  };

  /**
   * Plot the Kullback-Leibler (KL) divergence for individual columns in the alignment
   *        S = sum(pk * log(pk / qk)
   *   also see scipy docs:
   *     https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.entropy.html
   *
   * No maximum is explicitly set (so it because the max value)
   */
  public static KULLBAC_LEIBLER_DIVERGENCE_BARPLOT: ISequenceBarplotDataSeries = {
    id: "kullback-leibler-divergence",
    name: "KL Divergence",
    cssClass: "barplot-kullback-leibler-divergence",
    getPositionalInfo: (pos, al) => {
      const allLetters = al.getAllUpperAlphaLettersInAlignmentSorted();
      const pk = al.getPositionalLetterCounts(true, allLetters).get(pos);
      const qk = al.getGlobalAlphaLetterCounts(true, allLetters);
      return {
        height:
          !pk || Object.keys(pk).length === 0
            ? 0
            : allLetters.reduce((acc, letter) => {
                if (letter in pk) {
                  acc += pk[letter] * Math.log(pk[letter] / qk[letter]);
                }
                return acc;
              }, 0),
      };
    },
  };

  /**
   * Plot the number of gaps at each position. The y max is set to
   * the total length of the alignment and not the largest number of
   * gaps.
   */
  public static GAPS_BARPLOT: ISequenceBarplotDataSeries = {
    id: "gaps",
    name: "Gaps",
    cssClass: "barplot-gaps",
    plotOptions: {
      fixYMax: (alignment) => alignment.getSequences().length,
    },
    getPositionalInfo: (pos, al) => {
      return {
        height: al.getGapCountAtColumn(pos),
      };
    },
  };

  /**
   *
   *
   * HELPER FUNCTIONS
   *
   *
   */
  private handleSvgHover(isHovered: boolean) {
    this.setState({
      svgHovered: isHovered,
    });
  }

  private handlePositionHover(
    event: React.MouseEvent<SVGElement, MouseEvent>,
    position: number,
    isHovered: boolean
  ) {
    const { onPositionMouseEnter, onPositionMouseLeave } = this.props;
    if (isHovered && onPositionMouseEnter) {
      //notify parent listeners
      onPositionMouseEnter(
        position,
        event.relatedTarget as SVGRectElement,
        this.getBars().barsGroupedByPosition.get(position)!
      );
    } else if (!isHovered && onPositionMouseLeave) {
      onPositionMouseLeave(
        position,
        event.relatedTarget as SVGRectElement,
        this.getBars().barsGroupedByPosition.get(position)!
      );
    }
    this.setState({
      positionHovered: isHovered
        ? {
            position: position,
            element: event.relatedTarget as SVGRectElement,
            bars: this.getBars().barsGroupedByPosition.get(position)!,
          }
        : undefined,
    });
  }

  private handlePositionClicked(
    event: React.MouseEvent<SVGElement, MouseEvent>,
    position: number
  ) {
    const { positionsSelected } = this.state;
    const { onPositionSelectionChanged } = this.props;
    const newPositionsSelected = positionsSelected.some(
      (p) => p.position === position
    )
      ? positionsSelected.filter((p) => p.position !== position)
      : [
          ...positionsSelected,
          {
            position: position,
            element: event.relatedTarget as SVGRectElement,
            bars: this.getBars().barsGroupedByPosition.get(position)!,
          },
        ];
    if (onPositionSelectionChanged) {
      onPositionSelectionChanged(newPositionsSelected);
    }
    this.setState({
      positionsSelected: newPositionsSelected,
    });
  }

  /**
   * Normalize bars to fall between 0 and POSITION_MAX_HEIGHT in svg space. Obey the
   * fixYMax if specified
   * @param bars the same bars as input, with the "normalizeHeight"
   *             attribute added
   */
  private normalizeBarHeights(
    bars: ISingleBarDetailsFull[]
  ): ISingleBarDetailsFull[] {
    const { alignment } = this.props;
    const allHeights = bars.map((bar) => bar.height);
    const overallMinHeight = Math.min(...allHeights);
    const overallMaxHeight = Math.max(...allHeights);
    return bars.map((bar) => {
      const minHeight = overallMinHeight;
      const maxHeight =
        bar.dataSeries.plotOptions && bar.dataSeries.plotOptions.fixYMax
          ? bar.dataSeries.plotOptions.fixYMax(alignment)
          : overallMaxHeight;
      return {
        ...bar,
        normalizedHeight:
          ((bar.height - minHeight) / (maxHeight - minHeight)) *
          SequenceBarplotComponent.POSITION_VIEWBOX_HEIGHT,
      };
    });
  }

  /**
   * Get bars and bar groups.
   * Calls prop.getPositionalInfo to calculate heights for each
   * position. Uses cache to avoid too many updates.
   */
  private getBars() {
    const { alignment, dataSeries } = this.props;
    if (
      !this.cache.bars ||
      alignment !== this.cache.alignment ||
      dataSeries !== this.cache.dataSeries
    ) {
      this.cache.alignment = alignment;
      this.cache.dataSeries = dataSeries;

      const maxSeqLength = alignment.getMaxSequenceLength();
      let allBars: ISingleBarDetailsFull[] = [];
      dataSeries.forEach((ds) => {
        for (let i = 0; i < maxSeqLength; i++) {
          allBars.push({
            ...ds.getPositionalInfo(i, alignment),
            position: i,
            dataSeries: ds,
            normalizedHeight: -1, // define below
          });
        }
      });

      //normalize bars group by group
      this.cache.bars = Object.entries(
        _.groupBy(allBars, (bar) => bar.dataSeries.id)
      )
        .map(([categoryId, categoryBars]) => {
          return this.normalizeBarHeights(categoryBars);
        })
        .flat();

      this.cache.barsGroupedByPosition = mapGroupBy(
        this.cache.bars,
        (bar) => bar.position
      );

      this.cache.barsGroupedByDataseries = mapGroupBy(
        this.cache.bars,
        (item) => item.dataSeries
      );
    }
    return {
      bars: this.cache.bars!,
      barsGroupedByPosition: this.cache.barsGroupedByPosition!,
      barsGroupedByDataseries: this.cache.barsGroupedByDataseries!,
    };
  }

  /**
   *
   *
   * JSX RENDER FUNCTIONS
   *
   *
   */

  /**
   * Render the tooltip for a particular position.
   */
  private renderTooltip() {
    const barsObj = this.getBars();
    return (
      <ReactTooltip
        id="getBarTooltip"
        effect="solid"
        type="light"
        border={true}
        getContent={(pos: string) => {
          const posInt = parseInt(pos);
          const barsAtPostion = barsObj.barsGroupedByPosition.get(posInt)!;
          const posPlusOne = posInt + 1; // positions should be 1 based, not zero based
          return !barsAtPostion ? undefined : (
            <div className="bar-position-textblock">
              <h1>Position: {posPlusOne}</h1>
              {barsAtPostion.map((bar) => {
                return (
                  <div
                    className={`dataseries-line ${bar.dataSeries.cssClass}`}
                    key={bar.dataSeries.id}
                  >
                    <span className="legend-square"></span>
                    <span className="legend-text">
                      {bar.dataSeries.name}: {+bar.height.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        }}
      />
    );
  }

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
  private renderBarPlot() {
    const { alignment, positionWidth, height } = this.props;

    const maxSeqLength = alignment.getMaxSequenceLength();
    const totalWidth = positionWidth * maxSeqLength;

    const barsObj = this.getBars();

    return (
      <svg
        preserveAspectRatio="none"
        viewBox={`0 0 ${
          maxSeqLength * SequenceBarplotComponent.POSITION_VIEWBOX_WIDTH
        } ${SequenceBarplotComponent.POSITION_VIEWBOX_HEIGHT}`}
        style={{ width: totalWidth, height: height }}
        xmlns="http://www.w3.org/2000/svg"
        onMouseEnter={() => this.handleSvgHover(true)}
        onMouseLeave={() => this.handleSvgHover(false)}
      >
        {Array.from(barsObj.barsGroupedByPosition.entries()).map(
          ([pos, bars]) => {
            const maxBarHeight = Math.max(
              ...bars.map((bar) => bar.normalizedHeight)
            );

            const numDataSeries = barsObj.barsGroupedByDataseries.size;
            const barWidth =
              (numDataSeries === 1 ? 0.9 : 1 / numDataSeries) *
              SequenceBarplotComponent.POSITION_VIEWBOX_WIDTH;
            const firstBarOffset =
              (numDataSeries === 1 ? pos + 0.05 : pos) *
              SequenceBarplotComponent.POSITION_VIEWBOX_WIDTH;

            return (
              <g
                transform={`translate(${firstBarOffset},0)`}
                className={
                  this.state.positionsSelected.some((p) => p.position === pos)
                    ? "position-container selected"
                    : "position-container"
                }
                onClick={(event) => {
                  this.handlePositionClicked(event, pos);
                }}
                onMouseEnter={(event) => {
                  this.handlePositionHover(event, pos, true);
                }}
                onMouseLeave={(event) => {
                  this.handlePositionHover(event, pos, false);
                }}
                data-for="getBarTooltip"
                data-tip={pos}
                data-class={"barplot-tooltip-container"}
                key={`pos_${pos}`}
              >
                {bars.map((bar, dataseriesIdx) => {
                  return (
                    <rect
                      className={bar.dataSeries.cssClass}
                      transform={`translate(${
                        ((dataseriesIdx * 1) / bars.length) *
                        SequenceBarplotComponent.POSITION_VIEWBOX_WIDTH
                      },${
                        SequenceBarplotComponent.POSITION_VIEWBOX_HEIGHT -
                        bar.normalizedHeight
                      })`}
                      width={barWidth}
                      height={bar.normalizedHeight}
                      key={`${bar.position}_${bar.dataSeries.id}`}
                    ></rect>
                  );
                })}

                <rect
                  className="interaction-placeholder"
                  transform={`translate(0,${
                    SequenceBarplotComponent.POSITION_VIEWBOX_HEIGHT -
                    maxBarHeight
                  })`}
                  width={SequenceBarplotComponent.POSITION_VIEWBOX_WIDTH}
                  height={maxBarHeight}
                ></rect>
              </g>
            );
          }
        )}
      </svg>
    );
  }

  render() {
    const className = this.state.svgHovered ? "barplot hovered" : "barplot";

    return !this.props.alignment ? null : (
      <div className={className}>
        {this.renderTooltip()}
        {this.renderBarPlot()}
      </div>
    );
  }
}
