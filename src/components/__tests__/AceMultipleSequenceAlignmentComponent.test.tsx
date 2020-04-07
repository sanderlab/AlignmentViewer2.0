import "jest-webgl-canvas-mock";
import * as React from "react";

import { shallow, default as Enzyme, mount } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
Enzyme.configure({ adapter: new Adapter() });

import AceMultipleSequenceAlignmentComponent from "../AceMultipleSequenceAlignmentComponent";
import Alignment, { SequenceSortOptions } from "../../common/Alignment";
import { Ace, default as ace } from "ace-builds";

// Due to the runtime necessities of using styles, we need to explicitly mock out some stub data.
// https://github.com/facebook/jest/issues/3094
jest.mock("../MolecularStyles.module.scss", () => {
  return {
    aaStyBGAlpha_Default: "",
    aaStyClass_Default: "",
    aaStyColorOrder_Default: "",
    aaStyColors_Default: "",
    aaStyDesc_Default: "",
    ntStyBGAlpha_Default: "",
    ntStyClass_Default: "",
    ntStyColorOrder_Default: "",
    ntStyColors_Default: "",
    ntStyDesc_Default: "",
  };
});

describe("AceMultipleSequenceAlignmentComponent", () => {
  let editor: Ace.Editor;
  let editorLoadedSpy: jest.Mock;

  beforeEach(() => {
    jest.clearAllTimers();
    jest.useFakeTimers();
    editorLoadedSpy = jest.fn((e) => {
      expect(e).not.toBeUndefined();
      expect(e).not.toBeNull();
      editor = ace.edit(e);
      expect(editor).not.toBeUndefined();
      expect(editor).not.toBeNull();
    });
  });

  it("Should render when given default props", () => {
    const wrapper = shallow(
      <AceMultipleSequenceAlignmentComponent
        id="test-id"
        text={"testing"}
        fontSize={3}
        alignment={new Alignment("", [])}
        sortBy={SequenceSortOptions.INPUT}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });

  it("Should invoke the loaded callback when the Ace editor is loaded.", () => {
    mount(
      <AceMultipleSequenceAlignmentComponent
        editorLoaded={editorLoadedSpy}
        alignment={
          new Alignment("test-alignment", [{ id: "Psychic", sequence: "ABRA" }])
        }
        fontSize={4}
        id={"ace-msa-editor"}
        sortBy={SequenceSortOptions.INPUT}
      />
    );
    expect(editorLoadedSpy).toHaveBeenCalled();
    expect(editorLoadedSpy.mock.calls[0][0]).toEqual(editor);
  });
});
