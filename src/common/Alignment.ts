import { generateUUIDv4 } from "./Utils";
import { AminoAcid, ICombinedColor, Nucleotide } from "./Residues";
import { SequenceSorter, SequenceSorterInstance } from "./AlignmentSorter";
import {
  AlignmentTypes,
  AminoAcidAlignmentTypeInstance,
  AminoAcidColorSchemes,
  AminoacidColorSchemeInstance,
  NucleotideAlignmentTypeInstance,
  NucleotideColorSchemeInstance,
  NucleotideColorSchemes,
  PositionsToStyle,
  PositionsToStyleInstance,
  ResidueColoringInstance,
} from "./MolecularStyles";
import { DEFAULT_ANNOTATION_FIELDS, formatFieldName, type TAnnotations } from "./Annotations";

export interface ISequence {
  sequence: string;
  annotations: TAnnotations;
}

//private functions
const countCharacterCodes = (
  sequences: string[], 
  maxSequenceLength: number
) => {

  // aggregate stats for each position and globally including
  // the number of times each amino acid occurs
  // ** this loop takes the bulk of the initialization time
  let allUniqueCharCodes: { [charCode: number]: boolean } = {};

  //COLLECT ALL CHARACTER CODES. Work in character code space as this 
  //is much faster. Convert character codes back to letters at the end.
  for(
    let seqIdx = 0, seqsLen = sequences.length; 
    seqIdx < seqsLen; 
    seqIdx++
  ){
    const seqStr = sequences[seqIdx];
    //for speed use char codes: https://stackoverflow.com/questions/4434076
    for (
      let positionIdx = 0, seqLen = seqStr.length;
      positionIdx < seqLen;
      positionIdx++
    ) {
      const charCode = seqStr.charCodeAt(positionIdx);

      //note: checking whether key already exists is slower (I tested)
      //by about 33% (i.e., 300ms vs 200ms on 10X beta lactamase)
      allUniqueCharCodes[charCode] = true;
    }
  }

  const allUniqueChars = Object.keys(allUniqueCharCodes).map((
    charCodeStr: string
  )=>{
    return String.fromCharCode( parseInt(charCodeStr) );
  });

  //INITIALIZE a character code version of positional letter counts
  //that each contain all possible charCodes in the alignment, initialized
  //to a count of zero.
  const positionalCharCodeCounts = new Map<
    number,
    { [charCode: string]: number }
  >();
  for (let i = 0; i < maxSequenceLength; i++) {
    positionalCharCodeCounts.set(
      i,
      Object.keys(allUniqueCharCodes).reduce((acc, charCode) => {
        acc[charCode] = 0;
        return acc;
      }, {} as { [charCode: string]: number })
    );
  }

  //INITIALIZE a character code version of global letter counts
  const globalCharCodeCounts: { [charCode: string]: number } = {};
  Object.keys(allUniqueCharCodes).forEach((charCode) => {
    globalCharCodeCounts[charCode] = 0;
  });

  //empirically fill in character code counts from the sequences
  for (
    let seqIdx = 0, seqsLen = sequences.length;
    seqIdx < seqsLen;
    seqIdx++
  ) {
    const seqStr = sequences[seqIdx];
    for (
      let positionIdx = 0, len = seqStr.length;
      positionIdx < len;
      positionIdx++
    ) {
      const charCode = seqStr.charCodeAt(positionIdx);
      globalCharCodeCounts[charCode] += 1;
      positionalCharCodeCounts.get(positionIdx)![charCode] += 1;
    }
  };

  return {
    allUniqueChars: allUniqueChars,
    globalCharCodeCounts: globalCharCodeCounts,
    positionalCharCodeCounts: positionalCharCodeCounts
  };
}



/**
 * Alignment
 * This class represents a multiple sequence alignment. During initialization,
 * positional statistics are generated about the alignment and a consensus
 * sequence is determined.
 *
 * The class should generally be instantiated from subclasses (e.g., FastaAlignemtn)
 * using static methods, e.g.,
 *     FastaAlignment.fromFileContents
 *     StockholmAlignment.fromFileContents
 */
