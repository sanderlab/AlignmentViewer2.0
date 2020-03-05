import { GlyphFactory } from "./SequenceLogoGlyphs";
import { hexToRgb } from "./Utils";
import {
  ALL_AMINOACID_COLORSCHEMES,
  ALL_NUCLEOTIDE_COLORSCHEMES
} from "./MolecularStyles";

interface IResidueColor {
  [colorScheme: string]: {
    hexString: string;
    rgb: {
      red: number;
      green: number;
      blue: number;
    };
    backgroundAlpha: number;
  };
}

interface IAminoAcid {
  singleLetterCode: string;
  threeLetterCode: string;
  fullName: string;
  glyph: (props: { [key: string]: string }) => JSX.Element;
  colors: IResidueColor;
}

interface INucleotide {
  singleLetterCode: string;
  fullName: string;
  glyph: (props: { [key: string]: string }) => JSX.Element;
  colors: IResidueColor;
}

export class AminoAcid implements IAminoAcid {
  glyph: (props: { [key: string]: string }) => JSX.Element;
  colors: IResidueColor;

  public static readonly canonicalAminoAcids: AminoAcid[] = [
    new AminoAcid("A", "ALA", "Alanine"),
    new AminoAcid("R", "ARG", "Arginine"),
    new AminoAcid("N", "ASN", "Asparagine"),
    new AminoAcid("D", "ASP", "Aspartic Acid"),
    new AminoAcid("C", "CYS", "Cysteine"),
    new AminoAcid("Q", "GLU", "Glutamine"),
    new AminoAcid("E", "GLN", "Glutamic Acid"),
    new AminoAcid("G", "GLY", "Glycine"),
    new AminoAcid("H", "HIS", "Histidine"),
    new AminoAcid("I", "ILE", "Isoleucine"),
    new AminoAcid("L", "LEU", "Leucine"),
    new AminoAcid("K", "LYS", "Lysine"),
    new AminoAcid("M", "MET", "Methionine"),
    new AminoAcid("F", "PHE", "Phenylalanine"),
    new AminoAcid("P", "PRO", "Proline"),
    new AminoAcid("S", "SER", "Serine"),
    new AminoAcid("T", "THR", "Threonine"),
    new AminoAcid("W", "TRP", "Tryptophan"),
    new AminoAcid("Y", "TYR", "Tyrosine"),
    new AminoAcid("V", "VAL", "Valine"),

    new AminoAcid("X", "UKN", "Unknown Amino Acid")
  ];

  private static bySingleLetterCode = AminoAcid.canonicalAminoAcids.reduce(
    (acc, aa) => {
      acc[aa.singleLetterCode] = aa;
      return acc;
    },
    {} as { [key: string]: AminoAcid }
  );

  private static byThreeLetterCode = AminoAcid.canonicalAminoAcids.reduce(
    (acc, aa) => {
      acc[aa.threeLetterCode] = aa;
      return acc;
    },
    {} as { [key: string]: AminoAcid }
  );

  public static readonly UNKNOWN = AminoAcid.bySingleLetterCode["X"];

  static fromSingleLetterCode(singleLetterCode: string): IAminoAcid {
    if (singleLetterCode in this.bySingleLetterCode) {
      return AminoAcid.bySingleLetterCode[singleLetterCode];
    }
    return AminoAcid.UNKNOWN;
  }

  static fromThreeLetterCode(threeLetterCode: string): IAminoAcid {
    if (threeLetterCode in this.byThreeLetterCode) {
      return AminoAcid.byThreeLetterCode[threeLetterCode];
    }
    return AminoAcid.UNKNOWN;
  }

  constructor(
    public singleLetterCode: string,
    public threeLetterCode: string,
    public fullName: string
  ) {
    this.singleLetterCode = singleLetterCode;
    this.threeLetterCode = threeLetterCode;
    this.fullName = fullName;
    this.glyph = GlyphFactory.glyphFromChar(singleLetterCode);
    this.colors = ALL_AMINOACID_COLORSCHEMES.reduce((acc, cs) => {
      const colorPair = Object.entries(cs.colors).find(([aa, color]) => {
        if (aa === singleLetterCode) {
          return true;
        }
        return false;
      });

      let hexString = "#ffffff";
      if (colorPair) {
        hexString = colorPair[1];
      }
      acc[cs.commonName] = {
        hexString: hexString,
        rgb: hexToRgb(hexString),
        backgroundAlpha: cs.backgroundAlpha
      };
      return acc;
    }, {} as IResidueColor);
  }
}

export class Nucleotide implements INucleotide {
  glyph: (props: { [key: string]: string }) => JSX.Element;
  colors: IResidueColor;

  static allNucleotides: Nucleotide[] = [
    new Nucleotide("A", "Adenine"),
    new Nucleotide("C", "Cytosine"),
    new Nucleotide("G", "Guanine"),
    new Nucleotide("T", "Thymidine"),
    new Nucleotide("U", "Uracil"),

    new Nucleotide("R", "Purine"),
    new Nucleotide("Y", "Pyrimidine"),

    new Nucleotide("X", "Unknown Nucleotide")
  ];

  private static bySingleLetterCode = Nucleotide.allNucleotides.reduce(
    (acc, aa) => {
      acc[aa.singleLetterCode] = aa;
      return acc;
    },
    {} as { [key: string]: Nucleotide }
  );

  public static UNKNOWN = Nucleotide.bySingleLetterCode["X"];

  static fromSingleLetterCode(singleLetterCode: string): Nucleotide {
    if (singleLetterCode in this.bySingleLetterCode) {
      return Nucleotide.bySingleLetterCode[singleLetterCode];
    }
    return Nucleotide.UNKNOWN;
  }

  constructor(public singleLetterCode: string, public fullName: string) {
    this.singleLetterCode = singleLetterCode;
    this.fullName = fullName;
    this.glyph = GlyphFactory.glyphFromChar(singleLetterCode);
    this.colors = ALL_NUCLEOTIDE_COLORSCHEMES.reduce((acc, cs) => {
      const colorPair = Object.entries(cs.colors).find(([aa, color]) => {
        if (aa === singleLetterCode) {
          return true;
        }
        return false;
      });

      let hexString = "#ffffff";
      if (colorPair) {
        hexString = colorPair[1];
      }
      acc[cs.commonName] = {
        hexString: hexString,
        rgb: hexToRgb(hexString),
        backgroundAlpha: cs.backgroundAlpha
      };
      return acc;
    }, {} as IResidueColor);
  }
}
