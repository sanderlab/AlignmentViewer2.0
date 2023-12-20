/**
 * This file centralizes the location of javascript style definitions
 * for nucleotide and amino acid styles.
 */
import styles from "./MolecularStyles.module.scss";
//console.log("STYLES AS INPUT ::::: ", styles);

/**
 * Defines a single color scheme interface which consists of
 * a name, className, background alpha, and set of colors for
 * all residues (hex string format).
 *
 * @export
 * @interface IColorScheme
 */
export interface IColorScheme {
  commonName: string;
  description: string;
  backgroundAlpha: number;
  defaultLetterColor: string;
  className: string;
  colors: {
    [residueCode: string]: string;
  };
  backgroundColorsLightTheme: {
    [residueCode: string]: string;
  };
  letterColorsDarkTheme: {
    [residueCode: string]: string;
  };
}

export const ALL_AMINOACID_COLORSCHEMES = assembleColorSchemes("aa");
export const ALL_NUCLEOTIDE_COLORSCHEMES = assembleColorSchemes("nt");
//console.log("COLOR SCHEMES:", ALL_AMINOACID_COLORSCHEMES);

/**
 * Read in class names and colors for amino acid or nucleotide
 * color schemes from the scss file.
 *
 * @param {("aa" | "nt")} moleculeType
 * @returns
 */
function assembleColorSchemes(moleculeType: "aa" | "nt") {
  return Object.keys(styles).reduce((acc, styleName) => {
    if (styleName.indexOf(moleculeType + "StyClass_") !== -1) {
      //e.g., aaStyClass_Hydrophobicity
      const colorSchemeName = styleName.split(moleculeType + "StyClass_")[1];
      const colorOrder = styles[
        //e.g., aaStyColors_Hydrophobicity
        moleculeType + "StyColorOrder_" + colorSchemeName
      ]
        .replace(/ /g, "")
        .split(","); // "build" removes spaces, but local "run" does not

      //e.g., aaStyColors_Hydrophobicity
      const hexValues = styles[moleculeType + "StyColors_" + colorSchemeName]
        .replace(/ /g, "")
        .split(","); // "build" removes spaces, but local "run" does not

      //e.g., aaStyBackgroundColorsLightTheme_Hydrophobicity
      const backgroundColorLightTheme = styles[
        moleculeType + "StyBackgroundColorsLightTheme_" + colorSchemeName
      ]
        .replace(/ /g, "")
        .split(","); // "build" removes spaces, but local "run" does not

      //e.g., aaStyBackgroundColorsLightTheme_Hydrophobicity
      const letterColorsDarkTheme = styles[
        moleculeType + "StyLetterColorsDarkTheme_" + colorSchemeName
      ]
        .replace(/ /g, "")
        .split(","); // "build" removes spaces, but local "run" does not

      const description = styles[moleculeType + "StyDesc_" + colorSchemeName];
      acc.push({
        commonName: colorSchemeName,
        description: description,
        className: styles[styleName],
        backgroundAlpha: parseFloat(
          styles[moleculeType + "StyBackgroundAlpha_" + colorSchemeName]
        ),
        defaultLetterColor:
          styles[moleculeType + "StyDefaultLetterColor_" + colorSchemeName],
        colors: Object.fromEntries(
          colorOrder.map((_, i) => [colorOrder[i], hexValues[i]])
        ),
        backgroundColorsLightTheme: Object.fromEntries(
          colorOrder.map((_, i) => [
            colorOrder[i],
            backgroundColorLightTheme[i],
          ])
        ),
        letterColorsDarkTheme: Object.fromEntries(
          colorOrder.map((_, i) => [colorOrder[i], letterColorsDarkTheme[i]])
        ),
      });
    }
    return acc;
  }, [] as IColorScheme[]);
}

/**
 * Top level alignment type descriptions. There are two supported
 * alignment types: AMINOACID and NUCLEOTIDE.
 *
 * @export
 * @class AlignmentTypes
 */
export class AlignmentTypes {
  static readonly AMINOACID = new AlignmentTypes(
    "aminoacid-alignment",
    "Amino Acid Sequences",
    styles.aaAlignTypeClass,
    ALL_AMINOACID_COLORSCHEMES
  );
  static readonly NUCLEOTIDE = new AlignmentTypes(
    "nucleotide-alignment",
    "Nucleotide Sequences",
    styles.ntAlignTypeClass,
    ALL_NUCLEOTIDE_COLORSCHEMES
  );

  static list = [AlignmentTypes.AMINOACID, AlignmentTypes.NUCLEOTIDE];

  static fromKey(key: string) {
    return AlignmentTypes.list.find((at) => {
      return at.key === key;
    });
  }

  private constructor(
    public readonly key: string,
    public readonly description: string,
    public readonly className: string,
    public readonly allColorSchemes: IColorScheme[]
  ) {}
}

/**
 * This class represents different position styling modes.
 *
 * @export
 * @class PositionsToStyle
 */
export class PositionsToStyle {
  static readonly ALL = new PositionsToStyle(
    "all",
    "All",
    styles.styPosAllClass
  );
  static readonly QUERY = new PositionsToStyle(
    "query",
    "Same as Query",
    styles.styPosQueryClass,
    styles.queryClass
  );
  static readonly QUERY_DIFF = new PositionsToStyle(
    "query-diff",
    "Different from Query",
    styles.styPosQueryDiffClass
  );
  static readonly CONSENSUS = new PositionsToStyle(
    "consensus",
    "Same as Consensus",
    styles.styPosConsensusClass,
    styles.consensusClass
  );
  static readonly CONSENSUS_DIFF = new PositionsToStyle(
    "consensus-diff",
    "Different from Consensus",
    styles.styPosConsensusDiffClass
  );

