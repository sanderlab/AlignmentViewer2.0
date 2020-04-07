import "jest-webgl-canvas-mock";
import * as React from "react";

import MiniMapComponent from "../MiniMapComponent";

import { mount, shallow, default as Enzyme } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
import Alignment, { SequenceSortOptions } from "../../common/Alignment";
import {
  PositionsToStyle,
  AlignmentStyle,
  AlignmentTypes,
} from "../../common/MolecularStyles";
Enzyme.configure({ adapter: new Adapter() });

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

describe("MiniMap", () => {
  it("Should render with default props.", () => {
    const wrapper = shallow(
      <MiniMapComponent
        alignment={new Alignment("", [])}
        style={AlignmentStyle.fromAlignmentType(AlignmentTypes.AMINOACID)}
        sortBy={SequenceSortOptions.INPUT}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });
});
