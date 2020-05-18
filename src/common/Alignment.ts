import { generateUUIDv4 } from "./Utils";
import { defineNewAlignmentMode } from "./AceAlignmentMode";
import { Nucleotide } from "./Residues";
import { SequenceSorter } from "./AlignmentSorter";
import {
  AlignmentTypes,
  AminoAcidAlignmentStyle,
  NucleotideAlignmentStyle,
} from "./MolecularStyles";

export interface ISequence {
  id: string;
  sequence: string;
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
  private aceEditorMode: string | undefined;
  private name: string;
  private predictedNT: boolean;
  private sequences: Map<SequenceSorter, ISequence[]>;
  private querySequence: ISequence;
  private positionalLetterCounts = new Map<
    number,
    { [letter: string]: number }
  >();
  private globalAlphaLetterCounts: { [letter: string]: number } = {};
  private allUpperAlphaLettersInAlignmentSorted: string[];
  private consensus: {
    sequence: ISequence;
    statistics: {
      letter: string;
      position: number;
      occurrences: number;
    }[];
  };

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
   * @param sequences
   */
  public constructor(name: string, sequencesAsInput: ISequence[]) {
    this.uuid = generateUUIDv4();
    this.name = name;
    this.sequences = new Map<SequenceSorter, ISequence[]>();
    this.sequences.set(SequenceSorter.INPUT, sequencesAsInput);
    this.querySequence = sequencesAsInput[0];
    this.predictedNT = true;

    //
    //generate statistics
    //
    const start = new Date();
    const allLettersInAlignment: { [key: string]: number } = {}; //all letters in the alignment

    // aggregate stats for each position and globally including
    // the number of time each amino acid occurs
    // ** this loop takes the bulk of the initialization time
    for (
      let sequenceIdx = 0;
      sequenceIdx < sequencesAsInput.length;
      sequenceIdx++
    ) {
      const seq = sequencesAsInput[sequenceIdx].sequence;
      for (let positionIdx = 0; positionIdx < seq.length; positionIdx++) {
        const letter = seq[positionIdx];
        const letterIsAlpha = letter.match(/[a-z]/i) ? true : false;
        if (
          letterIsAlpha &&
          this.predictedNT &&
          Nucleotide.fromSingleLetterCode(letter) === Nucleotide.UNKNOWN
        ) {
          this.predictedNT = false;
        }

        const position = positionIdx; // zero based
        allLettersInAlignment[letter] = 1;

        let letterCounts = this.positionalLetterCounts.get(position);
        if (!letterCounts) {
          letterCounts = {};
          this.positionalLetterCounts.set(position, letterCounts);
        }
        if (letter in letterCounts === false) {
          letterCounts[letter] = 0;
        }
        letterCounts[letter] += 1;

        if (letterIsAlpha) {
          if (letter in this.globalAlphaLetterCounts === false) {
            this.globalAlphaLetterCounts[letter] = 0;
          }
          this.globalAlphaLetterCounts[letter] += 1;
        }
      }
    }

    //get a list of all the upper letters found in the alignment
    this.allUpperAlphaLettersInAlignmentSorted = Object.keys(
      allLettersInAlignment
    )
      .sort()
      .reduce((arr: string[], value: string) => {
        if (value.match(/[A-Z]/)) {
          // only keep letters
          arr.push(value);
        }
        return arr;
      }, []);

    //determine consensus sequence
    const consensusStats = Array.from(this.positionalLetterCounts).map(
      ([position, letterCounts]) => {
        const topLetter = Object.keys(letterCounts).reduce((a, b) => {
          const aIsLetter = a.match(/[a-z]/i);
          const bIsLetter = b.match(/[a-z]/i);
          if (aIsLetter && !bIsLetter) {
            return a;
          }
          if (bIsLetter && !aIsLetter) {
            return b;
          }
          return letterCounts[a] > letterCounts[b] ? a : b;
        });
        return {
          position: position,
          letter: topLetter,
          occurrences: letterCounts[topLetter],
        };
      }
    );
    this.consensus = {
      sequence: {
        id: "consensus",
        sequence: consensusStats.map((s) => s.letter).join(""),
      },
      statistics: consensusStats,
    };

    console.log(
      "done parsing alignment. took " +
        (new Date().getTime() - start.getTime()) +
        "ms"
    );
  }

