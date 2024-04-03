import "jest-webgl-canvas-mock";
import * as React from "react";

import { shallow } from "enzyme";
import { Provider } from "react-redux";

import { MiniMap } from "../MiniMapHook";
import { Alignment } from "../../../common/Alignment";
import {
  AlignmentStyle,
  AlignmentTypes,
} from "../../../common/MolecularStyles";
import { SequenceSorter } from "../../../common/AlignmentSorter";

import { store } from "../../../common/ReduxStore";

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

describe("MiniMap", () => {
  it("Should render with default props.", () => {
    const wrapper = shallow(
      <Provider store={store}>
        <MiniMap
          alignment={new Alignment("", [], true)}
          alignmentStyle={AlignmentStyle.fromAlignmentType(
            AlignmentTypes.AMINOACID
          )}
          sortBy={SequenceSorter.INPUT}
        />
      </Provider>
    );
    expect(wrapper).toMatchSnapshot();
  });
});
