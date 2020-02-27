/**
 * This file centralizes the location of javascript style definitions
 * for nucleotide and amino acid styles.
 */
import styles from "./MolecularStyles.module.scss";

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
      ].split(", ");
      const hexValues = styles[
        moleculeType + "StyColors_" + colorSchemeName
      ].split(", ");
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
        )
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

  static listAll() {
    return [AlignmentTypes.NUCLEOTIDE, AlignmentTypes.AMINOACID];
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

  static listAll() {
    return [
      PositionsToStyle.ALL,
      PositionsToStyle.QUERY,
      PositionsToStyle.QUERY_DIFF,
      PositionsToStyle.CONSENSUS,
      PositionsToStyle.CONSENSUS_DIFF
    ];
  }

  // private to disallow creating other instances of this type
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
  abstract positionsToStyle: PositionsToStyle;

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
    public positionsToStyle: PositionsToStyle = PositionsToStyle.ALL
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
    public positionsToStyle: PositionsToStyle = PositionsToStyle.ALL
  ) {}
}

/**
 * Export ace helper parameters and functions.
 */
const acePrefix = styles.acePrefix;
export { acePrefix };

export function getClassNamesForAce(
  letter: string,
  isConsensus: boolean,
  isQuery: boolean
) {
  const consensus = isConsensus ? "." + styles.preAceConsensusClass : "";
  const query = isQuery ? "." + styles.preAceQueryClass : "";

  return letter + consensus + query;
}
