import * as React from "react";
import { shallow, default as Enzyme } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
import "jest-canvas-mock";

import { AceEditorComponent } from "../AceEditorComponent";

describe("AceEditorComponent", () => {
  beforeAll(() => {
    Enzyme.configure({ adapter: new Adapter() });
  });
  it("Should render", () => {
    const wrapper = shallow(
      <AceEditorComponent text={"Test Text"} mouseMove={jest.fn()} />
    );
    expect(wrapper).toMatchSnapshot();
  });
});
