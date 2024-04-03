import "jest-webgl-canvas-mock";
import * as React from "react";

import { mount, shallow } from "enzyme";

import { Alignment } from "../../common/Alignment";
import { CanvasAlignmentComponent } from "../../components/deprecated/CanvasAlignmentComponent";
import {
  AlignmentTypes,
  PositionsToStyle,
  ALL_AMINOACID_COLORSCHEMES,
  ALL_NUCLEOTIDE_COLORSCHEMES,
} from "../../common/MolecularStyles";
import { SequenceSorter } from "../../common/AlignmentSorter";

// Due to the runtime necessities of using styles, we need to explicitly mock out some stub data.
// https://github.com/facebook/jest/issues/3094
jest.mock("../MolecularStyles.module.scss", () => {
  return {
    aaStyBackgroundAlpha_Default: 0.25,
    aaStyDefaultLetterColor_Default: "#ffffff",
    aaStyClass_Default: "mock-aa-class",
    aaStyColorOrder_Default: "",
    aaStyColors_Default: "",
    aaStyBackgroundColorsLightTheme_Default: "",
    aaStyLetterColorsDarkTheme_Default: "",
    aaStyDesc_Default: "mock-aa-style-desc",
    ntStyBackgroundAlpha_Default: 0.25,
    ntStyDefaultLetterColor_Default: "#ffffff",
    ntStyClass_Default: "mock-nt-class",
    ntStyColorOrder_Default: "",
    ntStyColors_Default: "",
    ntStyBackgroundColorsLightTheme_Default: "",
    ntStyLetterColorsDarkTheme_Default: "",
    ntStyDesc_Default: "mock-nt-style-desc",
  };
});

describe("CanvasAlignmentComponent", () => {
  const generateSequence = (id: string, length: number) => {
    let sequence = "";
    for (let i = 0; i < length; ++i) {
      sequence += String.fromCharCode((i % 26) + 65);
    }
    return {
      id,
      sequence,
    };
  };

  it("Should match the shallow snapshot.", () => {
    const wrapper = shallow(
      <CanvasAlignmentComponent
        alignment={
          new Alignment("My-Alignment", [{ id: "id", sequence: "atgc" }])
        }
        alignmentType={AlignmentTypes.AMINOACID}
        positionsToStyle={PositionsToStyle.ALL}
        colorScheme={ALL_AMINOACID_COLORSCHEMES[0]}
        sortBy={SequenceSorter.INPUT}
        stageWidth={1}
        stageHeight={1}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });

  it("Should match the mounted snapshot.", () => {
    const wrapper = mount(
      <CanvasAlignmentComponent
        alignment={
          new Alignment("My-Alignment", [{ id: "id", sequence: "atgc" }])
        }
        alignmentType={AlignmentTypes.AMINOACID}
        positionsToStyle={PositionsToStyle.ALL}
        colorScheme={ALL_AMINOACID_COLORSCHEMES[0]}
        sortBy={SequenceSorter.INPUT}
        stageWidth={1}
        stageHeight={1}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });

  it("Should match the mounted snapshot for a large sequence.", () => {
    const sequences = new Array();
    for (let i = 0; i < 10; ++i) {
      sequences.push(generateSequence(`big-sequence-${i}`, 26));
    }
    const wrapper = mount(
      <CanvasAlignmentComponent
        alignment={new Alignment("My-Alignment", sequences)}
        alignmentType={AlignmentTypes.AMINOACID}
        positionsToStyle={PositionsToStyle.ALL}
        colorScheme={ALL_AMINOACID_COLORSCHEMES[0]}
        sortBy={SequenceSorter.INPUT}
        stageWidth={1}
        stageHeight={1}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });

  it.each([
    PositionsToStyle.ALL,
    PositionsToStyle.CONSENSUS,
    PositionsToStyle.CONSENSUS_DIFF,
    PositionsToStyle.QUERY,
    PositionsToStyle.QUERY_DIFF,
  ])(
    "Should match the snapshot when styling the %s position.",
    (positionsToStyle) => {
      const sequences = new Array();
      for (let i = 0; i < 10; ++i) {
        sequences.push(generateSequence(`sequence-${i}`, 2));
      }
      const aminoWrapper = mount(
        <CanvasAlignmentComponent
          alignment={
            new Alignment("My-Alignment", [{ id: "id", sequence: "atgc" }])
          }
          alignmentType={AlignmentTypes.AMINOACID}
          positionsToStyle={positionsToStyle}
          colorScheme={ALL_AMINOACID_COLORSCHEMES[0]}
          sortBy={SequenceSorter.INPUT}
          stageWidth={1}
          stageHeight={1}
        />
      );
      const nucleotideWrapper = mount(
        <CanvasAlignmentComponent
          alignment={
            new Alignment("My-Alignment", [{ id: "id", sequence: "atgc" }])
          }
          alignmentType={AlignmentTypes.NUCLEOTIDE}
          positionsToStyle={positionsToStyle}
          colorScheme={ALL_NUCLEOTIDE_COLORSCHEMES[0]}
          sortBy={SequenceSorter.INPUT}
          stageWidth={1}
          stageHeight={1}
        />
      );
      expect(aminoWrapper).toMatchSnapshot();
      expect(nucleotideWrapper).toMatchSnapshot();
    }
  );

  it("Should match the mounted snapshot when doing a nucleotide alignment.", () => {
    const sequences = new Array();
    for (let i = 0; i < 10; ++i) {
      sequences.push(generateSequence(`nt-sequence-${i}`, 26));
    }
    const wrapper = mount(
      <CanvasAlignmentComponent
        alignment={new Alignment("My-Alignment", sequences)}
        alignmentType={AlignmentTypes.NUCLEOTIDE}
        positionsToStyle={PositionsToStyle.ALL}
        colorScheme={ALL_NUCLEOTIDE_COLORSCHEMES[0]}
        sortBy={SequenceSorter.INPUT}
        stageWidth={1}
        stageHeight={1}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });
});
