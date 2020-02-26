/**
 *
 * Glyph definitions for the logo component.
 * Inspired / derived from https://github.com/weng-lab/logojs-package
 *
 */

import React from "react";

export class GlyphFactory {
  private static singleton: undefined | GlyphFactory;

  private letterToGlyphHM: {
    [key: string]: (props: { [key: string]: string }) => JSX.Element;
  } = {
    A: GlyphFactory.A,
    B: GlyphFactory.B,
    C: GlyphFactory.C,
    D: GlyphFactory.D,
    E: GlyphFactory.E,
    F: GlyphFactory.F,
    G: GlyphFactory.G,
    H: GlyphFactory.H,
    I: GlyphFactory.I,
    J: GlyphFactory.J,
    K: GlyphFactory.K,
    L: GlyphFactory.L,
    M: GlyphFactory.M,
    N: GlyphFactory.N,
    O: GlyphFactory.O,
    P: GlyphFactory.P,
    Q: GlyphFactory.Q,
    R: GlyphFactory.R,
    S: GlyphFactory.S,
    T: GlyphFactory.T,
    U: GlyphFactory.U,
    V: GlyphFactory.V,
    W: GlyphFactory.W,
    X: GlyphFactory.X,
    Y: GlyphFactory.Y,
    Z: GlyphFactory.Z
  };

  static glyphFromChar(letter: string) {
    if (!GlyphFactory.singleton) {
      GlyphFactory.singleton = new GlyphFactory();
    }
    return GlyphFactory.singleton.letterToGlyphHM[letter];
  }

  private static A = (props: { [key: string]: string }) => (
    <g key={props.key + "_g"}>
      <path
        {...props}
        d="M 0 100 L 33 0 L 66 0 L 100 100 L 75 100 L 66 75 L 33 75 L 25 100 L 0 100"
      />
      <path
        key={props.key + "_p2"}
        transform={props.transform}
        fill="#ffffff"
        d="M 41 55 L 50 25 L 58 55 L 41 55"
      />
    </g>
  );

  private static B = (props: { [key: string]: string }) => (
    <g key={props.key + "_g"}>
      <path
        {...props}
        d="M 0 0 L 80 0 C 105 0 105 50 80 50 C 105 50 105 100 80 100 L 00 100 L 0 0"
      />
      <path
        key={props.key + "_p2"}
        transform={props.transform}
        d="M 20 15 L 70 15 C 80 15 80 35 70 35 L 20 35 L 20 15"
        fill="#ffffff"
      />
      <path
        key={props.key + "_p3"}
        transform={props.transform}
        d="M 20 65 L 70 65 C 80 65 80 85 70 85 L 20 85 L 20 65"
        fill="#ffffff"
      />
    </g>
  );

  private static C = (props: { [key: string]: string }) => (
    <path
      {...props}
      d="M 100 28 C 100 -13 0 -13 0 50
      C 0 113 100 113 100 72 L 75 72
      C 75 90 30 90 30 50 C 30 10 75 10 75 28
      L 100 28"
    />
  );

  private static D = (props: { [key: string]: string }) => (
    <g key={props.key + "_g"}>
      <path {...props} d="M 0 0 L 60 0 C 110 0 110 100 60 100 L 0 100 L 0 0" />
      <path
        key={props.key + "_p2"}
        transform={props.transform}
        fill="#ffffff"
        d="M 20 15 L 40 15 C 85 15 85 85 40 85 L 20 85 L 20 15"
      />
    </g>
  );

  private static E = (props: { [key: string]: string }) => (
    <path
      {...props}
      d="M 0 0 L 100 0 L 100 20 L 20 20 L 20 40 L 90 40 L 90 60 L 20 60 L 20 80 L 100 80 L 100 100 L 0 100 L 0 0"
    />
  );

  private static F = (props: { [key: string]: string }) => (
    <path
      {...props}
      d="M 0 0 L 100 0 L 100 20 L 20 20 L 20 40 L 80 40 L 80 60 L 20 60 L 20 100 L 0 100 L 0 0"
    />
  );

  private static G = (props: { [key: string]: string }) => (
    <path
      {...props}
      d="M 100 28 C 100 -13 0 -13 0 50 C 0 113 100 113 100 72 L 100 48 L 55 48 L 55 72 L 75 72 C 75 90 30 90 30 50 C 30 10 75 5 75 28 L 100 28"
    />
  );

  private static H = (props: { [key: string]: string }) => (
    <path
      {...props}
      d="M 0 0 L 20 0 L 20 40 L 80 40 L 80 0 L 100 0 L 100 100 L 80 100 L 80 60 L 20 60 L 20 100 L 0 100 L 0 0"
    />
  );

  private static I = (props: { [key: string]: string }) => (
    <path {...props} d="M 40 0 L 60 0 L 60 100 L 40 100 L 40 0" />
  );

  private static J = (props: { [key: string]: string }) => (
    <path
      {...props}
      d="M 0 60 C 0 111 100 111 100 60 L 100 0 L 75 0 L 75 60 C 80 90 20 90 25 60"
    />
  );

  private static K = (props: { [key: string]: string }) => (
    <path
      {...props}
      d="M 0 0 L 20 0 L 20 40 L 75 0 L 100 0 L 50 50 L 100 100 L 75 100 L 30 65 L 20 75 L 20 100 L 0 100 L 0 0"
    />
  );