export class Alignment {
  private uuid: string;
  private name: string;
  private predictedNT: boolean;
  private numberDuplicateSequencesInAlignment: number;
  private numberRemovedDuplicateSequences: number;
  private sortedSequencesCache: Map<SequenceSorterInstance, ISequence[]>;
  private maxSequenceLength: number;
  private querySequence: ISequence;
  private positionalLetterCounts: Map<number, { [letter: string]: number }>;
  private globalAlphaLetterCounts: { [letter: string]: number };
  private allUpperAlphaLettersInAlignmentSorted: UpperCaseLetters[];
  private consensus: ISequence;
  private allRepresentedCharacters: string[];
  private annotationFields: Record<string, {key: string, name: string}>;

  /**
   * Normalize all values in an object that contains all counts such that
   * the sum of those counts equals 1.
   * @param letterCounts an object that contains the same keys, but whose
   *                     values now sum to 1.
   * @param validLetters if provided, returned object will only contain letters
   *                     that are in this array.
   */
  private static normalizeLetterCounts(
    letterCounts: { [letter: string]: number },
    validLetters?: string[]
  ) {
    const totalCounts = Object.keys(letterCounts).reduce((acc, letter) => {
      if (!validLetters || validLetters.includes(letter)) {
        acc += letterCounts[letter];
      }
      return acc;
    }, 0);

    return Object.keys(letterCounts).reduce((acc, letter) => {
      if (!validLetters || validLetters.includes(letter)) {
        acc[letter] = letterCounts[letter] / totalCounts;
      }
      return acc;
    }, {} as { [letter: string]: number });
  }

