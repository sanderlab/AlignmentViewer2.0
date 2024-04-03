import "jest-webgl-canvas-mock";
import { Alignment, ISequence } from "../Alignment";
import { FastaAlignment } from "../FastaAlignment";
import * as fs from "fs";

import { enableFetchMocks, default as fetchMock } from "jest-fetch-mock";
enableFetchMocks();

describe("Alignment", () => {
  let pse1QuerySequence: ISequence;
  let pse1Alignment: FastaAlignment;

  beforeAll(async () => {
    const sequenceFile = fs
      .readFileSync("public/7fa1c5691376beab198788a726917d48_b0.4.a2m")
      .toString();
    // Snippet taken from public/7fa1c5691376beab198788a726917d48_b0.4.a2m
    fetchMock.mockResponse(sequenceFile);

    const result = await fetch(`http://localhost:11037/api/file.a2m`);
    pse1Alignment = FastaAlignment.fromFileContents(
      "7fa1c5691376beab198788a726917d48_b0.4.a2m",
      await result.text()
    );
    pse1QuerySequence = pse1Alignment.getSequences()[0];
    expect(pse1Alignment.getName()).toEqual(
      "7fa1c5691376beab198788a726917d48_b0.4.a2m"
    );
  });

  it("Should allow sorting.", () => {
    const alignment = new Alignment("Test-Sequence", [
      { id: "id-1", sequence: "ZMA" },
    ]);
    expect(alignment.getAllUpperAlphaLettersInAlignmentSorted()).toEqual([
      "A",
      "M",
      "Z",
    ]);
  });

  it("Should allow getting normalized position counts.", () => {
    const alignment = new Alignment("Test-Sequence", [
      { id: "id-1", sequence: "ABC" },
      { id: "id-2", sequence: "CBA" },
    ]);
    const expected = new Map();
    expected.set(0, { A: 0.5, C: 0.5 });
    expected.set(1, { B: 1 });
    expected.set(2, { A: 0.5, C: 0.5 });
    expect(alignment.getPositionalLetterCounts(true)).toEqual(expected);
  });

  it("Should allow getting non-normalized position counts.", () => {
    const alignment = new Alignment("Test-Sequence", [
      { id: "id-1", sequence: "ABC" },
      { id: "id-2", sequence: "CBA" },
    ]);
    const expected = new Map();
    expected.set(0, { A: 1, C: 1 });
    expected.set(1, { B: 2 });
    expected.set(2, { A: 1, C: 1 });
    expect(alignment.getPositionalLetterCounts()).toEqual(expected);
  });

  it("Should return the first sequence in an alignment.", () => {
    const seq1 = { id: "id-1", sequence: "ABC" };
    const alignment = new Alignment("Test-Sequence", [
      seq1,
      { id: "id-2", sequence: "CBA" },
    ]);
    expect(alignment.getQuery()).toEqual(seq1);
  });
});