  static list = [
    PositionsToStyle.ALL,
    PositionsToStyle.QUERY,
    PositionsToStyle.QUERY_DIFF,
    PositionsToStyle.CONSENSUS,
    PositionsToStyle.CONSENSUS_DIFF,
  ];

  static fromKey(key: string) {
    return PositionsToStyle.list.find((at) => {
      return at.key === key;
    });
  }

  // private to disallow creating other instances of this type
  private constructor(
    public readonly key: string,
    public readonly description: string,
    public readonly className: string,
    public readonly shortClassname?: string
  ) {}
}

export class ResidueColoring {
  static readonly LIGHT = new ResidueColoring(
    "light",
    "Light",
    styles.lightHueClass
  );
  static readonly DARK = new ResidueColoring("dark", "Dark", styles.darkHueClass);
  static readonly NO_BACKGROUND = new ResidueColoring(
    "lettersonly",
    "Letters Only",
    styles.lettersOnlyHueClass
  );

  static list = [
    ResidueColoring.DARK,
    ResidueColoring.LIGHT,
    ResidueColoring.NO_BACKGROUND,
  ];

  static fromKey(key: string) {
    return ResidueColoring.list.find((at) => {
      return at.key === key;
    });
  }

  private constructor(
    public readonly key: string,
    public readonly description: string,
    public readonly className: string
  ) {}
}

/**
 * Object to describe the style of a set of sequences (MSA, logo, etc).
 * Contains 2 key parameters:
 *     "alignmentType": should be set by implementing classes
 *     "colorScheme": describes the color scheme to apply to the alignment.
 *                    defaults to the first available from the scss file
 *     "positionsToStyle": description of which positions should be styled.
 *                         defaults to all positions.
 *
 * @interface AlignmentStyle
 */
export abstract class AlignmentStyle {
  abstract readonly alignmentType: AlignmentTypes;
  abstract readonly allColorSchemes: IColorScheme[];
  abstract selectedColorScheme: IColorScheme;

  static fromAlignmentType(alignmentType: AlignmentTypes) {
    if (alignmentType === AlignmentTypes.AMINOACID)
      return new AminoAcidAlignmentStyle();
    return new NucleotideAlignmentStyle();
  }
}

/**
 * Object to describe an amino acid alignment style
 * @class AminoAcidAlignmentStyle
 * @implements {AlignmentStyle}
 */
export class AminoAcidAlignmentStyle implements AlignmentStyle {
  readonly allColorSchemes = ALL_AMINOACID_COLORSCHEMES;
  readonly alignmentType = AlignmentTypes.AMINOACID;

  constructor(
    public selectedColorScheme: IColorScheme = ALL_AMINOACID_COLORSCHEMES[0],
  ) {}
}

/**
 * Object to describe an nucleotide alignment style
 *
 * @export
 * @class NucleotideAlignmentStyle
 * @implements {AlignmentStyle}
 */
export class NucleotideAlignmentStyle implements AlignmentStyle {
  readonly allColorSchemes = ALL_NUCLEOTIDE_COLORSCHEMES;
  readonly alignmentType = AlignmentTypes.NUCLEOTIDE;

  constructor(
    public selectedColorScheme: IColorScheme = ALL_NUCLEOTIDE_COLORSCHEMES[0],
  ) {}
}

/**
 * Export globals
 */
const resiPrefix = styles.resiPrefix
const darkHueClass = styles.darkHueClass;
const lightHueClass = styles.lightHueClass;
const residueParentClass = styles.residueParentClass;
export {
  resiPrefix as resiClassPrefix,
  lightHueClass,
  darkHueClass,
  residueParentClass, // place above any residue (e.g., resi_A) to get default coloring
};

/**
 * Export helper parameters and functions.
 */

/**
 * fast lookup of the query, consensus classes
 */
function generateFastClassLookup() {
  let ALL_POSSIBLE_CHARS = "";
  for (var i = 32; i <= 126; i++) {
    ALL_POSSIBLE_CHARS += String.fromCharCode(i);
  }

  return ALL_POSSIBLE_CHARS.split("") //".-abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
    .reduce((acc, letter) => {
      const letterInClass = letter === "." ? "dot" : letter;
      const prefix = resiPrefix + letterInClass;
      acc.set(
        letter,
        new Map([
          [
            true,
            new Map([
              [
                true,
                prefix +
                  " " +
                  styles.consensusClass +
                  " " +
                  styles.queryClass,
              ], //is consensus and query
              [false, prefix + " " + styles.consensusClass], //is consensus, not query
            ]),
          ],
          [
            false,
            new Map([
              [true, prefix + " " + styles.queryClass], //is query, not consensus
              [false, prefix], //not query and not consensus
            ]),
          ],
        ])
      );
      return acc;
    }, new Map<string, Map<boolean, Map<boolean, string>>>());
}

const LETTER_CLASS_NAMES = generateFastClassLookup();
/**
 * Export a class name array that is used by the different parts
 * of alignment viewer to fill class names for each letter. The
 * structure of this string is just the list of class names, 
 * separated by a period.
 *
 * Update: I only use a single class name separated by a space.
 *         I think this helps with performance: the dom has
 *         shorter classnames. I did rough tests and this seems
 *         to help with performance, but admittedly they were not
 *         rigerous or scientific and it doesn't seem to make a
 *         large impact.
 *
 * @param letter
 * @param isConsensus
 * @param isQuery
 */
export function getLetterClassNames(
  letter: string,
  isConsensus: boolean,
  isQuery: boolean
) {
  return LETTER_CLASS_NAMES.get(letter)!.get(isConsensus)!.get(isQuery)!;
}
