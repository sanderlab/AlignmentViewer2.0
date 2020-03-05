import * as React from "react";
import { shallow, default as Enzyme } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
import "jest-canvas-mock";

Enzyme.configure({ adapter: new Adapter() });
import { GlyphFactory } from "../SequenceLogoGlyphs";

describe("SequenceLogoGlyphs", () => {
  beforeEach(() => {
    jest.doMock("pixi.js");
  });

  it.each([
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z"
  ])("Should render the correct glyph for '%s'", char => {
    const glyph = GlyphFactory.glyphFromChar(char)({
      className: `class-name-for-${char}`,
      key: `key-for-${char}`
    });
    const wrapper = shallow(glyph);
    expect(wrapper).toMatchSnapshot();
  });
});
