import "jest-webgl-canvas-mock";
import * as React from "react";

import { shallow } from "enzyme";
import { Alignment } from "../../common/Alignment";
import { SequenceLogoComponent, LOGO_TYPES } from "../SequenceLogoComponent";

jest.mock("../MolecularStyles.module.scss", () => {
  return {
    aaStyBackgroundAlpha_Default: 0.25,
    aaStyDefaultLetterColor_Default: "#ffffff",
    aaStyClass_Default: "mock-aa-class",
    aaStyColorOrder_Default: "",
    aaStyColors_Default: "",
    aaStyBackgroundColorsLightTheme_Default: "",
    aaStyLetterColorsDarkTheme_Default: "",
    aaStyDesc_Default: "mock-aa-style-desc",
    ntStyBackgroundAlpha_Default: 0.25,
    ntStyDefaultLetterColor_Default: "#ffffff",
    ntStyClass_Default: "mock-nt-class",
    ntStyColorOrder_Default: "",
    ntStyColors_Default: "",
    ntStyBackgroundColorsLightTheme_Default: "",
    ntStyLetterColorsDarkTheme_Default: "",
    ntStyDesc_Default: "mock-nt-style-desc",
  };
});

describe("SequenceLogoComponent", () => {
  it("Should render when given default props.", () => {
    const wrapper = shallow(
      <SequenceLogoComponent
        alignment={
          new Alignment("my-alignment", [
            { id: "my-alignment-1", sequence: "CDE" },
            { id: "my-alignment-2", sequence: "EDC" },
          ])
        }
        style={new Alignment("my-alignment", [
          { id: "my-alignment-1", sequence: "CDE" },
          { id: "my-alignment-2", sequence: "EDC" },
        ]).getDefaultStyle()}
        glyphWidth={3}
        logoType={LOGO_TYPES.BARS}
        scrollerLoaded={() => {}}
        scrollerUnloaded={() => {}}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });

  it("Should render when given a basic alignment.", () => {
    const wrapper = shallow(
      <SequenceLogoComponent
        alignment={
          new Alignment("my-alignment", [
            { id: "my-alignment-1", sequence: "CDE" },
            { id: "my-alignment-2", sequence: "EDC" },
          ])
        }
        style={new Alignment("my-alignment", [
          { id: "my-alignment-1", sequence: "CDE" },
          { id: "my-alignment-2", sequence: "EDC" },
        ]).getDefaultStyle()}
        glyphWidth={3}
        logoType={LOGO_TYPES.BARS}
        scrollerLoaded={() => {}}
        scrollerUnloaded={() => {}}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });
});
