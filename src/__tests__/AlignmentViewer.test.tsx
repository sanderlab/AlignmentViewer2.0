import * as React from "react";
import { shallow, default as Enzyme } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
import "jest-canvas-mock";
import Alignment from "../Alignment";
import { AlignmentViewer } from "../AlignmentViewer";
import { AlignmentStyle, AlignmentTypes } from "../MolecularStyles";
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
    ntStyDesc_Default: ""
  };
});

describe("AlignmentViewer", () => {
  beforeAll(() => {
    Enzyme.configure({ adapter: new Adapter() });
  });

  it("Should render", () => {
    const wrapper = shallow(
      <AlignmentViewer
        alignment={new Alignment("", [])}
        style={AlignmentStyle.fromAlignmentType(AlignmentTypes.NUCLEOTIDE)}
        zoomLevel={0}
        logoPlotStyle={LOGO_TYPES.BARS}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });
});
