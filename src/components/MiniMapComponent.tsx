import * as React from "react";
import "./MiniMap.scss";

import { CanvasAlignmentComponent } from "./CanvasAlignmentComponent";
import { Alignment } from "../common/Alignment";
import { SequenceSorter } from "../common/AlignmentSorter";
import {
  AminoAcidAlignmentStyle,
  NucleotideAlignmentStyle,
} from "../common/MolecularStyles";
import { ResizeSensor } from "css-element-queries";

export interface IMiniMapProps {
  //don't expose these props in the AlignmentViewer full component
  alignment: Alignment;
  sortBy: SequenceSorter;
  alignmentStyle: AminoAcidAlignmentStyle | NucleotideAlignmentStyle;
  highlightRows?: {
    rowStart: number;
    rowEnd: number;
  };

  //props that should be exposed in AlignmentViewer full component:
  alignHorizontal?: "left" | "right";
  startingWidth?: number;
  resizable?: "none" | "horizontal";
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
    startingWidth: 120,
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
    const { startingWidth } = this.props;
    const { height, resizedWidth } = this.state;

    const frameBorderWidth = 1; // in pixels
    const frameMargin = 2; // in pixels

    function adjustForBorderAndMargin(length: number) {
      return length - 2 * frameMargin - 1 * frameBorderWidth;
    }

    return {
      borderWidth: frameBorderWidth,
      margin: frameMargin,
      frameHeight: height, //adjustForBorderAndMargin(height),
      frameWidth: resizedWidth
        ? resizedWidth
        : startingWidth
        ? adjustForBorderAndMargin(startingWidth)
        : adjustForBorderAndMargin(MiniMapComponent.defaultProps.startingWidth),
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
          });
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
          width: size.frameWidth - 14, //add space for the dragger on safari
          height: size.frameHeight,
        }}
        highlightRows={highlightRows}
        onClick={(pos) => {
          if (this.props.onClick) {
            this.props.onClick(pos);
          }
        }}
        onIndicatorDrag={(bounds, pos) => {
          if (this.props.onIndicatorDrag) {
            this.props.onIndicatorDrag(bounds, pos);
          }
        }}
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
