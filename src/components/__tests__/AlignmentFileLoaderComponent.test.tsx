import "jest-webgl-canvas-mock";
import * as React from "react";

import { shallow } from "enzyme";

import { AlignmentFileLoaderComponent } from "../AlignmentFileLoaderComponent";

// Due to the runtime necessities of using styles, we need to explicitly mock out some stub data.
// https://github.com/facebook/jest/issues/3094
jest.mock("../MolecularStyles.module.scss", () => {
  return {
    aaStyBGAlpha_Default: 0,
    aaStyClass_Default: "mock-aa-class",
    aaStyColorOrder_Default: "",
    aaStyColors_Default: "",
    aaStyDesc_Default: "mock-aa-style-desc",
    ntStyBGAlpha_Default: "",
    ntStyClass_Default: "mock-nt-class",
    ntStyColorOrder_Default: "",
    ntStyColors_Default: "",
    ntStyDesc_Default: "mock-nt-style-desc",
  };
});

describe("AlignmentFileLoaderComponent", () => {
  it("Should render with minimal props.", () => {
    const wrapper = shallow(
      <AlignmentFileLoaderComponent
        fileSelectorLabelText="text"
        onAlignmentLoaded={() => {}}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });
});
