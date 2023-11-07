import "jest-webgl-canvas-mock";
import {
  AlignmentStyle,
  AlignmentTypes,
  AminoAcidAlignmentStyle,
  NucleotideAlignmentStyle,
  PositionsToStyle,
  getLetterClassNames,
} from "../MolecularStyles";

describe("MolecularStyles", () => {
  it("Should get class names for Ace itself.", () => {
    let expected = "A preAceConsensusClass preAceQueryClass";
    expect(getLetterClassNames("A", true, true, true)).toEqual(expected);

    expected = "A preAceConsensusClass";
    expect(getLetterClassNames("A", true, false, true)).toEqual(expected);

    expected = "A";
    expect(getLetterClassNames("A", false, false, true)).toEqual(expected);

    expected = "A preAceQueryClass";
    expect(getLetterClassNames("A", false, true, true)).toEqual(expected);
  });

  it("Should get ace class names for non-ace request.", () => {
    let expected = "acePrefixA preAceConsensusClass preAceQueryClass";
    expect(getLetterClassNames("A", true, true, false)).toEqual(expected);

    expected = "acePrefixA preAceConsensusClass";
    expect(getLetterClassNames("A", true, false, false)).toEqual(expected);

    expected = "acePrefixA";
    expect(getLetterClassNames("A", false, false, false)).toEqual(expected);

    expected = "acePrefixA preAceQueryClass";
    expect(getLetterClassNames("A", false, true, false)).toEqual(expected);
  });

  it("Should handle different Alignment types.", () => {
    expect(
      AlignmentStyle.fromAlignmentType(AlignmentTypes.AMINOACID)
    ).toBeInstanceOf(AminoAcidAlignmentStyle);
    expect(
      AlignmentStyle.fromAlignmentType(AlignmentTypes.NUCLEOTIDE)
    ).toBeInstanceOf(NucleotideAlignmentStyle);
  });

  it("Should handle getting a style for the 'all' position.", () => {
    expect(PositionsToStyle.fromKey("all")).toEqual({
      className: "styPosAllClass",
      description: "All",
      key: "all",
    });
  });

  it("Should handle getting a style for the 'query' position.", () => {
    expect(PositionsToStyle.fromKey("query")).toEqual({
      className: "styPosQueryClass",
      description: "Same as Query",
      key: "query",
    });
  });

  it("Should handle getting a style for the 'query-diff' position.", () => {
    expect(PositionsToStyle.fromKey("query-diff")).toEqual({
      className: "styPosQueryDiffClass",
      description: "Different from Query",
      key: "query-diff",
    });
  });

  it("Should handle getting a style for the 'consensus' position.", () => {
    expect(PositionsToStyle.fromKey("consensus")).toEqual({
      className: "styPosConsensusClass",
      description: "Same as Consensus",
      key: "consensus",
    });
  });

  it("Should handle getting a style for the 'consensus-diff' position.", () => {
    expect(PositionsToStyle.fromKey("consensus-diff")).toEqual({
      className: "styPosConsensusDiffClass",
      description: "Different from Consensus",
      key: "consensus-diff",
    });
  });

  it("Should handle getting a style for a non-existing position.", () => {
    expect(PositionsToStyle.fromKey("a")).toBeUndefined();
  });

  it("Should handle getting a style for the 'amino acid' alignment.", () => {
    expect(AlignmentTypes.fromKey("aa")).toEqual({
      allColorSchemes: [],
      className: "aaAlignTypeClass",
      description: "Amino Acid Sequences",
      key: "aa",
    });
  });

  it("Should handle getting a style for the 'nucleotide' alignment.", () => {
    expect(AlignmentTypes.fromKey("nt")).toEqual({
      allColorSchemes: [],
      className: "ntAlignTypeClass",
      description: "Nucleotide Sequences",
      key: "nt",
    });
  });

  it("Should handle getting a style for a non-existing alignment.", () => {
    expect(AlignmentTypes.fromKey("well-thought-out-twinkles")).toBeUndefined();
  });
});
