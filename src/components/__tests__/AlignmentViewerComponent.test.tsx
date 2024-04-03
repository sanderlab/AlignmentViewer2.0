import "jest-webgl-canvas-mock";
import * as React from "react";

import { shallow } from "enzyme";

import { Alignment } from "../../common/Alignment";
import { AlignmentViewer } from "../AlignmentViewerHook";
import { AlignmentStyle, AlignmentTypes } from "../../common/MolecularStyles";
import { LOGO_TYPES } from "../SequenceLogoHook";
import { SequenceSorter } from "../../common/AlignmentSorter";

// Due to the runtime necessities of using styles, we need to explicitly mock out some stub data.
// https://github.com/facebook/jest/issues/3094
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

describe("AlignmentViewer", () => {
  it("Should render", () => {
    const wrapper = shallow(
      <AlignmentViewer
        alignment={new Alignment("", [], true)}
        style={AlignmentStyle.fromAlignmentType(AlignmentTypes.NUCLEOTIDE)}
        zoomLevel={0}
        sortBy={SequenceSorter.INPUT}
        showLogo={true}
        logoOptions={{
          logoType: LOGO_TYPES.BARS,
        }}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });
});
