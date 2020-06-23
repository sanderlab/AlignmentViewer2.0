/**
 * Hook for rendering the position axis
 */
import React, { useRef, useEffect } from "react";
import "./PositionalAxis.scss";

/**
 * Generate a string axis (positional information) with one character per position
 * through the maxLength. Taken from alignmentviewer 1.0:
 *     https://github.com/sanderlab/alignmentviewer
 * May want to implement this better in the future (SVG + sliding tooltip for cursor?)
 * @param maxLength
 */
function generateTextualRuler(maxLength: number): string {
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

/**
 * @param props
 */
export function PositionalAxis(props: {
  positions: number[];
  fontSize: number;

  scrollerLoaded: (e: HTMLElement) => void;
  scrollerUnloaded: (e: HTMLElement) => void;
}) {
  const { fontSize, positions, scrollerLoaded, scrollerUnloaded } = props;

  //ref to div
  const positionalAxisRef = useRef<HTMLDivElement>(null);

  //sizing - dynamically update state when div changes size
  useEffect(() => {
    if (scrollerLoaded && positionalAxisRef.current) {
      scrollerLoaded(positionalAxisRef.current);
      return () => {
        if (!positionalAxisRef.current) {
          console.error(
            "References to positional axis is not availalbe:",
            positionalAxisRef
          );
        } else {
          scrollerUnloaded(positionalAxisRef.current);
        }
      };
    }
  }, [scrollerLoaded]);

  return (
    <div
      ref={positionalAxisRef}
      className="positional-axis"
      style={{ fontSize: fontSize }}
    >
      {generateTextualRuler(Math.max(...positions))}
    </div>
  );
}
