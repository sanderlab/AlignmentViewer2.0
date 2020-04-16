import "jest-webgl-canvas-mock";
import * as React from "react";

import { mount, shallow } from "enzyme";

import { Alignment, SequenceSortOptions } from "../../common/Alignment";
import { AlignmentCanvasComponent } from "../../components/AlignmentCanvasComponent";
import {
  AlignmentTypes,
  PositionsToStyle,
  ALL_AMINOACID_COLORSCHEMES,
  ALL_NUCLEOTIDE_COLORSCHEMES,
} from "../../common/MolecularStyles";

// Due to the runtime necessities of using styles, we need to explicitly mock out some stub data.
// https://github.com/facebook/jest/issues/3094
jest.mock("../MolecularStyles.module.scss", () => {
  return {
    aaStyBGAlpha_Default: 0,
    aaStyClass_Default: "mock-aa-class",
    aaStyColorOrder_Default: "",
    aaStyColors_Default: "",
    aaStyDesc_Default: "mock-aa-style-desc",
    ntStyBGAlpha_Default: "",
    ntStyClass_Default: "mock-nt-class",
    ntStyColorOrder_Default: "",
    ntStyColors_Default: "",
    ntStyDesc_Default: "mock-nt-style-desc",
  };
});

describe("AlignmentCanvasComponent", () => {
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
      <AlignmentCanvasComponent
        alignment={new Alignment("My-Alignment", [])}
        alignmentType={AlignmentTypes.AMINOACID}
        positionsToStyle={PositionsToStyle.ALL}
        colorScheme={ALL_AMINOACID_COLORSCHEMES[0]}
        sortBy={SequenceSortOptions.INPUT}
        id={"My-Alignment-ID"}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });

  it("Should match the mounted snapshot.", () => {
    const wrapper = mount(
      <AlignmentCanvasComponent
        alignment={new Alignment("My-Alignment", [])}
        alignmentType={AlignmentTypes.AMINOACID}
        positionsToStyle={PositionsToStyle.ALL}
        colorScheme={ALL_AMINOACID_COLORSCHEMES[0]}
        sortBy={SequenceSortOptions.INPUT}
        id={"My-Alignment-ID"}
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
      <AlignmentCanvasComponent
        alignment={new Alignment("My-Alignment", sequences)}
        alignmentType={AlignmentTypes.AMINOACID}
        positionsToStyle={PositionsToStyle.ALL}
        colorScheme={ALL_AMINOACID_COLORSCHEMES[0]}
        sortBy={SequenceSortOptions.INPUT}
        id={"My-Alignment-ID"}
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
        <AlignmentCanvasComponent
          alignment={new Alignment("My-Alignment", sequences)}
          alignmentType={AlignmentTypes.AMINOACID}
          positionsToStyle={positionsToStyle}
          colorScheme={ALL_AMINOACID_COLORSCHEMES[0]}
          sortBy={SequenceSortOptions.INPUT}
          id={"Amino Acids"}
        />
      );
      const nucleotideWrapper = mount(
        <AlignmentCanvasComponent
          alignment={new Alignment("My-Alignment", sequences)}
          alignmentType={AlignmentTypes.NUCLEOTIDE}
          positionsToStyle={positionsToStyle}
          colorScheme={ALL_NUCLEOTIDE_COLORSCHEMES[0]}
          sortBy={SequenceSortOptions.INPUT}
          id={"Nucleotides"}
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
      <AlignmentCanvasComponent
        alignment={new Alignment("My-Alignment", sequences)}
        alignmentType={AlignmentTypes.NUCLEOTIDE}
        positionsToStyle={PositionsToStyle.ALL}
        colorScheme={ALL_NUCLEOTIDE_COLORSCHEMES[0]}
        sortBy={SequenceSortOptions.INPUT}
        id={"My-Alignment-ID"}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });

  // Skipping for performance!
  it.skip("Should handle a supersized sequence.", () => {
    const sequences = new Array();
    const expectedHeight = 1000;
    const expectedWidth = 1000;
    for (let i = 0; i < expectedHeight; ++i) {
      sequences.push(generateSequence(`big-sequence-${i}`, expectedWidth));
    }
    const wrapper = mount(
      <AlignmentCanvasComponent
        alignment={new Alignment("My-Alignment", sequences)}
        alignmentType={AlignmentTypes.AMINOACID}
        positionsToStyle={PositionsToStyle.ALL}
        colorScheme={ALL_AMINOACID_COLORSCHEMES[0]}
        sortBy={SequenceSortOptions.INPUT}
        id={"My-Alignment-ID"}
      />
    );
    const instance = wrapper.instance() as AlignmentCanvasComponent;
    expect(instance.app).not.toBeUndefined();
    expect(instance.app.stage.width).toEqual(expectedWidth);
    expect(instance.app.stage.height).toEqual(expectedHeight);
  });
});
