/**
 * This file centralizes the location of javascript style definitions
 * for nucleotide and amino acid styles.
 */
import { IListOfPropObjects, IPropObjectInstanceInList } from "./GlobalEnumObject";
import styles from "./MolecularStyles.module.scss";

/**
 * Defines a single color scheme interface which consists of
 * a name, className, background alpha, and set of colors for
 * all residues (hex string format).
 *
 * @export
 * @interface ColorSchemeInstance
 */
export interface ColorSchemeInstance extends IPropObjectInstanceInList {
  commonName: string;
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
export interface NucleotideColorSchemeInstance extends ColorSchemeInstance {
  forAlignmentType: "nucleotide";
}
export interface AminoacidColorSchemeInstance extends ColorSchemeInstance {
  forAlignmentType: "aminoacid";
}
export interface PositionsToStyleInstance extends IPropObjectInstanceInList {
  className: string;
  shortClassname?: string;
}
export interface ResidueColoringInstance extends IPropObjectInstanceInList {
  className: string;
}
//export interface AlignmentTypeInstance extends IPropObjectInstanceInList {
//  className: string;
//}
export interface AminoAcidAlignmentTypeInstance extends IPropObjectInstanceInList {
  key: "aminoacid-alignment";
  className: string;
}
export interface NucleotideAlignmentTypeInstance extends IPropObjectInstanceInList {
  key: "nucleotide-alignment";
  className: string;
}

/**
 * Read in class names and colors for amino acid or nucleotide
 * color schemes from the scss file.
 *
 * @param {("aa" | "nt")} moleculeType
 * @returns
 */
function assembleColorSchemes<
  T extends AminoacidColorSchemeInstance | NucleotideColorSchemeInstance
>(moleculeType: "aa" | "nt") {

  const propList = Object.keys(styles).reduce((acc, styleName) => {
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
      acc[colorSchemeName] = {
        key: colorSchemeName,
        description: description,
        commonName: colorSchemeName,
        forAlignmentType: moleculeType === "aa" ? "aminoacid" : "nucleotide",
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
      };
    }
    return acc;
  }, {} as {
    [colorSchemeName: string]: AminoacidColorSchemeInstance
  } | {
    [colorSchemeName: string]: NucleotideColorSchemeInstance
  });
  
  return {
    ...propList,
    ...IListOfPropObjects<T>(Object.values(propList))
  }
}

export const AminoAcidColorSchemes = assembleColorSchemes<AminoacidColorSchemeInstance>("aa");
export const NucleotideColorSchemes = assembleColorSchemes<NucleotideColorSchemeInstance>("nt");

/**
 * Top level alignment type descriptions. There are two supported
 * alignment types: AMINOACID and NUCLEOTIDE.
 *
 * @export
 * @class AlignmentTypes
 */
export const AlignmentTypes = (() => {
  const propList = {
    AMINOACID: {
      key: "aminoacid-alignment",
      description: "Amino Acid Sequences",
      className: styles.aaAlignTypeClass,
      //allColorSchemes: ALL_AMINOACID_COLORSCHEMES
    } satisfies AminoAcidAlignmentTypeInstance,
    NUCLEOTIDE: {
      key: "nucleotide-alignment",
      description: "Nucleotide Sequences",
      className: styles.ntAlignTypeClass,
      //allColorSchemes: ALL_NUCLEOTIDE_COLORSCHEMES
    } satisfies NucleotideAlignmentTypeInstance
  }
  return {
    ...propList,
    ...IListOfPropObjects<NucleotideAlignmentTypeInstance | AminoAcidAlignmentTypeInstance>(Object.values(propList))
  };
})();

/**
 * This object represents different position styling modes.
 *
 * @export
 * @class PositionsToStyle
 */
export const PositionsToStyle = (() => {
  const propList = {
    ALL: {
      key: "all",
      description: "All",
      className: styles.styPosAllClass
    } satisfies PositionsToStyleInstance,
    QUERY: {
      key: "query",
      description: "Same as Query",
      className: styles.styPosQueryClass,
      shortClassname: styles.queryClass
    } satisfies PositionsToStyleInstance,
    QUERY_DIFF: {
      key: "query-diff",
      description: "Different from Query",
      className: styles.styPosQueryDiffClass
    } satisfies PositionsToStyleInstance,
    CONSENSUS: {
      key: "consensus",
      description: "Same as Consensus",
      className: styles.styPosConsensusClass,
      shortClassname: styles.consensusClass
    } satisfies PositionsToStyleInstance,
    CONSENSUS_DIFF: {
      key: "consensus-diff",
      description: "Different from Consensus",
      className: styles.styPosConsensusDiffClass
    } satisfies PositionsToStyleInstance
  }
  return {
    ...propList,

    //special key that is only used for search results. Do not include in the
    //"list" and "serialize"/"deserialize" functions provided by PropListObject
    SEARCH_RESULTS_ONLY: {
      key: "search-results",
      description: "Search Results",
      //logoplot is the only visualization that uses the class, so style "all" 
      //aa/nt on the logoplot on the search screen.
      className: styles.styPosAllClass 
    } satisfies PositionsToStyleInstance,

    ...IListOfPropObjects<PositionsToStyleInstance>(Object.values(propList))
  };
})();


export const ResidueColoring = (() => {
  const propList = {
    LIGHT: {
      key: "light",
      description: "Light",
      className: styles.lightHueClass,
    } satisfies ResidueColoringInstance,
    DARK: {
      key: "dark",
      description: "Dark",
      className: styles.darkHueClass
    } satisfies ResidueColoringInstance,
    NO_BACKGROUND: {
      key: "lettersonly",
      description: "Letters Only",
      className: styles.lettersOnlyHueClass
    } satisfies ResidueColoringInstance
  }
  return {
    ...propList,
    ...IListOfPropObjects<ResidueColoringInstance>(Object.values(propList))
  };
})();


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
 
export abstract class AlignmentStyle {
  abstract readonly alignmentType: typeof AlignmentTypes.AMINOACID;
  abstract readonly allColorSchemes: AminoacidColorSchemeInstance[];
  abstract selectedColorScheme: AminoacidColorSchemeInstance;

  static fromAlignmentType(alignmentType: typeof AlignmentTypes.AMINOACID) {
    if (alignmentType === AlignmentTypes.AMINOACID)
      return new AminoAcidAlignmentStyle();
    return new NucleotideAlignmentStyle();
  }
}*/

/**
 * Object to describe an amino acid alignment style
 * @class AminoAcidAlignmentStyle
 * @implements {AlignmentStyle}

export class AminoAcidAlignmentStyle implements AlignmentStyle {
  readonly allColorSchemes = ALL_AMINOACID_COLORSCHEMES;
  readonly alignmentType = AlignmentTypes.AMINOACID;

  constructor(
    public selectedColorScheme: ColorSchemeInstance = ALL_AMINOACID_COLORSCHEMES[0],
  ) {}
} */

/**
 * Object to describe an nucleotide alignment style
 *
 * @export
 * @class NucleotideAlignmentStyle
 * @implements {AlignmentStyle}
 
export class NucleotideAlignmentStyle implements AlignmentStyle {
  readonly allColorSchemes = ALL_NUCLEOTIDE_COLORSCHEMES;
  readonly alignmentType = AlignmentTypes.NUCLEOTIDE;

  constructor(
    public selectedColorScheme: NucleotideColorSchemeInstance = ALL_NUCLEOTIDE_COLORSCHEMES[0],
  ) {}
}*/

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