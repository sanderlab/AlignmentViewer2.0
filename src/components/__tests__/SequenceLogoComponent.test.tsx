import "jest-webgl-canvas-mock";
import * as React from "react";

import { shallow } from "enzyme";
import { Alignment } from "../../common/Alignment";
import { SequenceLogoComponent, LOGO_TYPES } from "../SequenceLogoComponent";

jest.mock("../MolecularStyles.module.scss", () => {
  return {
    aaStyBGAlpha_Default: "",
    aaStyClass_Default: "",
    aaStyColorOrder_Default: "",
    aaStyColors_Default: "",
    aaStyDesc_Default: "",
    ntStyBGAlpha_Default: "",
    ntStyClass_Default: "",
    ntStyColorOrder_Default: "",
    ntStyColors_Default: "",
    ntStyDesc_Default: "",
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
