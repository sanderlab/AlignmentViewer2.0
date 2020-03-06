import * as React from "react";
import { shallow, default as Enzyme } from "enzyme";
import "jest-canvas-mock";
import Adapter from "enzyme-adapter-react-16";

import Alignment from "../Alignment";
import { AlignmentCanvasComponent } from "../AlignmentCanvasComponent";
import {
  AlignmentTypes,
  PositionsToStyle,
  ALL_AMINOACID_COLORSCHEMES
} from "../MolecularStyles";

describe("AlignmentCanvasComponent", () => {
  beforeAll(() => {
    Enzyme.configure({ adapter: new Adapter() });
  });
  it("Should render", () => {
    const wrapper = shallow(
      <AlignmentCanvasComponent
        alignment={new Alignment("My-Alignment", [])}
        alignmentType={AlignmentTypes.AMINOACID}
        positionsToStyle={PositionsToStyle.ALL}
        colorScheme={ALL_AMINOACID_COLORSCHEMES[0]}
        id={"My-Alignment-ID"}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });
});