  /**
   * Create a new Alignment object. The default query sequence will
   * be set to the first sequence in sequences. This can be changed
   * by calling setQuerySequence() after creation
   *
   *
   * @param name Give the alignment a name
   * @param sequencesAsInput The raw sequences ordered as in a fasta file or
   *                         provided by the use
   * @param removeDuplicateSequences remove all duplicate sequences. the retained
   *                                 sequence will be the first in order
   */
  public constructor(props: {
    name: string,
    sequencesAsInput: ISequence[],
    removeDuplicateSequences?: boolean,
    supressParseTime?: boolean,
    overrideQuery?: ISequence
  }) {
    const {
      name,
      sequencesAsInput,
      removeDuplicateSequences = false,
      supressParseTime,
      overrideQuery
    } = props;

    this.uuid = generateUUIDv4();
    this.name = name;
    this.sortedSequencesCache = new Map<SequenceSorterInstance, ISequence[]>();

    //
    //remove duplicates, pull out query, generate statistics, generate
    //
    let start = new Date();

    //get alignment with duplicates removed - the calculation
    //happens regardless of whether prop requested in order to
    //report # duplicates
    let numberDuplicateSequences = 0;
    const sequencesWithoutDuplicates = Array.from(
      sequencesAsInput
        .reduce((acc, iseq, idx) => {
          if (!acc.has(iseq.sequence)) {
            acc.set(iseq.sequence, iseq);
          } else {
            numberDuplicateSequences += 1;
          }
          return acc;
        }, new Map<string, ISequence>())
        .values()
    );

    if (removeDuplicateSequences) {
      this.numberDuplicateSequencesInAlignment = 0;
      this.numberRemovedDuplicateSequences = numberDuplicateSequences;
      this.sortedSequencesCache.set(SequenceSorter.INPUT, sequencesWithoutDuplicates);
    } else {
      this.numberDuplicateSequencesInAlignment = numberDuplicateSequences;
      this.numberRemovedDuplicateSequences = 0;
      this.sortedSequencesCache.set(SequenceSorter.INPUT, sequencesAsInput);
    }

    //reset sequences as input in case duplicates have been removed
    const finalInputSequences = this.sortedSequencesCache.get(SequenceSorter.INPUT)!;
    this.querySequence = overrideQuery
      ? overrideQuery
      : finalInputSequences[0]
        ? {...finalInputSequences[0]}    //copy of the first sequence
        : {
          sequence: "", 
          annotations: {
            [DEFAULT_ANNOTATION_FIELDS.ID]:"query",
            [DEFAULT_ANNOTATION_FIELDS.ACTUAL_ID]:"query",
          }
        }; //empty alignment
    this.predictedNT = true;


    start = new Date();

    //first check that all sequence lengths are the same
    let sequenceLengths: { [length: string]: boolean } = {};
    for(
      let seqIdx = 0, seqsLen = finalInputSequences.length; 
      seqIdx < seqsLen; 
      seqIdx++
    ){
      const seqStr = finalInputSequences[seqIdx].sequence;
      sequenceLengths[seqStr.length] = true;
    }
    if (Object.keys(sequenceLengths).length > 1) {
      throw Error(
        "Alignment sequences must all be the same length, but multiple sequence lengths were observed: " +
          Object.keys(sequenceLengths).join(", ")
      );
    }
    //all sequences are the same length
    this.maxSequenceLength = parseInt(Object.keys(sequenceLengths)[0]);
    this.maxSequenceLength = !this.maxSequenceLength ? 0 : this.maxSequenceLength;

    //iterate all sequences and gather and count unique characters
    const {
      allUniqueChars,
      globalCharCodeCounts, //doesn't include any overridden query
      positionalCharCodeCounts, //doesn't include any overridden query
    } = countCharacterCodes(
      finalInputSequences.map(iseq=>iseq.sequence),
      this.maxSequenceLength
    );

    //set property and add any overridden query chars to the list.
    this.allRepresentedCharacters = !overrideQuery  
      ? allUniqueChars 
      : overrideQuery.sequence.split("").reduce((acc, char) => {
        if(acc.indexOf(char) === -1){
          acc = acc + char;
        }
        return acc;
      }, allUniqueChars.join("")).split("");

    //convert the character codes in globalCharCodeCounts to letters
    //note: doesn't take into account overridden query (if there is one)
    this.positionalLetterCounts = Array.from(positionalCharCodeCounts).reduce(
      (acc, [positionIdx, positionalCharCodeCounts]) => {
        acc.set(
          positionIdx,
          Object.keys(positionalCharCodeCounts).reduce((acc2, charCodeStr) => {
            if (positionalCharCodeCounts[charCodeStr]) {
              //get rid of the zero entries
              const letter = String.fromCharCode(parseInt(charCodeStr));
              acc2[letter] = positionalCharCodeCounts[charCodeStr];
            }
            return acc2;
          }, {} as { [letter: string]: number })
        );
        return acc;
      },
      new Map<
        number,
        {
          [letter: string]: number;
        }
      >()
    );

    //convert the character codes in globalCharCodeCounts to letters
    //note: doesn't take into account overridden query (if there is one)
    this.globalAlphaLetterCounts = Object.keys(globalCharCodeCounts).reduce(
      (arr, charCodeStr) => {
        if (globalCharCodeCounts[charCodeStr]) {
          //get rid of the zero entries - unnecessary?!?
          const letter = String.fromCharCode(parseInt(charCodeStr));
          arr[letter] = globalCharCodeCounts[charCodeStr];
        }
        return arr;
      },
      {} as { [letter: string]: number }
    );

    //predict whether a sequence is nt or aa - if no characters are
    //outside the Nucleotide codes, then call nt, otherwise aa.
    this.predictedNT = allUniqueChars.find((letter) => {
      const isLowerAlpha = letter.match(/[a-z]/);
      const isUpperAlpha = letter.match(/[A-Z]/);
      if (isUpperAlpha || isLowerAlpha) {
        return (
          Nucleotide.fromSingleLetterCode(letter) === Nucleotide.UNKNOWN
        );
      }
      return false;
    }) ? false : true;

    //extract all the upper letter characters
    this.allUpperAlphaLettersInAlignmentSorted = allUniqueChars.reduce((
      acc, letter
    ) => {
      if(letter.match(/[A-Z]/)){
        acc.push(
          letter as UpperCaseLetters
        );
      }
      return acc;
    }, [] as UpperCaseLetters[]).sort();

    //extract consensus
    this.consensus = {
      annotations: {
        [DEFAULT_ANNOTATION_FIELDS.ID]: "consensus",
        [DEFAULT_ANNOTATION_FIELDS.ACTUAL_ID]: "consensus",
      },
      sequence: Array.from(this.positionalLetterCounts)
        .map(([positionIdx, letterCounts]) => {
          //all zero entries removed from this.positionalLetterCounts above
          return Object.entries(letterCounts)
            .sort((letterA, letterB) => {
              //prefer upper case letters then lower case letters
              const aIsLowerAlpha = letterA[0].match(/[a-z]/) ? true : false;
              const aIsUpperAlpha = letterA[0].match(/[A-Z]/) ? true : false;
              const bIsLowerAlpha = letterB[0].match(/[a-z]/) ? true : false;
              const bIsUpperAlpha = letterB[0].match(/[A-Z]/) ? true : false;

              if (
                aIsLowerAlpha === bIsLowerAlpha &&
                aIsUpperAlpha === bIsUpperAlpha
              ) {
                //both are the same (upper or lower or neither)
                return letterB[1] - letterA[1];
              }

              //different case and one has a value
              return aIsUpperAlpha
                ? -1
                : bIsUpperAlpha
                ? 1
                : aIsLowerAlpha
                ? -1
                : bIsLowerAlpha
                ? 1
                : 0;
            })
            .map((letter) => letter[0])[0];
        })
        .join(""),
    };

    this.annotationFields = {};
    for (const seq of finalInputSequences) {
      for (const field of Object.keys(seq.annotations)) {
        if (!(field in this.annotationFields)) {
          this.annotationFields[field] = {
            key: field,
            name: formatFieldName(field),
          };
        }
      }
    }
    
    if(!supressParseTime){
      console.log(
        "done parsing alignment. took " +
          (new Date().getTime() - start.getTime()) +
          "ms"
      );
    }
  }

