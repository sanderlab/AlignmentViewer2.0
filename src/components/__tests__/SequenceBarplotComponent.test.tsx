import "jest-webgl-canvas-mock";
import * as React from "react";

import { shallow } from "enzyme";
import { Alignment } from "../../common/Alignment";
import { PositionalBarplot, PreconfiguredPositionalBarplots } from "../PositionalBarplotHook";

describe("PositionalBarplot", () => {
  it("Should render when given default props.", () => {
    const wrapper = shallow(
      <PositionalBarplot
        positionWidth={3}
        alignment={new Alignment("", [], true)}
        dataSeriesSet={[PreconfiguredPositionalBarplots.ShannonEntropy]}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });
});
