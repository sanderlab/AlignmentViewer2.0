import * as React from "react";

import { AlignmentCanvasComponent } from "../AlignmentCanvasComponent";
import Alignment, { SequenceSortOptions } from "../Alignment";
import {
  AminoAcidAlignmentStyle,
  NucleotideAlignmentStyle
} from "../MolecularStyles";

export interface IMiniMapProps {
  alignHorizontal: "left" | "right";
  alignVertical: "top" | "bottom";
  alignment: Alignment;
  height: number;
  highlightRows?: [number, number];
  onClick?: (x: number, y: number) => void;
  sortBy: SequenceSortOptions;
  style: AminoAcidAlignmentStyle | NucleotideAlignmentStyle;
  width: number;
}

export interface IMiniMapState {
  zoomPercent: number;
}

export class MiniMap extends React.Component<IMiniMapProps, IMiniMapState> {
  public static defaultProps = {
    alignHorizontal: "right",
    alignVertical: "top",
    height: 600,
    width: 300
  };
  constructor(props: IMiniMapProps) {
    super(props);
    this.state = {
      zoomPercent: 1
    };
  }

  public render() {
    const { alignHorizontal, alignVertical, height, width } = this.props;
    return (
      <div
        style={{
          zIndex: 100000,
          ...(alignHorizontal === "left" ? { left: 0 } : { right: 0 }),
          ...(alignVertical === "top" ? { top: 0 } : { bottom: 0 }),
          height,
          position: "fixed",
          width
        }}
      >
        {this.renderCanvasComponent()}
        {this.renderZoomControls()}
      </div>
    );
  }

  protected renderCanvasComponent = () => {
    const {
      alignment,
      height,
      highlightRows,
      sortBy,
      style,
      width
    } = this.props;
    const { zoomPercent } = this.state;
    return (
      <div style={{ opacity: 0.75 }}>
        <AlignmentCanvasComponent
          id="alignment_canvas"
          alignment={alignment}
          alignmentType={style.alignmentType}
          positionsToStyle={style.positionsToStyle}
          colorScheme={style.colorScheme}
          sortBy={sortBy}
          stageResolution={{
            width,
            height
          }}
          highlightRows={highlightRows}
          viewportProps={{
            useDrag: true,
            usePinch: false,
            useWheel: false,
            zoomPercent
          }}
          mouseDown={this.onMouseDown}
        />
      </div>
    );
  };

  protected renderZoomControls = () => (
    <div style={{ textAlign: "center", opacity: 1 }}>
      <button onClick={this.onZoomOut}>-</button>
      <button onClick={this.onZoomReset}>Reset</button>
      <button onClick={this.onZoomIn}>+</button>
    </div>
  );

  protected onMouseDown = (x: number, y: number) => {
    const { onClick } = this.props;
    if (onClick) {
      onClick(x, y);
    }
  };

  protected onZoomIn = () => {
    const { zoomPercent } = this.state;
    this.setState({
      zoomPercent: Math.min(8, zoomPercent + 0.25)
    });
  };

  protected onZoomOut = () => {
    const { zoomPercent } = this.state;
    this.setState({
      // A zoomPercent of 0 will not actually zoom out!
      zoomPercent: Math.max(0.25, zoomPercent - 0.25)
    });
  };

  protected onZoomReset = () => {
    this.setState({
      zoomPercent: 1
    });
  };
}
