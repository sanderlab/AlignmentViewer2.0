import "jest-webgl-canvas-mock";
import * as React from "react";

import { shallow } from "enzyme";
import { Alignment } from "../../common/Alignment";
import { SequenceBarplotComponent } from "../SequenceBarplotComponent";

describe("SequenceBarplotComponent", () => {
  it("Should render when given default props.", () => {
    const wrapper = shallow(
      <SequenceBarplotComponent
        positionWidth={3}
        alignment={new Alignment("", [])}
        dataSeries={[SequenceBarplotComponent.SHANNON_ENTROPY_BARPLOT]}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });
});