  /**
   * Returns a list of all of the characters that are used in the alignment.
   * NOTE: also includes characters from any overridden query.
   */
  getAllRepresentedCharacters(){
    return this.allRepresentedCharacters;
  }

  /**
   * Returns the number of sequences in the alignment that are duplicates
   */
  getNumberDuplicateSequencesInAlignment() {
    return this.numberDuplicateSequencesInAlignment;
  }

  /**
   * Returns the number of sequences that were duplicates in the uploaded
   * alignment that were subsequeently removed
   */
  getNumberRemovedDuplicateSequences() {
    return this.numberRemovedDuplicateSequences;
  }

  /**
   * Is this alignment predicted to be nucleotides?
   * @returns true if it is predicted to be nucleotide sequences.
   */
  getPredictedType(): AminoAcidAlignmentTypeInstance | NucleotideAlignmentTypeInstance {
    return this.predictedNT
      ? AlignmentTypes.NUCLEOTIDE
      : AlignmentTypes.AMINOACID;
  }

  /**
   * Returns a default nucleotide or amino acid style for this alignment,
   * predicted from the sequence itself.
   
  getDefaultStyle(): AminoAcidAlignmentStyle | NucleotideAlignmentStyle {
    return this.predictedNT
      ? new NucleotideAlignmentStyle()
      : new AminoAcidAlignmentStyle();
  }*/
  getDefaultColorScheme(): AminoacidColorSchemeInstance | NucleotideColorSchemeInstance {
    return this.predictedNT
      ? NucleotideColorSchemes.list[0]
      : AminoAcidColorSchemes.list[0];
  }

  /**
   * Get a unique uuid for this alignment.
   * @returns a uuid string for this alignment
   */
  getUUID() {
    return this.uuid;
  }

  /**
   * Get the name of this alignment
   * @returns a name for the alignment - usually the filename
   */
  getName() {
    return this.name;
  }

  /**
   * Get the consensus sequence
   * @returns a position ordered array of objects that contain each letter, its number of
   *          occurrences, and the actual position number
   */
  getConsensus() {
    return this.consensus;
  }

  /**
   * Get the number of gaps at each position
   * @returns an array of gap counts, ordered by position
   */
  getGapsPerColumn(): number[] {
    return Array.from(this.positionalLetterCounts).map(
      ([position, letterCounts]) => {
        return !isNaN(letterCounts["-"]) ? letterCounts["-"] : 0;
      }
    );
  }

  /**
   * Get the number of gaps at a specific position
   * @returns the gap counts at the specified position
   */
  getGapCountAtColumn(position: number): number {
    const letterCounts = this.positionalLetterCounts.get(position);
    if (!letterCounts || !letterCounts["-"]) {
      return 0;
    }
    return letterCounts["-"];
  }

  /**
   * Get the total number of times each letter appears in the alignment.
   * @param normalize if true, will normalize the returned array such that
   *                  it sums to 1.
   * @param validLetters if provided, only those letters will be included
   *                     in the resulting counts
   */
  getGlobalAlphaLetterCounts(normalize?: boolean, validLetters?: string[]) {
    if (normalize) {
      return Alignment.normalizeLetterCounts(
        this.globalAlphaLetterCounts,
        validLetters
      );
    }
    return !validLetters
      ? this.globalAlphaLetterCounts
      : Object.keys(this.globalAlphaLetterCounts).reduce((acc, letter) => {
          //don't normalize, but remove invalid letters
          if (validLetters.includes(letter)) {
            acc[letter] = this.globalAlphaLetterCounts[letter];
          }
          return acc;
        }, {} as { [letter: string]: number });
  }

