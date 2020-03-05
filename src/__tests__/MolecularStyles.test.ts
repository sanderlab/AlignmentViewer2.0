import {
  AlignmentStyle,
  AlignmentTypes,
  AminoAcidAlignmentStyle,
  NucleotideAlignmentStyle,
  PositionsToStyle,
  getClassNamesForAce
} from "../MolecularStyles";

describe("MolecularStyles", () => {
  it("Should get class names for Ace.", () => {
    let expected = "prefix.preAceConsensusClass.preAceQueryClass";
    expect(getClassNamesForAce("prefix", true, true)).toEqual(expected);

    expected = "prefix.preAceQueryClass";
    expect(getClassNamesForAce("prefix", false, true)).toEqual(expected);

    expected = "prefix";
    expect(getClassNamesForAce("prefix", false, false)).toEqual(expected);

    expected = "prefix.preAceQueryClass";
    expect(getClassNamesForAce("prefix", false, true)).toEqual(expected);
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
      key: "all"
    });
  });

  it("Should handle getting a style for the 'query' position.", () => {
    expect(PositionsToStyle.fromKey("query")).toEqual({
      className: "styPosQueryClass",
      description: "Same as Query",
      key: "query"
    });
  });

  it("Should handle getting a style for the 'query-diff' position.", () => {
    expect(PositionsToStyle.fromKey("query-diff")).toEqual({
      className: "styPosQueryDiffClass",
      description: "Different from Query",
      key: "query-diff"
    });
  });

  it("Should handle getting a style for the 'consensus' position.", () => {
    expect(PositionsToStyle.fromKey("consensus")).toEqual({
      className: "styPosConsensusClass",
      description: "Same as Consensus",
      key: "consensus"
    });
  });

  it("Should handle getting a style for the 'consensus-diff' position.", () => {
    expect(PositionsToStyle.fromKey("consensus-diff")).toEqual({
      className: "styPosConsensusDiffClass",
      description: "Different from Consensus",
      key: "consensus-diff"
    });
  });

  it("Should handle getting a style for a non-existing position.", () => {
    expect(PositionsToStyle.fromKey("a")).toBeUndefined();
  });

  it("Should handle getting a style for the 'amino acid' alignment.", () => {
    expect(AlignmentTypes.fromKey("aminoacid-alignment")).toEqual({
      allColorSchemes: [],
      className: "aaAlignTypeClass",
      description: "Amino Acid Sequences",
      key: "aminoacid-alignment"
    });
  });

  it("Should handle getting a style for the 'nucleotide' alignment.", () => {
    expect(AlignmentTypes.fromKey("nucleotide-alignment")).toEqual({
      allColorSchemes: [],
      className: "ntAlignTypeClass",
      description: "Nucleotide Sequences",
      key: "nucleotide-alignment"
    });
  });

  it("Should handle getting a style for a non-existing alignment.", () => {
    expect(AlignmentTypes.fromKey("well-thought-out-twinkles")).toBeUndefined();
  });
});
