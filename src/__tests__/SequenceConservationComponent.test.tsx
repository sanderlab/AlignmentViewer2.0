import * as React from "react";
import { shallow, default as Enzyme } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
import "jest-canvas-mock";

import Alignment from "../Alignment";
import { SequenceConservationComponent } from "../SequenceConservationComponent";

describe("SequenceConservationComponent", () => {
  beforeAll(() => {
    Enzyme.configure({ adapter: new Adapter() });
  });

  it("Should render when given default props.", () => {
    const wrapper = shallow(
      <SequenceConservationComponent
        characterWidth={3}
        conservationPlotLoaded={jest.fn()}
        alignment={new Alignment("", [])}
        id={"test-sequence-logo-component"}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });
});
