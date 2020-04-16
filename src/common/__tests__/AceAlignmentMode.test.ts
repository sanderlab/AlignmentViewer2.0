import "jest-webgl-canvas-mock";
import { Alignment } from "../Alignment";
import { defineNewAlignmentMode } from "../AceAlignmentMode";

describe("defineNewAlignmentMode", () => {
  it("Should throw on an empty mode.", () => {
    const expectedError =
      "ace mode name must be of the form '/ace/mode/MODENAME'";
    expect(() =>
      defineNewAlignmentMode("", new Alignment("", []))
    ).toThrowError(expectedError);
  });

  it.each(["ace/mode", "ace/mode/name/", "/ace/mode/name/"])(
    "Should throw an error for malformed mode '%s'",
    (mode) => {
      const expectedError =
        "ace mode name must be of the form '/ace/mode/MODENAME'";
      expect(() =>
        defineNewAlignmentMode(mode, new Alignment("", []))
      ).toThrowError(expectedError);
    }
  );

  it("Should accept a properly formatted mode.", () => {
    expect(() =>
      defineNewAlignmentMode("ace/mode/name", new Alignment("", []))
    ).not.toThrow();
  });
});
