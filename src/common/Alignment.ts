import { generateUUIDv4 } from "./Utils";
import { defineNewAlignmentMode } from "./AceAlignmentMode";
import { Nucleotide } from "./Residues";
import {
  AlignmentTypes,
  AminoAcidAlignmentStyle,
  NucleotideAlignmentStyle,
} from "./MolecularStyles";

export interface ISequence {
  id: string;
  sequence: string;
}

enum DistanceFunctions {
  "hamming",
}
export class SequenceSortOptions {
  static readonly INPUT = new SequenceSortOptions(
    "as-input",
    "As input",
    false
  );
  static readonly HAMMING_DIST_TARGET = new SequenceSortOptions(
    "hamming-dist-to-target",
    "Hamming distance to target sequence",
    true,
    DistanceFunctions.hamming
  );

  static list = [
    SequenceSortOptions.INPUT,
    SequenceSortOptions.HAMMING_DIST_TARGET,
  ];

  static fromKey(key: string) {
    return SequenceSortOptions.list.find((at) => {
      return at.key === key;
    });
  }

  private constructor(
    public readonly key: string,
    public readonly description: string,
    public readonly isTargetSequenceDependent: boolean,
    public readonly distanceFn?: DistanceFunctions
  ) {}
}

/**
 * Alignment
 * This class represents a multiple sequence alignment. During initialization,
 * positional statistics are generated about the alignment and a consensus
 * sequence is determined.
 *
 * The class should be instantiated using the static methods:
 *     fromFileContents: accepts a fasta file-like string
 */
export class Alignment {
  private uuid: string;
  private aceEditorMode: string | undefined;
  private name: string;
  private predictedNT: boolean;
  private sequences: Map<SequenceSortOptions, ISequence[]>;
  private targetSequence: ISequence;
  private positionalLetterCounts = new Map<
    number,
    { [letter: string]: number }
  >();
  private globalAlphaLetterCounts: { [letter: string]: number } = {};
  private allUpperAlphaLettersInAlignmentSorted: string[];
  private consensus: {
    letter: string;
    position: number;
    occurrences: number;
  }[] = [];

  /**
   * Create and return a new Alignment object from a fasta-type file
   * @param fileContents the multiple sequence alignment fasta file as a string
   */
  static fromFileContents(fileName: string, fileContents: string): Alignment {
    const fastaSplitCaret = fileContents.split(">");
    var sequences: ISequence[] = [];
    for (var i = 0; i < fastaSplitCaret.length; i++) {
      const seqArr = fastaSplitCaret[i].split(/\r?\n/);
      if (seqArr.length > 1) {
        var seqObj = {
          id: seqArr[0],
          sequence: seqArr.slice(1).join(""),
        };
        sequences.push(seqObj);
      }
    }
    return new Alignment(fileName, sequences);
  }

  /**
   * Determine the distance between two sequences
   * @param seq1
   * @param seq2
   * @param distFn what method should be used to calculate distance
   * @returns the distance between the sequence pair
   * @throws an Error if an invalid distance function is provided.
   */
  private static getSequenceDistance(
    seq1: ISequence,
    seq2: ISequence,
    distFn: DistanceFunctions
  ) {
    const minLength =
      seq1.sequence.length < seq2.sequence.length
        ? seq1.sequence.length
        : seq2.sequence.length;
    let distance = 0;

    if (distFn === DistanceFunctions.hamming) {
      for (var i = 0; i < minLength; i++) {
        if (seq1.sequence[i] !== seq2.sequence[i]) {
          distance += 1;
        }
      }
      return distance;
    }
    throw Error(
      "Unable to determine sequence distance with distance function " + distFn
    );
  }

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
   * Create a new Alignment object. The default target sequence will
   * be set to the first sequence in sequences. This can be changed
   * by calling setTargetSequence() after creation
   * @param sequences
   */
  public constructor(name: string, sequencesAsInput: ISequence[]) {
    this.uuid = generateUUIDv4();
    this.name = name;
    this.sequences = new Map<SequenceSortOptions, ISequence[]>();
    this.sequences.set(SequenceSortOptions.INPUT, sequencesAsInput);
    this.targetSequence = sequencesAsInput[0];
    this.predictedNT = true;

    //
    //generate statistics
    //
    const start = new Date();
    const allLettersInAlignment: { [key: string]: number } = {}; //all letters in the alignment

    //this for loop takes the bulk of the time
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

    this.consensus = Array.from(this.positionalLetterCounts).map(
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
  getPositionalLetterCounts(asFraction?: boolean, validLetters?: string[]) {
    if (asFraction || validLetters) {
      return Array.from(this.positionalLetterCounts).reduce(
        (acc, [position, letterCounts]) => {
          acc.set(
            position,
            asFraction
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
  getSequences(
    sortBy?: SequenceSortOptions,
    forceReSort?: boolean
  ): ISequence[] {
    sortBy = sortBy ? sortBy : SequenceSortOptions.INPUT;
    forceReSort = forceReSort ? forceReSort : false;
    if (!this.sequences.has(sortBy) || forceReSort) {
      //cache not yet populated for this sort option
      switch (sortBy) {
        case SequenceSortOptions.INPUT:
          break;
        case SequenceSortOptions.HAMMING_DIST_TARGET:
          this.sequences.set(
            sortBy,
            this.sortByDistanceToTargetSequence(
              SequenceSortOptions.HAMMING_DIST_TARGET.distanceFn!
            )
          );
          break;
        default:
          throw Error(
            `The sortBy option provided "${sortBy}" is not implemented`
          );
      }
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
  getTargetSequence(): ISequence {
    return this.targetSequence;
  }

  /**
   * Set the target sequence
   * @param newTarget The new target sequence. Must already exist in the alignment.
   * @throws an error if the target sequence does not yet exist in the alignment
   *
   * IMPORTANT: Requires re-sorting
   */
  setTargetSequence(newTarget: ISequence) {
    const targetInAlignment = this.getSequences().find((seq) => {
      if (seq === newTarget) {
        return true;
      }
      return false;
    });
    if (targetInAlignment !== undefined) {
      this.targetSequence = newTarget;

      this.sequences.forEach(
        (sequences: ISequence[], sortBy: SequenceSortOptions) => {
          this.getSequences(sortBy, true); // force re-sorting, which updates cache
        }
      );
    } else {
      throw Error("target sequence does not exist in alignment");
    }
  }

  /**
   * This method sorts sequences or
   * Sort the current alignment similarity to the target sequence
   * @returns a new alignment whose sequences are sorted in descending
   *          order by similarity to the target sequence.
   */
  private sortByDistanceToTargetSequence(distFn: DistanceFunctions) {
    const inputSequences = this.getSequences();
    switch (distFn) {
      case DistanceFunctions.hamming:
        return inputSequences
          .map((s) => s)
          .sort((seq1, seq2) => {
            const dist1 = Alignment.getSequenceDistance(
              this.targetSequence,
              seq1,
              DistanceFunctions.hamming
            );
            const dist2 = Alignment.getSequenceDistance(
              this.targetSequence,
              seq2,
              DistanceFunctions.hamming
            );
            return dist1 - dist2;
          });
      default:
        throw Error(
          `The distFn option provided "${distFn}" is not implemented`
        );
    }
  }
}