  /**
   * Is this alignment predicted to be nucleotides?
   * @returns true if it is predicted to be nucleotide sequences.
   */
  getPredictedType(): AlignmentTypes {
    return this.predictedNT
      ? AlignmentTypes.NUCLEOTIDE
      : AlignmentTypes.AMINOACID;
  }

  /**
   * Returns a default nucleotide or amino acid style for this alignment,
   * predicted from the sequence itself.
   */
  getDefaultStyle(): AminoAcidAlignmentStyle | NucleotideAlignmentStyle {
    return this.predictedNT
      ? new NucleotideAlignmentStyle()
      : new AminoAcidAlignmentStyle();
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
   * Get an ace editor mode for this alignemnt. If one doesn't exist
   * then it will be defined.
   * @returns the ace editor mode for this alignment
   */
  getAceEditorMode() {
    if (!this.aceEditorMode) {
      this.aceEditorMode = "ace/mode/" + this.uuid;
      defineNewAlignmentMode(this.aceEditorMode, this);
    }
    return this.aceEditorMode;
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
   * Get the length of the longest sequence
   * @returns the length of the largest sequence in this alignment
   */
  getMaxSequenceLength(): number {
    return this.getSequences().reduce((acc, seq) => {
      if (seq.sequence.length > acc) {
        acc = seq.sequence.length;
      }
      return acc;
    }, -1);
  }

  /**
   * Get the frequencies of all letters in this alignment for each position.
   * @param normalize if true, will normalize the returned letter counts for each
   *                  position such that each sums to 1.
   * @param validLetters if provided, only those letters will be included
   *                     in the resulting counts
   * @returns a Map whose keys are position (ordered) and values are a dictionary
   *          with [key = letter (e.g., amino acid code)] and [value = # occurrences].
   * TODO: Test parameter use cases.
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
  getSequences(sortBy?: SequenceSorter, forceReSort?: boolean): ISequence[] {
    sortBy = sortBy ? sortBy : SequenceSorter.INPUT;
    forceReSort = forceReSort ? forceReSort : false;
    if (
      sortBy !== SequenceSorter.INPUT &&
      (!this.sequences.has(sortBy) || forceReSort)
    ) {
      //cache not yet populated for this sort option
      this.sequences.set(
        sortBy,
        sortBy.sortFn(this.sequences.get(SequenceSorter.INPUT)!, this)
      );
    }
    return this.sequences.get(sortBy)!;
  }

  /**
   * Get a sorted list of all of the upper case letters in the alignment.
   * @returns a list of all letters in the alignment sorted alphabetically.
   */
  getAllUpperAlphaLettersInAlignmentSorted(): string[] {
    return this.allUpperAlphaLettersInAlignmentSorted;
  }

  /**
   * Get all the first sequence in the alignment, aka, target / query / first
   * @returns all sequences in this alignment
   */
  getQuerySequence(): ISequence {
    return this.querySequence;
  }

  /**
   * Set the query sequence
   * @param newQuery The new query sequence. Must already exist in the alignment.
   * @throws an error if the query sequence does not yet exist in the alignment
   *
   * IMPORTANT: Requires re-sorting
   */
  /*setQuerySequence(newQuery: ISequence) {
    const queryInAlignment = this.getSequences().find((seq) => {
      if (seq === newQuery) {
        return true;
      }
      return false;
    });
    if (queryInAlignment !== undefined) {
      this.querySequence = newQuery;

      //the resort could be really slow ... need to rethink.
      SequenceSorter.list.forEach((sortOption) => {
        //updated cached sorted sequences
        if (sortOption.isQuerySequenceDependent) {
          this.getSequences(sortOption, true);
        }
      });
      this.sequences.forEach(
        (sequences: ISequence[], sortBy: SequenceSorter) => {
          this.getSequences(sortBy, true); // force re-sorting, which updates cache
        }
      );
    } else {
      throw Error("query sequence does not exist in alignment");
    }
  }*/
}
