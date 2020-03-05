import { hexToRgb } from "../Utils";

describe("Utilities", () => {
  describe("hexToRgb", () => {
    it("Should convert hex shorthand with no hash.", () => {
      const expected = {
        red: 255,
        green: 255,
        blue: 255
      };
      expect(hexToRgb("fff")).toEqual(expected);
    });

    it("Should convert hex shorthand with a hash.", () => {
      const expected = {
        red: 255,
        green: 255,
        blue: 255
      };
      expect(hexToRgb("#fff")).toEqual(expected);
    });

    it("Should convert hex with no hash.", () => {
      const expected = {
        red: 0,
        green: 255,
        blue: 255
      };
      expect(hexToRgb("00ffff")).toEqual(expected);
    });

    it("Should convert hex with a hash.", () => {
      const expected = {
        red: 255,
        green: 0,
        blue: 255
      };
      expect(hexToRgb("#ff00ff")).toEqual(expected);
    });

    it("Should throw an error on a bad hex.", () => {
      const expected = "Bad Hex";
      expect(() => hexToRgb("")).toThrowError(expected);
      expect(() => hexToRgb("gggggg")).toThrowError(expected);
      expect(() => hexToRgb("ggg")).toThrowError(expected);
      expect(() => hexToRgb("#gggggg")).toThrowError(expected);
      expect(() => hexToRgb("#ggg")).toThrowError(expected);
      expect(() => hexToRgb("-gggggg")).toThrowError(expected);
      expect(() => hexToRgb("-ggg")).toThrowError(expected);
      expect(() => hexToRgb("-#gggggg")).toThrowError(expected);
      expect(() => hexToRgb("-#ggg")).toThrowError(expected);
      expect(() => hexToRgb("#-gggggg")).toThrowError(expected);
      expect(() => hexToRgb("#-ggg")).toThrowError(expected);
    });
  });
});
