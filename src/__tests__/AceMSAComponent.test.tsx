import { Ace, default as ace } from "ace-builds";
import "jest-webgl-canvas-mock";
import * as React from "react";

import Alignment, { SequenceSortOptions } from "../Alignment";
import { AceMSAComponent, AceEditorTypes } from "../AceMSAComponent";

import { mount, shallow, default as Enzyme } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
Enzyme.configure({ adapter: new Adapter() });

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
    ntStyDesc_Default: ""
  };
});

describe("AceMSAComponent", () => {
  let editor: Ace.Editor;
  let editorLoadedSpy: jest.Mock;

  beforeEach(() => {
    jest.clearAllTimers();
    jest.useFakeTimers();
    editorLoadedSpy = jest.fn(e => {
      expect(e).not.toBeUndefined();
      expect(e).not.toBeNull();
      editor = ace.edit(e);
      expect(editor).not.toBeUndefined();
      expect(editor).not.toBeNull();
    });
  });

  it("Should render when given default props.", () => {
    const wrapper = shallow(
      <AceMSAComponent
        editorLoaded={jest.fn()}
        alignment={new Alignment("", [])}
        fontSize={4}
        id={"ace-msa-editor"}
        type={AceEditorTypes.alignment}
        sortBy={SequenceSortOptions.INPUT}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });

  it("Should invoke the loaded callback when the Ace editor is loaded.", () => {
    mount(
      <AceMSAComponent
        editorLoaded={editorLoadedSpy}
        alignment={
          new Alignment("test-alignment", [{ id: "Psychic", sequence: "ABRA" }])
        }
        fontSize={4}
        id={"ace-msa-editor"}
        type={AceEditorTypes.alignment}
        sortBy={SequenceSortOptions.INPUT}
      />
    );
    expect(editorLoadedSpy).toHaveBeenCalled();

    expect(editorLoadedSpy.mock.calls[0][0]).toEqual(editor);
  });

  it("Should correctly generate a Textual Ruler for when there are no characters.", () => {
    expect(AceMSAComponent.generateTextualRuler(0)).toEqual(".");
  });

  it("Should correctly generate a empty Textual Ruler when there are negative characters.", () => {
    expect(AceMSAComponent.generateTextualRuler(-1)).toEqual("");
  });

  it("Should correctly generate a Textual Ruler when there are some characters.", () => {
    let expected = "..";
    expect(AceMSAComponent.generateTextualRuler(1)).toEqual(expected);

    expected = "...";
    expect(AceMSAComponent.generateTextualRuler(2)).toEqual(expected);

    expected = "....:.";
    expect(AceMSAComponent.generateTextualRuler(5)).toEqual(expected);

    expected = "....:..10|.";
    expect(AceMSAComponent.generateTextualRuler(10)).toEqual(expected);

    expected = "....:..10|....:..20|.";
    expect(AceMSAComponent.generateTextualRuler(20)).toEqual(expected);
  });

  it.each([
    AceEditorTypes.alignment,
    AceEditorTypes.consensus,
    AceEditorTypes.position,
    AceEditorTypes.query
  ])("Should render for an ace editor of type '%i'", editor => {
    const wrapper = shallow(
      <AceMSAComponent
        editorLoaded={jest.fn()}
        alignment={new Alignment("", [])}
        fontSize={4}
        id={"ace-msa-editor"}
        type={editor}
        sortBy={SequenceSortOptions.INPUT}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });
});
