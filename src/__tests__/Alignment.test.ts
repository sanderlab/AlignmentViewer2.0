import Alignment from "../Alignment";

describe("Alignment", () => {
  it("Should allow sorting.", () => {
    const alignment = new Alignment("Test-Sequence", [
      { id: "id-1", sequence: "ZMA" }
    ]);
    expect(alignment.getSortedAlphaLetters()).toEqual(["A", "M", "Z"]);
  });

  it("Should allow getting normalized position counts.", () => {
    const alignment = new Alignment("Test-Sequence", [
      { id: "id-1", sequence: "ABC" },
      { id: "id-2", sequence: "CBA" }
    ]);
    const expected = new Map();
    expected.set(1, { A: 0.5, C: 0.5 });
    expected.set(2, { B: 1 });
    expected.set(3, { A: 0.5, C: 0.5 });
    expect(alignment.getPositionalLetterCounts(true)).toEqual(expected);
  });

  it("Should allow getting non-normalized position counts.", () => {
    const alignment = new Alignment("Test-Sequence", [
      { id: "id-1", sequence: "ABC" },
      { id: "id-2", sequence: "CBA" }
    ]);
    const expected = new Map();
    expected.set(1, { A: 1, C: 1 });
    expected.set(2, { B: 2 });
    expected.set(3, { A: 1, C: 1 });
    expect(alignment.getPositionalLetterCounts()).toEqual(expected);
  });
});
