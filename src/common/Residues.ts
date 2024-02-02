import { stringToColor } from "./Utils";
import {
  AminoAcidColorSchemes,
  AminoacidColorSchemeInstance,
  NucleotideColorSchemeInstance,
  NucleotideColorSchemes,
  ResidueColoring,
  ResidueColoringInstance,
} from "./MolecularStyles";

export interface ICombinedColor {
  hexString: string;
  rgb: {
    red: number;
    green: number;
    blue: number;
  };
}


type IColoringToLetterAndBackgroundColor = Map<ResidueColoringInstance, {
  letterColor: ICombinedColor;
  backgroundColor: ICombinedColor;
}>;
type ISingleResidueColor = Map<
  AminoacidColorSchemeInstance | NucleotideColorSchemeInstance, 
  IColoringToLetterAndBackgroundColor
>;

interface IAminoAcid {
  singleLetterCode: string;
  threeLetterCode: string;
  fullName: string;
  colors: ISingleResidueColor;
}

interface INucleotide {
  singleLetterCode: string;
  fullName: string;
  colors: ISingleResidueColor;
}

export class AminoAcid implements IAminoAcid {
  colors: ISingleResidueColor;

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

  static list(): IAminoAcid[] {
    return AminoAcid.canonicalAminoAcids;
  }

  static fromSingleLetterCode(singleLetterCode: string): IAminoAcid {
    if (singleLetterCode in this.bySingleLetterCode) {
      return this.bySingleLetterCode[singleLetterCode];
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
    this.colors = AminoAcidColorSchemes.list.reduce((acc, cs) => {
      const themesMap = new Map() as IColoringToLetterAndBackgroundColor;
      //todo update sass to be more consistant with how we use this
      //i.e., we should be able to loop ResidueColoring.list to
      //set these, but presently the prop keys are different for
      //each coloring type Light/Dark/NoBackground
      //props: colors, backgroundColorsLightTheme, letterColorsDarkTheme
      themesMap.set(ResidueColoring.LIGHT, {
        letterColor: stringToColor(
          cs.colors[singleLetterCode]
            ? cs.colors[singleLetterCode]
            : cs.defaultLetterColor
        ),
        backgroundColor: stringToColor(
          cs.backgroundColorsLightTheme[singleLetterCode]
            ? cs.backgroundColorsLightTheme[singleLetterCode]
            : "#ffffff"
        ),
      });

      themesMap.set(ResidueColoring.DARK, {
        letterColor: stringToColor(
          cs.letterColorsDarkTheme[singleLetterCode]
            ? cs.letterColorsDarkTheme[singleLetterCode]
            : cs.defaultLetterColor
        ),
        backgroundColor: stringToColor(
          cs.colors[singleLetterCode]
            ? cs.colors[singleLetterCode]
            : "#ffffff"
        ),
      });

      themesMap.set(ResidueColoring.NO_BACKGROUND, {
        letterColor: stringToColor(
          cs.colors[singleLetterCode]
            ? cs.colors[singleLetterCode]
            : cs.defaultLetterColor
        ),
        backgroundColor: stringToColor("#ffffff"),
      });
      acc.set(cs, themesMap);
      return acc;
    }, new Map() as ISingleResidueColor);
  }
}

export class Nucleotide implements INucleotide {
  colors: ISingleResidueColor;

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

  static list(): INucleotide[] {
    return Nucleotide.allNucleotides;
  }

  static fromSingleLetterCode(singleLetterCode: string): Nucleotide {
    if (singleLetterCode in this.bySingleLetterCode) {
      return this.bySingleLetterCode[singleLetterCode];
    }
    return Nucleotide.UNKNOWN;
  }
  
  constructor(
    public singleLetterCode: string, public fullName: string
  ) {
    this.singleLetterCode = singleLetterCode;
    this.fullName = fullName;
    this.colors = NucleotideColorSchemes.list.reduce((acc, cs) => {
      const themesMap = new Map() as IColoringToLetterAndBackgroundColor;
      themesMap.set(ResidueColoring.LIGHT, {
        letterColor: stringToColor(
          cs.colors[singleLetterCode]
            ? cs.colors[singleLetterCode]
            : cs.defaultLetterColor
        ),
        backgroundColor: stringToColor(
          cs.backgroundColorsLightTheme[singleLetterCode]
            ? cs.backgroundColorsLightTheme[singleLetterCode]
            : "#ffffff"
        ),
      });

      themesMap.set(ResidueColoring.DARK, {
        letterColor: stringToColor(
          cs.letterColorsDarkTheme[singleLetterCode]
            ? cs.letterColorsDarkTheme[singleLetterCode]
            : cs.defaultLetterColor
        ),
        backgroundColor: stringToColor(
          cs.colors[singleLetterCode]
            ? cs.colors[singleLetterCode]
            : "#ffffff"
        ),
      });

      themesMap.set(ResidueColoring.NO_BACKGROUND, {
        letterColor: stringToColor(
          cs.colors[singleLetterCode]
            ? cs.colors[singleLetterCode]
            : cs.defaultLetterColor
        ),
        backgroundColor: stringToColor("#ffffff"),
      });
      acc.set(cs, themesMap);
      return acc;
    }, new Map() as ISingleResidueColor);
  };
}
