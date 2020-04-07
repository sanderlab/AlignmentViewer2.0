import "jest-webgl-canvas-mock";
import * as React from "react";

import { shallow, default as Enzyme } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
Enzyme.configure({ adapter: new Adapter() });

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