  /**
   * Get the length of the longest sequence. Determined in constructor
   * during stat generation.
   * @returns the length of the largest sequence in this alignment
   */
  getSequenceLength(): number {
    return this.maxSequenceLength;
  }

  /**
   * Get the total number of sequences.
   * @returns the number of sequences
   */
  getSequenceCount(): number {
    return this.sortedSequencesCache.get(SequenceSorter.INPUT)!.length;
  }

  /**
   * Get the frequencies of all letters in this alignment for each position.
   * @param normalize if true, will normalize the returned letter counts for each
   *                  position such that each sums to 1.
   * @param validLetters if provided, only those letters will be included
   *                     in the resulting counts
   * @returns a Map whose keys are position (ordered) and values are a dictionary
   *          with [key = letter (e.g., amino acid code)] and [value = # occurrences].
   */
  getPositionalLetterCounts(normalize?: boolean, validLetters?: string[]) {
    if (normalize || validLetters) {
      return Array.from(this.positionalLetterCounts).reduce(
        (acc, [position, letterCounts]) => {
          acc.set(
            position,
            normalize
              ? Alignment.normalizeLetterCounts(letterCounts, validLetters) // normalize + remove invalid letters
              : Object.keys(letterCounts).reduce((acc2, letter) => {
                  //don't normalize, but remove invalid letters
                  if (validLetters!.includes(letter)) {
                    acc2[letter] = letterCounts[letter];
                  }
                  return acc2;
                }, {} as { [letter: string]: number })
          );
          return acc;
        },
        new Map<Number, { [letter: string]: number }>()
      );
    }
    return this.positionalLetterCounts;
  }

  /**
   * Get all the sequences in this alignment - ordered as they were input
   * @param sortBy specifies the order of the returned sequences. If it isn't
   *               provided, returns the sequences as they were input to create
   *               the Alignment object, e.g., usually fasta order.
   * @param forceReSort if provided, sequences are forced to be re-sorted (rather
   *                    than possibly cached)
   * @returns all sequences in this alignment
   */
  getSequences(sortBy?: SequenceSorterInstance, forceReSort?: boolean): ISequence[] {
    sortBy = sortBy ? sortBy : SequenceSorter.INPUT;
    forceReSort = forceReSort ? forceReSort : false;
    if (
      sortBy !== SequenceSorter.INPUT &&
      (!this.sortedSequencesCache.has(sortBy) || forceReSort)
    ) {
      //cache not yet populated for this sort option
      this.sortedSequencesCache.set(
        sortBy,
        sortBy.sortFn(this.sortedSequencesCache.get(SequenceSorter.INPUT)!, this)
      );
    }
    return this.sortedSequencesCache.get(sortBy)!;
  }

  /**
   * Get all annotation fields in all sequences
   * @returns all annotation fields
   */
  getAnnotationFields() {
    return this.annotationFields;
  }

  /**
   * Get a sorted list of all of the upper case letters in the alignment.
   * @returns a list of all letters in the alignment sorted alphabetically.
   */
  getAllUpperAlphaLettersInAlignmentSorted(): UpperCaseLetters[] {
    return this.allUpperAlphaLettersInAlignmentSorted;
  }

  /**
   * Get all the first sequence in the alignment, aka, target / query / first
   * @returns all sequences in this alignment
   */
  getQuery(): ISequence {
    return this.querySequence;
  }


  /**
   * Set the query sequence
   * @param newQuery The new query sequence. Must already exist in the alignment.
   * @throws an error if the query sequence does not yet exist in the alignment
   *
   * UPDATE: adding the query really requires a reparsing of all the data as some
   * of the properties like "allRepresentedCharacters" are no longer correct - e.g.,
   * especially if the alignment is super short as in search results.
   * REMOVING for now. If you add back in, make sure to reparse or figure out which
   * properies need resetting.
   */
  /*setQuerySequence(newQuery: ISequence) {
    if(newQuery.sequence.length !== this.getSequenceLength()){
      throw Error([
          `Invalid query sequence - length of new query (${newQuery.sequence.length}) !==`,
          `length of sequences in alignemnt (${this.getSequenceLength()})`
        ].join(" ")
      )
    }

    //check if already in the alignment. 
    // UPDATE: doesn't matter - allow query sequence to be new and not in alignment. This
    //         is important for the search screen where we want to show the query, but not
    //         have it in the alignment.
    //const queryInAlignment = this.getSequences().find((seq) => {
    //  if (seq === newQuery) return true;
    //  return false;
    //});
    this.querySequence = newQuery;

    //rather than resort everything right now, just remove all the cache that is
    //dependent on the query
    const newSortedSequencesCache = new Map<SequenceSorter, ISequence[]>();
    for (const [sorter, seqs] of this.sortedSequencesCache) {
      if(
        sorter === SequenceSorter.INPUT || 
        sorter === SequenceSorter.BLOSUM62_SCORE_CONSENSUS || 
        sorter === SequenceSorter.HAMMING_DIST_CONSENSUS
      ){
        newSortedSequencesCache.set(sorter, seqs);
      }
    }
    this.sortedSequencesCache = newSortedSequencesCache;
  }*/


