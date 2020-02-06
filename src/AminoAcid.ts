export interface IAminoAcid {
  singleLetterCode: string;
  threeLetterCode: string;
  fullName: string;
  aceBaseClass: string;
  hexString: string;
  rgb: {
    red: number;
    green: number;
    blue: number;
  };
}

export default class AminoAcid implements IAminoAcid {
  singleLetterCode: string;
  threeLetterCode: string;
  fullName: string;
  aceBaseClass: string;
  hexString: string;
  rgb: {
    red: number;
    green: number;
    blue: number;
  };

  static canonicalAminoAcids: AminoAcid[] = [
    new AminoAcid("A", "ALA", "Alanine", "ace_Alanine", "#33cc00"),
    new AminoAcid("R", "ARG", "Arginine", "ace_Arginine", "#cc0000"),
    new AminoAcid("N", "ASN", "Asparagine", "ace_Asparagine", "#6600cc"),
    new AminoAcid("D", "ASP", "Aspartic Acid", "ace_AsparticAcid", "#0033ff"),
    new AminoAcid("C", "CYS", "Cysteine", "ace_Cysteine", "#ffff00"),
    new AminoAcid("Q", "GLU", "Glutamine", "ace_Glutamine", "#6600cc"),
    new AminoAcid("E", "GLN", "Glutamic Acid", "ace_GlutamicAcid", "#0033ff"),
    new AminoAcid("G", "GLY", "Glycine", "ace_Glycine", "#33cc00"),
    new AminoAcid("H", "HIS", "Histidine", "ace_Histidine", "#009900"),
    new AminoAcid("I", "ILE", "Isoleucine", "ace_Isoleucine", "#33cc00"),
    new AminoAcid("L", "LEU", "Leucine", "ace_Leucine", "#33cc00"),
    new AminoAcid("K", "LYS", "Lysine", "ace_Lysine", "#cc0000"),
    new AminoAcid("M", "MET", "Methionine", "ace_Methionine", "#33cc00"),
    new AminoAcid("F", "PHE", "Phenylalanine", "ace_Phenylalanine", "#009900"),
    new AminoAcid("P", "PRO", "Proline", "ace_Proline", "#33cc00"),
    new AminoAcid("S", "SER", "Serine", "ace_Serine", "#0099ff"),
    new AminoAcid("T", "THR", "Threonine", "ace_Threonine", "#0099ff"),
    new AminoAcid("W", "TRP", "Tryptophan", "ace_Tryptophan", "#009900"),
    new AminoAcid("Y", "TYR", "Tyrosine", "ace_Tyrosine", "#009900"),
    new AminoAcid("V", "VAL", "Valine", "ace_Valine", "#33cc00"),
    new AminoAcid("X", "UKN", "Unknown", "ace_Unknown", "#ffffff")
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

  private static UNKNOWN_AMINO_ACID = AminoAcid.bySingleLetterCode["X"];

  static fromSingleLetterCode(singleLetterCode: string): IAminoAcid {
    if (singleLetterCode in this.bySingleLetterCode) {
      return AminoAcid.bySingleLetterCode[singleLetterCode];
    }
    return AminoAcid.UNKNOWN_AMINO_ACID;
  }

  static fromThreeLetterCode(threeLetterCode: string): IAminoAcid {
    if (threeLetterCode in this.byThreeLetterCode) {
      return AminoAcid.byThreeLetterCode[threeLetterCode];
    }
    return AminoAcid.UNKNOWN_AMINO_ACID;
  }

  /**
   * taken from https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
   * @param hex
   */
  private static hexToRgb(
    hex: string
  ): { red: number; green: number; blue: number } {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function(m, r, g, b) {
      return r + r + g + g + b + b;
    });

    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return {
        red: parseInt(result[1], 16),
        green: parseInt(result[2], 16),
        blue: parseInt(result[3], 16)
      };
    }
    throw new Error("Bad Hex");
  }

  /*
  private static hexToRgbA(hexStr: string) {
    var c: string[] | string;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hexStr)) {
      c = hexStr.substring(1).split("");
      if (c.length == 3) {
        c = [c[0], c[0], c[1], c[1], c[2], c[2]];
      }
      c = "0x" + c.join("");
      //@ts-ignore
      return [(c >> 16) & 255, (c >> 8) & 255, c & 255];
    }
    throw new Error("Bad Hex");
  }*/

  constructor(
    singleLetterCode: string,
    threeLetterCode: string,
    fullName: string,
    aceBaseClass: string,
    hexString: string
  ) {
    this.singleLetterCode = singleLetterCode;
    this.threeLetterCode = threeLetterCode;
    this.fullName = fullName;
    this.aceBaseClass = aceBaseClass;
    this.hexString = hexString;
    this.rgb = AminoAcid.hexToRgb(hexString);
  }
}
