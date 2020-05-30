import { GlyphFactory } from "./SequenceLogoGlyphs";
import { stringToColor } from "./Utils";
import {
  ALL_AMINOACID_COLORSCHEMES,
  ALL_NUCLEOTIDE_COLORSCHEMES,
} from "./MolecularStyles";

interface IResidueColor {
  [colorScheme: string]: {
    default: {
      hexString: string;
      rgb: {
        red: number;
        green: number;
        blue: number;
      };
    };
    backgroundColorOnLightTheme: {
      hexString: string;
      rgb: {
        red: number;
        green: number;
        blue: number;
      };
    };
    letterColorOnDarkTheme: string;
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

    new AminoAcid("X", "UKN", "Unknown"),
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
      acc[cs.commonName] = {
        default: stringToColor(
          cs.colors[singleLetterCode] ? cs.colors[singleLetterCode] : "#ffffff"
        ),
        backgroundColorOnLightTheme: stringToColor(
          cs.backgroundColorsLightTheme[singleLetterCode]
            ? cs.backgroundColorsLightTheme[singleLetterCode]
            : "#ffffff"
        ),
        letterColorOnDarkTheme: cs.letterColorsDarkTheme[singleLetterCode]
          ? cs.letterColorsDarkTheme[singleLetterCode]
          : "#000000",
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

    new Nucleotide("X", "Unknown"),
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
    singleLetterCode = singleLetterCode.toUpperCase();
    if (this.bySingleLetterCode[singleLetterCode]) {
      return Nucleotide.bySingleLetterCode[singleLetterCode];
    }
    return Nucleotide.UNKNOWN;
  }

  constructor(public singleLetterCode: string, public fullName: string) {
    this.singleLetterCode = singleLetterCode;
    this.fullName = fullName;
    this.glyph = GlyphFactory.glyphFromChar(singleLetterCode);
    this.colors = ALL_NUCLEOTIDE_COLORSCHEMES.reduce((acc, cs) => {
      acc[cs.commonName] = {
        default: stringToColor(
          cs.colors[singleLetterCode] ? cs.colors[singleLetterCode] : "#ffffff"
        ),
        backgroundColorOnLightTheme: stringToColor(
          cs.backgroundColorsLightTheme[singleLetterCode]
            ? cs.backgroundColorsLightTheme[singleLetterCode]
            : "#ffffff"
        ),
        letterColorOnDarkTheme: cs.letterColorsDarkTheme[singleLetterCode]
          ? cs.letterColorsDarkTheme[singleLetterCode]
          : "#000000",
      };
      return acc;
    }, {} as IResidueColor);
  }
}