  // quick lookup of colors for all letters at each position, i.e.:
  //   const val = getSequenceColors(...)
  //   const color = val[posIdx][letter];
  //TODO: maybe put this into the alignment itself to cache and speed things up, then
  //      again maybe it isn't necessary. Speed test? Would require retooling the
  //      canvas alignment and alignment details hooks to no longer allow arbitrary
  //      sequences.
  //slow with large alignments - webworker?
  static getPositionalLetterColors = (props: {
    //precomputed from alignment .. can and will often be larger than is
    //available in "sequences", but this can be expensive
    allPossibleChars: string[];

    sequences: string[];
    querySequence: string;
    consensusSequence: string;
    alignmentType: AminoAcidAlignmentTypeInstance | NucleotideAlignmentTypeInstance;
    positionsToStyle: PositionsToStyleInstance;
    residueColoring: ResidueColoringInstance;
    aaColorScheme?: AminoacidColorSchemeInstance;
    ntColorScheme?: NucleotideColorSchemeInstance;
  }) =>{
    const {
      allPossibleChars,
      sequences,
      querySequence,
      consensusSequence,
      alignmentType,
      positionsToStyle,
      residueColoring,
      aaColorScheme = AminoAcidColorSchemes.list[0],
      ntColorScheme = NucleotideColorSchemes.list[0]
    } = props;

    const colorScheme = alignmentType === AlignmentTypes.AMINOACID
      ? aaColorScheme : ntColorScheme;

    if(sequences.length < 1){
      return {};
    }

    //iterate all sequences and count unique characters
    const moleculeClass = alignmentType === AlignmentTypes.AMINOACID 
      ? AminoAcid 
      : Nucleotide;
    const UNKNOWN_COLORS = moleculeClass.UNKNOWN.colors.get(
        colorScheme
      )!.get(
        residueColoring
      )!;

    const toReturn = {} as { [posIdx: number]: { 
      [letter: string]: {
        letter: string,
        backgroundColor: ICombinedColor,
        letterColor: ICombinedColor
      }
    }};

    for(
      var posIdx = 0, seqLen = sequences[0].length;
      posIdx < seqLen;
      posIdx++
    ){
      const letterColorsForPosition: { 
        [letter: string]: {
          letter: string,
          backgroundColor: ICombinedColor,
          letterColor: ICombinedColor
        }
      } = {};

      for(
        var lettersIdx = 0, lettersLen = allPossibleChars.length;
        lettersIdx < lettersLen;
        lettersIdx++
      ){
        const letter = allPossibleChars[lettersIdx];
        const colorIfStyled = moleculeClass.fromSingleLetterCode(letter).colors.get(
          colorScheme
        )!.get(
          residueColoring
        )!;

        const finalColor = (positionsToStyle===PositionsToStyle.ALL)
          ? colorIfStyled
          : (positionsToStyle === PositionsToStyle.QUERY && querySequence[posIdx] === letter) ||
            (positionsToStyle === PositionsToStyle.QUERY_DIFF && querySequence[posIdx] !== letter) ||
            (positionsToStyle === PositionsToStyle.CONSENSUS && consensusSequence[posIdx] === letter) ||
            (positionsToStyle === PositionsToStyle.CONSENSUS_DIFF && consensusSequence[posIdx] !== letter)
            ? colorIfStyled
            : UNKNOWN_COLORS

        letterColorsForPosition[letter] = {
          letter: letter,
          ...finalColor
        };
      }
      toReturn[posIdx] = letterColorsForPosition;
    }
    return toReturn;
  }
}
