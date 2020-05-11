import * as React from "react";
import "./MiniMap.scss";

import { CanvasAlignmentComponent } from "./CanvasAlignmentComponent";
import { Alignment, SequenceSortOptions } from "../common/Alignment";
import {
  AminoAcidAlignmentStyle,
  NucleotideAlignmentStyle,
} from "../common/MolecularStyles";
import { ResizeSensor } from "css-element-queries";

export interface IMiniMapProps {
  alignHorizontal: "left" | "right";
  //alignVertical: "top" | "bottom";
  alignment: Alignment;
  height: number;
  sortBy: SequenceSortOptions;
  alignmentStyle: AminoAcidAlignmentStyle | NucleotideAlignmentStyle;
  startingWidth: number;
  resizable: "none" | "horizontal"; // | "vertical" | "both";

  highlightRows?: {
    rowStart: number;
    rowEnd: number;
  };
  onClick?(mousePosition: IPosition): void;
  onIndicatorDrag?(rectBounds: IRectangle, mousePosition: IPosition): void;
}

export interface IMiniMapState {
  //zoomPercent: number;
  resizedWidth?: number;
}

export class MiniMapComponent extends React.Component<
  IMiniMapProps,
  IMiniMapState
> {
  private myRef: HTMLDivElement | null = null;
  private resizeSensor?: ResizeSensor;

  public static defaultProps = {
    alignHorizontal: "right",
    //alignVertical: "top",
    height: 600,
    startingWidth: 300,
    resizable: "none",
  };

  constructor(props: IMiniMapProps) {
    super(props);

    this.state = {
      //zoomPercent: 1,
    };
    this.setupResizeSensor = this.setupResizeSensor.bind(this);
  }

  protected getSizing() {
    const { resizedWidth } = this.state;

    const frameBorderWidth = 1; // in pixels
    const frameMargin = 2; // in pixels

    return {
      borderWidth: frameBorderWidth,
      margin: frameMargin,
      frameHeight: this.props.height - 2 * frameMargin - 1 * frameBorderWidth,
      frameWidth: resizedWidth
        ? resizedWidth
        : this.props.startingWidth - 2 * frameMargin - 1 * frameBorderWidth,
    };
  }

  protected setupResizeSensor(ref: HTMLDivElement | null) {
    if (ref && !this.resizeSensor) {
      this.resizeSensor = new ResizeSensor(ref, () => {
        if (this.state.resizedWidth !== ref.clientWidth) {
          setTimeout(() => {
            //flashes (worse) without setTimeout. Safari still flashing.
            this.setState({
              resizedWidth: ref.clientWidth,
            });
          }, 10);
        }
      });
    }
  }

  /*
   *
   *
   * RENDER METHODS
   *
   *
   */

  protected renderCanvasComponent = () => {
    const { alignment, highlightRows, sortBy, alignmentStyle } = this.props;
    //const { zoomPercent } = this.state;
    const size = this.getSizing();
    return (
      <CanvasAlignmentComponent
        alignment={alignment}
        alignmentType={alignmentStyle.alignmentType}
        positionsToStyle={alignmentStyle.positionsToStyle}
        colorScheme={alignmentStyle.colorScheme}
        sortBy={sortBy}
        stageDimensions={{
          width: size.frameWidth - 10, //add space for the dragger on safari
          height: size.frameHeight,
        }}
        highlightRows={highlightRows}
        viewportProps={
          {
            //zoomPercent,
          }
        }
        onClick={this.props.onClick}
        onIndicatorDrag={this.props.onIndicatorDrag}
      />
    );
  };

  /*
   *
   *
   * REACT METHODS
   *
   *
   */
  render() {
    const { alignHorizontal, resizable } = this.props;
    const size = this.getSizing();
    return (
      <div
        ref={this.setupResizeSensor}
        className="minimap-holder"
        style={{
          ...(alignHorizontal === "left" ? { left: 0 } : { right: 0 }),
          //...(alignVertical === "top" ? { top: 0 } : { bottom: 0 }),
          height: size.frameHeight,
          width: size.frameWidth,
          borderWidth: `${size.borderWidth}px`,
          margin: `${size.margin}px`,
          resize: resizable ? resizable : "none",
          direction: alignHorizontal === "left" ? "ltr" : "rtl",
        }}
      >
        {this.renderCanvasComponent()}
        {/*this.renderZoomControls()*/}
      </div>
    );
  }

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
