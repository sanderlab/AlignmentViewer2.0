import * as React from "react";
import { shallow, default as Enzyme } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
import "jest-canvas-mock";

import Alignment from "../Alignment";
import { AceMSAComponent, AceEditorTypes } from "../AceMSAComponent";

describe("AceMSAComponent", () => {
  beforeAll(() => {
    Enzyme.configure({ adapter: new Adapter() });
  });
  it("Should render when given default props.", () => {
    const wrapper = shallow(
      <AceMSAComponent
        editorLoaded={jest.fn()}
        alignment={new Alignment("", [])}
        fontSize={4}
        id={"ace-msa-editor"}
        type={AceEditorTypes.alignment}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });

  it.each([0, 1, 2, 3])(
    "Should render for an ace editor of type '%i'",
    editor => {
      console.log(editor);
      const wrapper = shallow(
        <AceMSAComponent
          editorLoaded={jest.fn()}
          alignment={new Alignment("", [])}
          fontSize={4}
          id={"ace-msa-editor"}
          type={editor}
        />
      );
      expect(wrapper).toMatchSnapshot();
    }
  );
});
