import "jest-webgl-canvas-mock";
import * as React from "react";

import { shallow, mount } from "enzyme";

import { AceConsensusSequenceComponent } from "../AceConsensusSequenceComponent";
import { Alignment } from "../../common/Alignment";
import { Ace, default as ace } from "ace-builds";
import { SequenceSorter } from "../../common/AlignmentSorter";

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

describe("AceConsensusSequenceComponent", () => {
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
      <AceConsensusSequenceComponent
        id="test-id"
        text={"testing"}
        fontSize={3}
        alignment={new Alignment("", [])}
        sortBy={SequenceSorter.INPUT}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });

  it("Should invoke the loaded callback when the Ace editor is loaded.", () => {
    mount(
      <AceConsensusSequenceComponent
        editorLoaded={editorLoadedSpy}
        alignment={
          new Alignment("test-alignment", [
            { id: "Query", sequence: "ATGCC" },
            { id: "Psychic", sequence: "ATGCC" },
          ])
        }
        fontSize={4}
        id={"ace-msa-editor"}
        sortBy={SequenceSorter.INPUT}
      />
    );
    expect(editorLoadedSpy).toHaveBeenCalled();
    expect(editorLoadedSpy.mock.calls[0][0]).toEqual(editor);
  });
});
