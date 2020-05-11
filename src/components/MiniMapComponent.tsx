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
  //don't expose these props in the AlignmentViewer full component
  alignment: Alignment;
  sortBy: SequenceSortOptions;
  alignmentStyle: AminoAcidAlignmentStyle | NucleotideAlignmentStyle;
  highlightRows?: {
    rowStart: number;
    rowEnd: number;
  };

  //props that should be exposed in AlignmentViewer full component:
  alignHorizontal: "left" | "right";
  startingWidth: number;
  resizable: "none" | "horizontal";
  verticalHeight?: "div" | "window";

  //expose these, but requires smarter forwarding within the AlignmentViewer full component
  onClick?(mousePosition: IPosition): void;
  onIndicatorDrag?(rectBounds: IRectangle, mousePosition: IPosition): void;
}

export interface IMiniMapState {
  height: number; //calculated dynamically
  resizedWidth?: number;
}

export class MiniMapComponent extends React.Component<
  IMiniMapProps,
  IMiniMapState
> {
  private ref?: HTMLDivElement;
  private resizeSensor?: ResizeSensor;

  public static defaultProps = {
    alignHorizontal: "right",
    //alignVertical: "top",
    startingWidth: 300,
    resizable: "none",
    verticalHeight: "div",
  };

  constructor(props: IMiniMapProps) {
    super(props);

    this.state = {
      //zoomPercent: 1,
      height: window.innerHeight,
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
      frameHeight: this.state.height - 2 * frameMargin - 1 * frameBorderWidth,
      frameWidth: resizedWidth
        ? resizedWidth
        : this.props.startingWidth - 2 * frameMargin - 1 * frameBorderWidth,
    };
  }

  protected setupResizeSensor(ref: HTMLDivElement | null) {
    if (ref && !this.resizeSensor) {
      this.ref = ref;
      this.resizeSensor = new ResizeSensor(ref, () => {
        if (
          this.state.resizedWidth !== ref.clientWidth ||
          this.state.height !== ref.clientHeight
        ) {
          setTimeout(() => {
            //flashes (worse) without setTimeout. Safari still flashing.
            this.setState({
              resizedWidth: ref.clientWidth,
              height: ref.clientHeight,
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
    const { alignHorizontal, resizable, verticalHeight } = this.props;
    const size = this.getSizing();

    const position = verticalHeight === "div" ? "absolute" : "fixed";

    return (
      <div
        ref={this.setupResizeSensor}
        className="minimap-holder"
        style={{
          ...(alignHorizontal === "left" ? { left: 0 } : { right: 0 }),
          //...(alignVertical === "top" ? { top: 0 } : { bottom: 0 }),
          //height: size.frameHeight,
          position: position,
          width: size.frameWidth,
          borderWidth: `${size.borderWidth}px`,
          margin: `${size.margin}px`,
          resize: resizable ? resizable : "none",
          direction: alignHorizontal === "left" ? "ltr" : "rtl",
        }}
      >
        {this.renderCanvasComponent()}
      </div>
    );
  }
}
