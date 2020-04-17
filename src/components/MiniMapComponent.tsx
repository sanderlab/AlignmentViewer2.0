import * as React from "react";

import { AlignmentCanvasComponent } from "./AlignmentCanvasComponent";
import { Alignment, SequenceSortOptions } from "../common/Alignment";
import {
  AminoAcidAlignmentStyle,
  NucleotideAlignmentStyle,
} from "../common/MolecularStyles";

export interface IMiniMapProps {
  alignHorizontal: "left" | "right";
  //alignVertical: "top" | "bottom";
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

export class MiniMapComponent extends React.Component<
  IMiniMapProps,
  IMiniMapState
> {
  public static defaultProps = {
    alignHorizontal: "right",
    //alignVertical: "top",
    height: 600,
    width: 300,
  };
  constructor(props: IMiniMapProps) {
    super(props);
    this.state = {
      zoomPercent: 1,
    };
  }

  protected getSizing() {
    const frameBorderWidth = 1; // in pixels
    const frameMargin = 2; // in pixels
    return {
      borderWidth: frameBorderWidth,
      margin: frameMargin,
      frameHeight: this.props.height - 2 * frameMargin - 1 * frameBorderWidth,
      frameWidth: this.props.width - 2 * frameMargin - 1 * frameBorderWidth,
    };
  }

  public render() {
    const { alignHorizontal } = this.props;
    const size = this.getSizing();
    return (
      <div
        style={{
          zIndex: 100000,
          ...(alignHorizontal === "left" ? { left: 0 } : { right: 0 }),
          //...(alignVertical === "top" ? { top: 0 } : { bottom: 0 }),
          top: 0,
          bottom: 0,
          height: size.frameHeight,
          width: size.frameWidth,
          position: "fixed",
          backgroundColor: "white",
          borderColor: "#333333",
          borderStyle: "solid",
          borderWidth: `${size.borderWidth}px`,
          margin: `${size.margin}px`,
        }}
      >
        {this.renderCanvasComponent()}
        {/*this.renderZoomControls()*/}
      </div>
    );
  }

  protected renderCanvasComponent = () => {
    const { alignment, highlightRows, sortBy, style } = this.props;
    const { zoomPercent } = this.state;
    const size = this.getSizing();
    return (
      <div>
        <AlignmentCanvasComponent
          id="alignment_canvas"
          alignment={alignment}
          alignmentType={style.alignmentType}
          positionsToStyle={style.positionsToStyle}
          colorScheme={style.colorScheme}
          sortBy={sortBy}
          stageResolution={{
            width: size.frameWidth,
            height: size.frameHeight,
          }}
          highlightRows={highlightRows}
          viewportProps={{
            useDrag: true,
            usePinch: true,
            useWheel: true,
            zoomPercent,
          }}
          mouseDown={this.onMouseDown}
        />
      </div>
    );
  };
  protected onMouseDown = (x: number, y: number) => {
    const { onClick } = this.props;
    if (onClick) {
      onClick(x, y);
    }
  };

  /*

  protected renderZoomControls = () => (
    <div style={{ textAlign: "center", opacity: 1 }}>
      <button onClick={this.onZoomOut}>-</button>
      <button onClick={this.onZoomReset}>Reset</button>
      <button onClick={this.onZoomIn}>+</button>
    </div>
  );

  protected onZoomIn = () => {
    const { zoomPercent } = this.state;
    this.setState({
      zoomPercent: Math.min(8, zoomPercent + 0.25),
    });
  };

  protected onZoomOut = () => {
    const { zoomPercent } = this.state;
    this.setState({
      // A zoomPercent of 0 will not actually zoom out!
      zoomPercent: Math.max(0.25, zoomPercent - 0.25),
    });
  };

  protected onZoomReset = () => {
    this.setState({
      zoomPercent: 1,
    });
  };*/
}
