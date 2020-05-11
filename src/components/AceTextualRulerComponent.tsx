import { Alignment } from "../common/Alignment";
import { AceEditorComponent, IAceEditorProps } from "./AceEditorComponent";

export interface IAceTextualRulerComponentProps extends IAceEditorProps {
  alignment: Alignment;
}

export class AceTextualRulerComponent extends AceEditorComponent<
  IAceTextualRulerComponentProps,
  {}
> {
  /**
   * Generate a string axis (positional information) with one character per position
   * through the maxLength. Taken from alignmentviewer 1.0:
   *     https://github.com/sanderlab/alignmentviewer
   * May want to implement this better in the future (SVG + sliding tooltip for cursor?)
   * @param maxLength
   */
  static generateTextualRuler(maxLength: number): string {
    let s = ""; // should be a better way to do this to be honest
    for (let i = 1; i <= maxLength + 1; i++) {
      const Q = i % 10 === 0;
      const Q5 = !Q && i % 5 === 0;
      s += Q ? "|" : Q5 ? ":" : ".";
      if (!Q) {
        continue;
      }
      const sn = "" + i;
      const np = s.length - sn.length - 1; // where num starts
      if (np < 0) {
        continue;
      }
      s = s.substr(0, np) + sn + "|";
    }
    return s; // this.hruler = s.replace(/ /g, '.');
  }

  getText(): string {
    return AceTextualRulerComponent.generateTextualRuler(
      this.props.alignment.getMaxSequenceLength()
    );
  }
  getEditorMode() {
    return undefined;
  }
}
