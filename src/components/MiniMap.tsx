import * as React from "react";
import { AlignmentCanvasComponent } from "../AlignmentCanvasComponent";
import Alignment, { SequenceSortOptions } from "../Alignment";
import {
  AminoAcidAlignmentStyle,
  NucleotideAlignmentStyle
} from "../MolecularStyles";

export interface IMiniMapProps {
  align: "left" | "right";
  height: number;
  width: number;
  alignment: Alignment;
  sortBy: SequenceSortOptions;
  style: AminoAcidAlignmentStyle | NucleotideAlignmentStyle;
}

export class MiniMap extends React.Component<IMiniMapProps> {
  public static defaultProps = {
    align: "right",
    height: 400,
    width: 200
  };
  protected canvas: HTMLCanvasElement | null = null;

  constructor(props: IMiniMapProps) {
    super(props);
  }

  public render() {
    const { align, height, width } = this.props;
    return (
      <div
        style={{
          position: "fixed",
          zIndex: 100000,
          ...(align === "left" ? { left: 0 } : { right: 0 })
        }}
      >
        <AlignmentCanvasComponent
          id="alignment_canvas"
          alignment={this.props.alignment}
          alignmentType={this.props.style.alignmentType}
          positionsToStyle={this.props.style.positionsToStyle}
          colorScheme={this.props.style.colorScheme}
          sortBy={this.props.sortBy}
          mouseDown={(x, y) => {
            console.log("someone clicked on the canvas:" + x + "," + y);
          }}
        />
      </div>
      /*
      <canvas
        width={width}
        height={height}
        ref={el => {
          if (el) {
            this.canvas = el;
            this.initializeMiniMapCanvas();
          }
        }}
        style={{
          position: "fixed",
          zIndex: 100000,
          ...(align === "left" ? { left: 0 } : { right: 0 })
        }}
      />}*/
    );
  }

  protected initializeMiniMapCanvas = () => {
    if (!this.canvas) {
      return;
    }
    const context = this.canvas.getContext("2d");
    if (!context) {
      return;
    }
    console.log("yay");
    context.fillStyle = "red";
    context.strokeStyle = "";
    context.fillRect(0, 0, this.props.width, this.props.height);
  };
}
