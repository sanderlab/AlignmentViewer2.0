import * as React from "react";
import "./MiniMap.scss";

import { CanvasAlignmentComponent } from "./CanvasAlignmentComponent";
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
  sortBy: SequenceSortOptions;
  style: AminoAcidAlignmentStyle | NucleotideAlignmentStyle;
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
  private mutObserver?: MutationObserver;

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
  }

  protected setupMutationObserver() {
    this.mutObserver = new MutationObserver((mutations) => {
      if (this.myRef) {
        this.setState({
          resizedWidth: this.myRef.clientWidth,
        });
      }
    });
    return this.mutObserver;
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

  public render() {
    const { alignHorizontal, resizable } = this.props;
    const size = this.getSizing();
    return (
      <div
        ref={(newRef) => {
          if (this.mutObserver) {
            this.mutObserver.disconnect();
          }

          const mutObserver = this.mutObserver
            ? this.mutObserver
            : this.setupMutationObserver();
          this.myRef = newRef;
          if (newRef) {
            mutObserver.observe(newRef, { attributes: true });
          }
        }}
        className="minimap-holder"
        style={{
          ...(alignHorizontal === "left" ? { left: 0 } : { right: 0 }),
          //...(alignVertical === "top" ? { top: 0 } : { bottom: 0 }),
          height: size.frameHeight,
          width: size.frameWidth + 10, //add space for the dragger on safari
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

  protected renderCanvasComponent = () => {
    const { alignment, highlightRows, sortBy, style } = this.props;
    //const { zoomPercent } = this.state;
    const size = this.getSizing();
    return (
      <CanvasAlignmentComponent
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
