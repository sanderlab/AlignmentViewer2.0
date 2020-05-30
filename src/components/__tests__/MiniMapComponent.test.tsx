import "jest-webgl-canvas-mock";
import * as React from "react";

import { shallow } from "enzyme";

import { MiniMapComponent } from "../MiniMapComponent";
import { Alignment } from "../../common/Alignment";
import { AlignmentStyle, AlignmentTypes } from "../../common/MolecularStyles";
import { SequenceSorter } from "../../common/AlignmentSorter";

// Due to the runtime necessities of using styles, we need to explicitly mock out some stub data.
// https://github.com/facebook/jest/issues/3094
jest.mock("../MolecularStyles.module.scss", () => {
  return {
    aaStyBGAlpha_Default: 0,
    aaStyClass_Default: "mock-aa-class",
    aaStyColorOrder_Default: "",
    aaStyColors_Default: "",
    aaStyBackgroundColorsLightTheme_Default: "",
    aaStyLetterColorsDarkTheme_Default: "",
    aaStyDesc_Default: "mock-aa-style-desc",
    ntStyBGAlpha_Default: "",
    ntStyClass_Default: "mock-nt-class",
    ntStyColorOrder_Default: "",
    ntStyColors_Default: "",
    ntStyBackgroundColorsLightTheme_Default: "",
    ntStyLetterColorsDarkTheme_Default: "",
    ntStyDesc_Default: "mock-nt-style-desc",
  };
});

describe("MiniMap", () => {
  it("Should render with default props.", () => {
    const wrapper = shallow(
      <MiniMapComponent
        alignment={new Alignment("", [])}
        alignmentStyle={AlignmentStyle.fromAlignmentType(
          AlignmentTypes.AMINOACID
        )}
        sortBy={SequenceSorter.INPUT}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });
});
