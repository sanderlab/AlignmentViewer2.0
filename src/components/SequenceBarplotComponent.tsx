import React from "react";
import _ from "lodash";
import "./SequenceBarplotComponent.scss";
import { Alignment } from "../common/Alignment";
import { mapGroupBy } from "../common/Utils";

export interface ISequenceBarplotDataSeries {
  id: string;
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
  dataSeries: ISequenceBarplotDataSeries[];
  positionWidth: number;
}

interface ISingleBarDetails {
  height: number;
  tooltip?: string;
}
interface ISingleBarDetailsFull extends ISingleBarDetails {
  normalizedHeight: number;
  position: number;
  dataSeries: ISequenceBarplotDataSeries;
}
interface ISequenceBarplotState {
  barsSelected: ISingleBarDetailsFull[];
  barHovered: undefined | { elem: SVGRectElement; bar: ISingleBarDetailsFull };
  svgHovered: boolean;
}

export class SequenceBarplotComponent extends React.Component<
  ISequenceBarplotProps,
  ISequenceBarplotState
> {
  private cache: Partial<ISequenceBarplotProps> & {
    bars?: ISingleBarDetailsFull[];
    barsGrouped?: Map<ISequenceBarplotDataSeries, ISingleBarDetailsFull[]>;
  } = {};

  constructor(props: ISequenceBarplotProps) {
    super(props);
    this.state = {
      barsSelected: [],
      barHovered: undefined,
      svgHovered: false,
    };
    this.handleSvgHover = this.handleSvgHover.bind(this);
    this.handleBarHover = this.handleBarHover.bind(this);
  }

  handleSvgHover(isHovered: boolean) {
    this.setState({
      svgHovered: isHovered,
    });
  }

  handleBarHover(
    event: React.MouseEvent<SVGRectElement, MouseEvent>,
    bar: ISingleBarDetailsFull,
    isHovered: boolean
  ) {
    this.setState({
      barHovered: isHovered
        ? { bar: bar, elem: event.relatedTarget as SVGRectElement }
        : undefined,
    });
  }

  handleToggleBarSelected(bar: ISingleBarDetailsFull, event: React.MouseEvent) {
    this.setState({
      barsSelected: this.state.barsSelected.includes(bar)
        ? this.state.barsSelected.filter((elem) => elem !== bar)
        : [...this.state.barsSelected, bar],
    });
  }

  /**
   *
   *
   * HELPER FUNCTIONS
   *
   *
   */

  /**
   * Normalize bars to fall between 0 and 100 in svg space. Obey the
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
      //const maxHeight = overallMaxHeight;
      //const minHeight =
      //  bar.dataSeries.plotOptions && bar.dataSeries.plotOptions.fixYMin
      //    ? bar.dataSeries.plotOptions.fixYMin
      //    : overallMinHeight;
      const maxHeight =
        bar.dataSeries.plotOptions && bar.dataSeries.plotOptions.fixYMax
          ? bar.dataSeries.plotOptions.fixYMax(alignment)
          : overallMaxHeight;
      return {
        ...bar,
        normalizedHeight:
          ((bar.height - minHeight) / (maxHeight - minHeight)) * 100,
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

      this.cache.barsGrouped = mapGroupBy(
        this.cache.bars,
        (item) => item.dataSeries
      );
    }
    return { bars: this.cache.bars!, barsGrouped: this.cache.barsGrouped! };
  }

  /**
   *
   *
   * JSX RENDER FUNCTIONS
   *
   *
   */

  /**
   * Render the tooltip div or returns an empty element if nothing is hovered.
   */
  private renderTooltip() {
    const { barHovered } = this.state;
    if (!barHovered) {
      return <></>;
    }
    const bars = this.getBars().bars;
    const barsAtPostion = bars.reduce((acc, bar) => {
      if (bar.position === barHovered.bar.position) {
        acc.push(bar);
      }
      return acc;
    }, [] as ISingleBarDetailsFull[]);

    return (
      <div
        className="barTooltip"
        style={
          {
            //top: barHovered.elem.parentElement?.offsetTop,
            //left: barHovered.elem.parentElement?.offsetLeft,
          }
        }
      >
        <div>
          <strong>Position: {barHovered.bar.position}</strong>
        </div>
        {barsAtPostion.map((bar) => {
          return (
            <div className={bar.dataSeries.cssClass} key={bar.dataSeries.id}>
              {bar.dataSeries.name}: {+bar.height.toFixed(2)}
            </div>
          );
        })}
      </div>
    );
  }

  /**
   * Render the legend for the entire plot.
   */
  renderBarplotLegend() {
    const { dataSeries: categories } = this.props;
    return (
      <div className="legend">
        {categories.map((category, idx) => {
          return (
            <div className={category.cssClass} key={`${category}_${idx}`}>
              {category.name}
            </div>
          );
        })}
      </div>
    );
  }

  /**
   * Render the bar plot svg, with each bar appearing as a single rectangle.
   * Final form:
   *    <svg ...>
   *      <g category 1>
   *         <rect for category 1 position 1>
   *         <rect for category 1 position 2>
   *         ...
   *      </g>
   *      <g category 2>
   *         <rect for category 2 position 1>
   *         <rect for category 2 position 2>
   *         ...
   *      </g>
   *   </svg>
   */
  private renderBarPlot() {
    const { alignment, dataSeries: categories, positionWidth } = this.props;
    const { barsSelected } = this.state;

    const maxSeqLength = alignment.getMaxSequenceLength();
    const totalWidth = positionWidth * maxSeqLength;

    const barItemsGrouped = this.getBars().barsGrouped;
    return (
      <svg
        preserveAspectRatio="none"
        viewBox={`0 0 ${maxSeqLength} 100`}
        style={{ width: totalWidth, height: 100 }}
        xmlns="http://www.w3.org/2000/svg"
        onMouseEnter={() => this.handleSvgHover(true)}
        onMouseLeave={() => this.handleSvgHover(false)}
      >
        {Array.from(barItemsGrouped.entries()).map(([category, bars], idx) => {
          return (
            <g
              transform={`translate(${(idx * 1) / categories.length},0)`}
              className={categories.find((cat) => cat === category)?.cssClass}
              key={category.id}
            >
              {bars.map((bar) => {
                return (
                  <g
                    transform={`translate(${bar.position},${
                      100 - bar.normalizedHeight
                    })`}
                    key={`${idx}_${bar.position}_${bar.dataSeries.id}`}
                  >
                    <rect
                      width={1 / barItemsGrouped.size}
                      height={bar.normalizedHeight}
                      className={
                        barsSelected.includes(bar) ? "selected" : undefined
                      }
                      onClick={(event) =>
                        this.handleToggleBarSelected(bar, event)
                      }
                      onMouseEnter={(event) =>
                        this.handleBarHover(event, bar, true)
                      }
                      onMouseLeave={(event) =>
                        this.handleBarHover(event, bar, true)
                      }
                    ></rect>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    );
  }

  render() {
    const className = this.state.svgHovered ? "barplot hovered" : "barplot";

    return !this.props.alignment ? null : (
      <div className={className}>
        {this.renderTooltip()}
        {this.renderBarplotLegend()}
        {this.renderBarPlot()}
      </div>
    );
  }
}
