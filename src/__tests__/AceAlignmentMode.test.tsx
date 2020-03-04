import * as React from "react";
import { shallow } from "enzyme";
import "jest-canvas-mock";
import Enzyme from "enzyme";
import Adapter from "enzyme-adapter-react-16";

Enzyme.configure({ adapter: new Adapter() });
import { default as Alignment } from "../Alignment";
import { AlignmentCanvasComponent } from "../AlignmentCanvasComponent";
import {
  AlignmentTypes,
  PositionsToStyle,
  ALL_AMINOACID_COLORSCHEMES
} from "../MolecularStyles";

describe("AlignmentCanvasComponent", () => {
  beforeEach(() => {
    jest.doMock("pixi.js");
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
