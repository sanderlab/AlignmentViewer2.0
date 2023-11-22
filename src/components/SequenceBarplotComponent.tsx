import React from "react";
import "./SequenceBarplot.scss";
import { Alignment } from "../common/Alignment";
import { mapGroupBy, ArrayOneOrMore, generateUUIDv4 } from "../common/Utils";
import ReactTooltip from "react-tooltip";
import { VirtualizedMatrixViewer } from "./virtualization/VirtualizedMatrixViewerHook";

export interface ISequenceBarplotDataSeries {
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

export interface ISequenceBarplotProps {
  //don't expose these props in the AlignmentViewer full component
  alignment: Alignment;
  positionWidth: number;

  scrollerLoaded: (e: HTMLElement) => void;
  scrollerUnloaded: (e: HTMLElement) => void;

  //props that should be exposed in AlignmentViewer full component:
  dataSeriesSet: ArrayOneOrMore<ISequenceBarplotDataSeries>;
  tooltipPlacement?: "top" | "right" | "bottom" | "left"; //default to undefined => automatic
  height?: string;
  horizontalReduxId?: string;

  //expose these, but requires smarter forwarding within the AlignmentViewer full component
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
  height: number | undefined;
  tooltipValueText?: string;
}
interface ISingleBarDetailsFull extends ISingleBarDetails {
  normalizedHeight: number | undefined;
  position: number;
  dataSeriesSet: ISequenceBarplotDataSeries;
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
  hoverKey: string;
}

export class SequenceBarplotComponent extends React.Component<
  ISequenceBarplotProps,
  ISequenceBarplotState
> {
  private static POSITION_VIEWBOX_HEIGHT = 100;
  private static POSITION_VIEWBOX_WIDTH = 1;
  private ref: React.RefObject<HTMLDivElement>;

  private cache: Partial<ISequenceBarplotProps> & {
    bars?: ISingleBarDetailsFull[];
    barsGroupedByPosition?: Map<number, ISingleBarDetailsFull[]>;
    barsGroupedByDataseries?: Map<
      ISequenceBarplotDataSeries,
      ISingleBarDetailsFull[]
    >;
  } = {};

  static defaultProps = {
    height: "100px",
  };

  constructor(props: ISequenceBarplotProps) {
    super(props);
    this.state = {
      svgHovered: false,
      positionsSelected: [],
      hoverKey: generateUUIDv4(),
    };

    this.ref = React.createRef<HTMLDivElement>();
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
    color: "#000000",
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
    getBars: (al) => {
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
    },
  };

  /**
   * Plot evcouplings style conservation defined as 1 - the shannon entropy
   */
  public static CONSERVATION_BARPLOT: ISequenceBarplotDataSeries = {
    id: "conservation",
    name: "Conservation",
    cssClass: "barplot-conservation",
    color: "#414141",
    plotOptions: {
      fixYMax: (al) => {
        return SequenceBarplotComponent.SHANNON_ENTROPY_BARPLOT.plotOptions!
          .fixYMax!(al);
      },
    },
    getBars: (al) => {
      const ymax = SequenceBarplotComponent.SHANNON_ENTROPY_BARPLOT.plotOptions!
        .fixYMax!(al);
      const entropyBars = SequenceBarplotComponent.SHANNON_ENTROPY_BARPLOT.getBars(
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
    color: "darkred",
    getBars: (al) => {
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
    color: "#b7b7b7",
    plotOptions: {
      fixYMax: (alignment) => alignment.getSequenceCount(),
    },
    getBars: (al) => {
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
          SequenceBarplotComponent.POSITION_VIEWBOX_HEIGHT;
      
      return {
        ...bar,
        normalizedHeight: isNaN(normalizedHeight) 
          ? undefined 
          : normalizedHeight
      };
    });
  }

  /**
   * Get bars and bar groups.
   * Calls prop.getPositionalInfo to calculate heights for each
   * position. Uses cache to avoid too many updates.
   */
  private getBars() {
    const { alignment, dataSeriesSet } = this.props;

    const dataSeriesSetChanged =
      !this.cache.dataSeriesSet ||
      this.cache.dataSeriesSet.find((ds, idx) => {
        return ds !== dataSeriesSet[idx];
      });

    if (
      !this.cache.bars ||
      alignment !== this.cache.alignment ||
      dataSeriesSetChanged
    ) {
      this.cache.alignment = alignment;
      this.cache.dataSeriesSet = dataSeriesSet;

      let allBars: ISingleBarDetailsFull[] = [];
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
      this.cache.bars = Object.values(
        allBars.reduce((acc, bar)=>{
          acc[bar.dataSeriesSet.id] = acc[bar.dataSeriesSet.id] 
            ? [...acc[bar.dataSeriesSet.id], bar] : [bar];
          return acc;
        }, {} as {[seriesId: string]: ISingleBarDetailsFull[]})    
      )
        .map((categoryBars) => {
          return this.normalizeBarHeights(categoryBars);
        })
        .flat();

      this.cache.barsGroupedByPosition = mapGroupBy(
        this.cache.bars,
        (bar) => bar.position
      );

      this.cache.barsGroupedByDataseries = mapGroupBy(
        this.cache.bars,
        (item) => item.dataSeriesSet
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
    const { tooltipPlacement } = this.props;
    const { hoverKey } = this.state;

    return (
      <ReactTooltip
        id={`getBarTooltip-${hoverKey}`}
        effect="solid"
        type="light"
        border={true}
        place={tooltipPlacement}
        getContent={(pos: string) => {
          const posInt = parseInt(pos);
          const posPlusOne = posInt + 1; // positions should be 1 based, not zero based
          const barsAtPostion = barsObj.barsGroupedByPosition.get(posInt)!;
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
    const { hoverKey } = this.state;

    const maxSeqLength = alignment.getSequenceLength();
    const totalWidth = positionWidth * maxSeqLength;

    const barsObj = this.getBars();
    return (
      <svg
        preserveAspectRatio="none"
        viewBox={`0 0 ${
          maxSeqLength * SequenceBarplotComponent.POSITION_VIEWBOX_WIDTH
        } ${SequenceBarplotComponent.POSITION_VIEWBOX_HEIGHT}`}
        style={{
          width: totalWidth,
          height: height
            ? height
            : SequenceBarplotComponent.defaultProps.height,
        }}
        xmlns="http://www.w3.org/2000/svg"
        onMouseEnter={() => this.handleSvgHover(true)}
        onMouseLeave={() => this.handleSvgHover(false)}
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
              (numDataSeries === 1 ? 0.9 : 1 / numDataSeries) *
              SequenceBarplotComponent.POSITION_VIEWBOX_WIDTH;
            const firstBarOffset =
              (numDataSeries === 1 ? pos + 0.05 : pos) *
              SequenceBarplotComponent.POSITION_VIEWBOX_WIDTH;

            return allBarsHeightsAtPosition.length < 1 ? null : (
              <g
                transform={`translate(${firstBarOffset},0)`}
                className={
                  this.state.positionsSelected.some((p) => p.position === pos)
                    ? "position-container selected"
                    : "position-container pos" + pos
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
                data-for={`getBarTooltip-${hoverKey}`}
                data-tip={pos}
                data-class={"barplot-tooltip-container"}
                key={`pos_${pos}`}
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
                          ((dataseriesIdx * 1) / bars.length) *
                          SequenceBarplotComponent.POSITION_VIEWBOX_WIDTH
                        },${
                          SequenceBarplotComponent.POSITION_VIEWBOX_HEIGHT -
                          bar.normalizedHeight
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

  /*
   *
   *
   * REACT METHODS
   *
   *
   */
  shouldComponentUpdate(nextProps: ISequenceBarplotProps) {
    const { alignment, dataSeriesSet, positionWidth } = this.props;
    if (
      !this.cache ||
      alignment !== nextProps.alignment ||
      dataSeriesSet !== nextProps.dataSeriesSet ||
      positionWidth !== nextProps.positionWidth
    ) {
      return true;
    }
    return false;
  }

  componentDidUpdate() {
    ReactTooltip.rebuild();
  }

  componentDidMount() {
    this.props.scrollerLoaded(this.ref.current!);
  }

  componentWillUnmount() {
    this.props.scrollerUnloaded(this.ref.current!);
  }

  render() {
    const {alignment, positionWidth, horizontalReduxId, } = this.props;
    const classNames = ["barplot"];
    if (this.state.svgHovered) {
      classNames.push("hovered");
    }
    return !this.props.alignment ? null : (
      <div className={"barplot"} ref={this.ref}>
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
          getContent={(
            rowIdxsToRender,
            colIdxsToRender,
            additionalVerticalOffset,
            additionalHorizontalOffset,
            stageDimensions
          ) => {
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
                {this.renderBarPlot()}
              </div>
            );
          }}
        />
        {this.renderTooltip()}
      </div>
    );
  }
}
