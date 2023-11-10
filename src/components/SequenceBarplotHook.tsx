/**
 * Hook for rendering barplots
 */
import "./SequenceBarplot.scss";
import React from "react";
import { VirtualizedMatrixViewer } from "./virtualization/VirtualizedMatrixViewerHook";
import { Alignment } from "../common/Alignment";
import { ArrayOneOrMore } from "../common/Utils";


interface ISingleBarDetails {
  height: number | undefined;
  tooltipValueText?: string;
}

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

/**
 * @param props


export function SequenceBarplot(props: {
  horizontalReduxId: string;
  positionWidth: number;

  alignment: Alignment;
  dataSeriesSet: ArrayOneOrMore<ISequenceBarplotDataSeries>;
}) {
  const {
    horizontalReduxId,
    positionWidth,
    alignment,
    dataSeriesSet,
  } = props;

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

      <VirtualizedMatrixViewer
        //id={id}
        horizontalReduxId={horizontalReduxId}
        direction="x"
        columnCount={positions.length}
        columnWidth={residueWidth}
        rowCount={1}
        rowHeight={residueHeight}
        autoOffset={true}
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
            <></>
          );
        }}
      />
    </svg>
  );
}
 */