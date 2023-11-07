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
  className: string;
  colors: {
    [residueCode: string]: string;
  };
}

export const ALL_AMINOACID_COLORSCHEMES = assembleColorSchemes("aa");
export const ALL_NUCLEOTIDE_COLORSCHEMES = assembleColorSchemes("nt");

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
      const colorSchemeName = styleName.split(moleculeType + "StyClass_")[1];
      const colorOrder = styles[
        moleculeType + "StyColorOrder_" + colorSchemeName
      ]
        .replace(/ /g, "")
        .split(","); // "build" removes spaces, but local "run" does not
      const hexValues = styles[moleculeType + "StyColors_" + colorSchemeName]
        .replace(/ /g, "")
        .split(","); // "build" removes spaces, but local "run" does not
      const description = styles[moleculeType + "StyDesc_" + colorSchemeName];
      acc.push({
        commonName: colorSchemeName,
        description: description,
        className: styles[styleName],
        backgroundAlpha: parseFloat(
          styles[moleculeType + "StyBGAlpha_" + colorSchemeName]
        ),
        colors: Object.fromEntries(
          colorOrder.map((_, i) => [colorOrder[i], hexValues[i]])
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
    "aa",
    "Amino Acid Sequences",
    styles.aaAlignTypeClass,
    ALL_AMINOACID_COLORSCHEMES
  );
  static readonly NUCLEOTIDE = new AlignmentTypes(
    "nt",
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
    styles.styPosQueryClass
  );
  static readonly QUERY_DIFF = new PositionsToStyle(
    "query-diff",
    "Different from Query",
    styles.styPosQueryDiffClass
  );
  static readonly CONSENSUS = new PositionsToStyle(
    "consensus",
    "Same as Consensus",
    styles.styPosConsensusClass
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
    public readonly className: string
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
  abstract colorScheme: IColorScheme;

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
    public colorScheme: IColorScheme = ALL_AMINOACID_COLORSCHEMES[0],
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
    public colorScheme: IColorScheme = ALL_NUCLEOTIDE_COLORSCHEMES[0],
  ) {}
}

/**
 * Export globals
 */
const darkHueClass = styles.darkHueClass;
const lightHueClass = styles.lightHueClass;
const aceResidueParentClass = styles.aceResidueParentClass;
export {
  lightHueClass,
  darkHueClass,
  aceResidueParentClass, // place above any residue (e.g., ace_A) to get default coloring
};

/**
 * Export ace helper parameters and functions.
 */

/**
 * fast lookup of the query, consensus classes
 * @param isForAceItself If it is for ace, do not include the ace_ prefix
 *                       as this is added automatically by ace itself.
 */
function generateFastClassLookup(isForAceItself?: boolean) {
  let ALL_POSSIBLE_CHARS = "";
  for (var i = 32; i <= 126; i++) {
    ALL_POSSIBLE_CHARS += String.fromCharCode(i);
  }

  return ALL_POSSIBLE_CHARS.split("") //".-abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
    .reduce((acc, letter) => {
      const letterInClass = letter === "." ? "dot" : letter;
      const prefix = isForAceItself
        ? letterInClass
        : styles.acePrefix + letterInClass;
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
                  styles.preAceConsensusClass +
                  " " +
                  styles.preAceQueryClass,
              ], //is consensus and query
              [false, prefix + " " + styles.preAceConsensusClass], //is consensus, not query
            ]),
          ],
          [
            false,
            new Map([
              [true, prefix + " " + styles.preAceQueryClass], //is query, not consensus
              [false, prefix], //not query and not consensus
            ]),
          ],
        ])
      );
      return acc;
    }, new Map<string, Map<boolean, Map<boolean, string>>>());
}

const LETTER_CLASS_NAMES = generateFastClassLookup(false);
const LETTER_CLASS_NAMES_FOR_ACE = generateFastClassLookup(true);

/**
 * Export a class name array that is used by the ace editor
 * mode to fill class names for each letter. The structure
 * of this string is just the list of class names, separated
 * by a period. Ace subsequently prepends ace_ to each value
 * when adding the classes to the editor.
 *
 * Update: I only use a single class name separated by a space.
 *         I think this helps with performance:(1) ace no
 *         longer needs to split the returned value by periods
 *         and apply any multi-class logic, and (2) the dom has
 *         shorter classnames. I did rough tests and this seems
 *         to help with performance, but admittedly they were not
 *         rigerous or scientific and it doesn't seem to make a
 *         large impact.
 *
 * @param letter
 * @param isConsensus
 * @param isQuery
 * @param forAceItself if set to true, the first returned class will
 *                     not have ace_ prepended as the ace editor will
 *                     do the prepending on its own.
 */
export function getLetterClassNames(
  letter: string,
  isConsensus: boolean,
  isQuery: boolean,
  forAceItself?: boolean
) {
  return forAceItself
    ? LETTER_CLASS_NAMES_FOR_ACE.get(letter)!.get(isConsensus)!.get(isQuery)!
    : LETTER_CLASS_NAMES.get(letter)!.get(isConsensus)!.get(isQuery)!;
}
