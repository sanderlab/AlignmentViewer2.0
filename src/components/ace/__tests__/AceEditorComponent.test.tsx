import "jest-webgl-canvas-mock";
import * as React from "react";

import { shallow } from "enzyme";

import { AceEditorComponent } from "../AceEditorComponent";

describe("AceEditorComponent", () => {
  it("Should render", () => {
    const wrapper = shallow(
      <AceEditorComponent
        id="test-id"
        text={"testing"}
        fontSize={3}
      ></AceEditorComponent>
    );
    expect(wrapper).toMatchSnapshot();
  });
});
