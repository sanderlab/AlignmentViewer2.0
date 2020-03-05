import * as React from "react";
import { shallow, default as Enzyme } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
import "jest-canvas-mock";

import Alignment from "../Alignment";
import { SequenceLogoComponent, LOGO_TYPES } from "../SequenceLogoComponent";

describe("SequenceLogoComponent", () => {
  beforeAll(() => {
    Enzyme.configure({ adapter: new Adapter() });
  });

  it("Should render when given default props.", () => {
    const wrapper = shallow(
      <SequenceLogoComponent
        alignment={new Alignment("", [])}
        glyphWidth={3}
        id={"test-sequence-logo-component"}
        logoType={LOGO_TYPES.BARS}
        logoLoaded={jest.fn()}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });
});