  private static L = (props: { [key: string]: string }) => (
    <path
      {...props}
      d="M 0 0 L 0 100 L 100 100 L 100 80 L 20 80 L 20 0 L 0 0"
    />
  );

  private static M = (props: { [key: string]: string }) => (
    <path
      {...props}
      d="M 0 0 L 20 0 L 50 35 L 80 0 L 100 0 L 100 100 L 80 100 L 80 30 L 50 65 L 20 30 L 20 100 L 0 100 L 0 0"
    />
  );

  private static N = (props: { [key: string]: string }) => (
    <path
      {...props}
      d="M 0 100 L 0 0 L 20 0 L 80 75 L 80 0 L 100 0 L 100 100 L 80 100 L 20 25 L 20 100 L 0 100"
    />
  );

  private static O = (props: { [key: string]: string }) => (
    <g key={props.key + "_g"}>
      <circle cx="50" cy="50" r="50" {...props} />
      <circle
        key={props.key + "_c2"}
        transform={props.transform}
        cx="50"
        cy="50"
        r="32"
        fill="#ffffff"
      />
    </g>
  );

  private static P = (props: { [key: string]: string }) => (
    <g key={props.key + "_g"}>
      <path
        {...props}
        d="M 0 0 L 80 0 C 105 0 105 50 80 50 L 20 50 L 20 100 L 0 100 L 0 0"
      />
      <path
        key={props.key + "_p2"}
        transform={props.transform}
        fill="#ffffff"
        d="M 20 15 L 70 15 C 80 15 80 35 70 35 L 20 35 L 20 15"
      />
    </g>
  );

  private static Q = (props: { [key: string]: string }) => (
    <g key={props.key + "_g"}>
      <circle
        cx="50"
        cy="50"
        r="50"
        {...{ ...props, key: props.key + "_c1" }}
      />
      <circle
        key={props.key + "_c2"}
        transform={props.transform}
        cx="50"
        cy="50"
        r="32"
        fill="#ffffff"
      />
      <path d="M 85 100 L 55 70 L 70 55 L 100 85 L 85 100" {...props} />
    </g>
  );

  private static R = (props: { [key: string]: string }) => (
    <g key={props.key + "_g"}>
      <path
        {...props}
        d="M 0 0 L 80 0 C 105 0 105 50 80 50 C 100 50 100 70 100 70 L 100 100 L 80 100 L 80 80 C 80 80 80 60 50 60 L 20 60 L 20 100 L 0 100 L 0 0"
      />
      <path
        key={props.key + "_p2"}
        transform={props.transform}
        fill="#ffffff"
        d="M 20 15 L 70 15 C 80 15 80 35 70 35 L 20 35 L 20 15"
      />
    </g>
  );

  /**
   *NOTE: Requires "stroke" and "strokeOpacity" instead of just the fill prop.
   */
  private static S = (props: { [key: string]: string }) => {
    if (!props.stroke) {
      props.stroke = props.fill;
    }
    if (!props.strokeOpacity) {
      props.strokeOpacity = props.fillOpacity;
    }

    return (
      <path
        fill="#ffffff"
        {...props}
        strokeWidth="18"
        d="M92 26 A43 20 0 1 0 43 46 A42 23 0 1 1 9 68"
      />
    );
  };

  private static T = (props: { [key: string]: string }) => (
    <path
      {...props}
      d="M 0 0 L 0 20 L 35 20 L 35 100 L 65 100 L 65 20 L 100 20 L 100 0 L 0 0"
    />
  );

  private static U = (props: { [key: string]: string }) => (
    <path
      {...props}
      d="M 0 0 L 0 60 C 0 111 100 111 100 60 L 100 0 L 75 0 L 75 60 C 80 90 20 90 25 60 L 25 0 L 0 0"
    />
  );

  private static V = (props: { [key: string]: string }) => (
    <path
      {...props}
      d="M 0 0 L 20 0 L 50 80 L 80 0 L 100 0 L 60 100 L 40 100 L 0 0"
    />
  );

  private static W = (props: { [key: string]: string }) => (
    <path
      {...props}
      d="M 0 0 L 20 0 L 30 70 L 50 30 L 70 70 L 80 0 L 100 0 L 90 100 L 70 100 L 50 65 L 30 100 L 10 100 L 0 0"
    />
  );

  private static X = (props: { [key: string]: string }) => (
    <path
      {...props}
      d="M 0 0 L 20 0 L 50 40 L 80 0 L 100 0 L 70 50 L 100 100 L 80 100 L 50 60 L 20 100 L 0 100 L 30 50 L 0 0"
    />
  );

  private static Y = (props: { [key: string]: string }) => (
    <path
      {...props}
      d="M 0 0 L 20 0 L 50 45 L 80 0 L 100 0 L 60 60 L 60 100 L 40 100 L 40 60 L 0 0"
    />
  );

  private static Z = (props: { [key: string]: string }) => (
    <path
      {...props}
      d="M 0 0 L 100 0 L 100 20 L 35 80 L 100 80 L 100 100 L 0 100 L 0 80 L 65 20 L 0 20 L 0 0"
    />
  );
}
