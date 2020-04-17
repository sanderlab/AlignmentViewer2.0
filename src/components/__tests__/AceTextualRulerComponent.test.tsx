import { Ace, default as ace } from "ace-builds";
import "jest-webgl-canvas-mock";
import * as React from "react";

import { mount, shallow } from "enzyme";
import { Alignment, SequenceSortOptions } from "../../common/Alignment";
import AceTextualRulerComponent from "../AceTextualRulerComponent";

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

describe("AceTextualRulerComponent", () => {
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

  it("Should render when given default props.", () => {
    const wrapper = shallow(
      <AceTextualRulerComponent
        editorLoaded={jest.fn()}
        alignment={new Alignment("", [])}
        fontSize={4}
        id={"ace-msa-editor"}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });

  it("Should invoke the loaded callback when the Ace editor is loaded.", () => {
    mount(
      <AceTextualRulerComponent
        editorLoaded={editorLoadedSpy}
        alignment={
          new Alignment("test-alignment", [{ id: "Psychic", sequence: "ABRA" }])
        }
        fontSize={4}
        id={"ace-msa-editor"}
      />
    );
    expect(editorLoadedSpy).toHaveBeenCalled();
    expect(editorLoadedSpy.mock.calls[0][0]).toEqual(editor);
  });

  it("Should correctly generate a Textual Ruler for when there are no characters.", () => {
    expect(AceTextualRulerComponent.generateTextualRuler(0)).toEqual(".");
  });

  it("Should correctly generate a empty Textual Ruler when there are negative characters.", () => {
    expect(AceTextualRulerComponent.generateTextualRuler(-1)).toEqual("");
  });

  it("Should correctly generate a Textual Ruler when there are some characters.", () => {
    let expected = "..";
    expect(AceTextualRulerComponent.generateTextualRuler(1)).toEqual(expected);

    expected = "...";
    expect(AceTextualRulerComponent.generateTextualRuler(2)).toEqual(expected);

    expected = "....:.";
    expect(AceTextualRulerComponent.generateTextualRuler(5)).toEqual(expected);

    expected = "....:..10|.";
    expect(AceTextualRulerComponent.generateTextualRuler(10)).toEqual(expected);

    expected = "....:..10|....:..20|.";
    expect(AceTextualRulerComponent.generateTextualRuler(20)).toEqual(expected);
  });
});
