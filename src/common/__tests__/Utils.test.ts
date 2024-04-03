import { stringToColor } from "../Utils";

const defaultColor = {
  hexString: "#000000",
  rgb: { red: 0, green: 0, blue: 0 },
};

describe("Utilities", () => {
  describe("stringToColor", () => {
    it("Should fail to convert hex shorthand with no hash and be default.", () => {
      expect(stringToColor("fff")).toEqual(defaultColor);
    });
    it("Should convert hex shorthand with a hash.", () => {
      const expected = {
        hexString: "#ffffff",
        rgb: { red: 255, green: 255, blue: 255 },
      };
      expect(stringToColor("#fff")).toEqual(expected);
    });
    it("Should fail to convert hex with no hash and be default.", () => {
      expect(stringToColor("00ffff")).toEqual(defaultColor);
    });
    it("Should convert hex with a hash.", () => {
      const expected = {
        hexString: "#ff00ff",
        rgb: { red: 255, green: 0, blue: 255 },
      };
      expect(stringToColor("#ff00ff")).toEqual(expected);
    });
    it("Should convert color name.", () => {
      const expected = {
        hexString: "#008000",
        rgb: { red: 0, green: 128, blue: 0 },
      };
      expect(stringToColor("green")).toEqual(expected);
    });
    it("Should fail to convert fake color name and result in default.", () => {
      expect(stringToColor("NotGreenBlue")).toEqual(defaultColor);
    });
    /*
    it("Should throw an error on a bad hex.", () => {
      const expected = "Bad Hex";
      expect(() => stringToColor("")).toThrowError(expected);
      expect(() => stringToColor("gggggg")).toThrowError(expected);
      expect(() => stringToColor("ggg")).toThrowError(expected);
      expect(() => stringToColor("#gggggg")).toThrowError(expected);
      expect(() => stringToColor("#ggg")).toThrowError(expected);
      expect(() => stringToColor("-gggggg")).toThrowError(expected);
      expect(() => stringToColor("-ggg")).toThrowError(expected);
      expect(() => stringToColor("-#gggggg")).toThrowError(expected);
      expect(() => stringToColor("-#ggg")).toThrowError(expected);
      expect(() => stringToColor("#-gggggg")).toThrowError(expected);
      expect(() => stringToColor("#-ggg")).toThrowError(expected);
    });*/
  });
});
