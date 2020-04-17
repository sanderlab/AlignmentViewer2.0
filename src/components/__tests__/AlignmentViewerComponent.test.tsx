import "jest-webgl-canvas-mock";
import * as React from "react";

import { shallow } from "enzyme";

import { Alignment, SequenceSortOptions } from "../../common/Alignment";
import { AlignmentViewer } from "../AlignmentViewerComponent";
import { AlignmentStyle, AlignmentTypes } from "../../common/MolecularStyles";
import { LOGO_TYPES } from "../SequenceLogoComponent";

// Due to the runtime necessities of using styles, we need to explicitly mock out some stub data.
// https://github.com/facebook/jest/issues/3094
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

describe("AlignmentViewer", () => {
  it("Should render", () => {
    const wrapper = shallow(
      <AlignmentViewer
        alignment={new Alignment("", [])}
        style={AlignmentStyle.fromAlignmentType(AlignmentTypes.NUCLEOTIDE)}
        zoomLevel={0}
        sortBy={SequenceSortOptions.INPUT}
        logoPlotStyle={LOGO_TYPES.BARS}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });
});
