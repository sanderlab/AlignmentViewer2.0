/**
 * This class conatins methods for sorting sequences
 */
import { Alignment, ISequence } from "./Alignment";
import { BLOSUM62 } from "./BLOSUM";

export class SequenceSorter {
  /*
   *
   *
   * HELPER
   *
   *
   */
  private static hammingDistance(seq1: ISequence, seq2: ISequence) {
    const minLength =
      seq1.sequence.length < seq2.sequence.length
        ? seq1.sequence.length
        : seq2.sequence.length;
    //if they are not the same length, those extra positions in one
    //sequence count as differences to the other sequence
    let distance = Math.abs(seq1.sequence.length - seq2.sequence.length);
    for (var i = 0; i < minLength; i++) {
      if (seq1.sequence[i] !== seq2.sequence[i]) {
        distance += 1;
      }
    }
    return distance;
  }

  private static blosumScore(seq1: ISequence, seq2: ISequence) {
    const minLength =
      seq1.sequence.length < seq2.sequence.length
        ? seq1.sequence.length
        : seq2.sequence.length;
    let score = 0;
    for (var i = 0; i < minLength; i++) {
      if (
        BLOSUM62.has(seq1.sequence[i]) &&
        BLOSUM62.get(seq1.sequence[i])!.has(seq2.sequence[i])
      ) {
        score += BLOSUM62.get(seq1.sequence[i])!.get(seq2.sequence[i])!;
      } else {
        //one or both letters are not in the blosum alignment. Occurs when
        //there are lower case letters or gaps.
        //TODO: is counting as zero the correct way to handle this?
      }
    }
    return score;
  }

  /*
   *
   *
   * AVAILBLE SORT TYPES WITH FUNCTIONS
   *
   *
   */
  static readonly INPUT = new SequenceSorter(
    "as-input",
    "As input",
    false,
    "both",
    (sequencesAsInput, alignment) => sequencesAsInput
  );

  static readonly HAMMING_DIST_QUERY = new SequenceSorter(
    "hamming-dist-to-query",
    "Hamming distance to query sequence",
    true,
    "both",
    (sequences, alignment) => {
      const querySeq = alignment.getQuerySequence();
      return sequences
        .map((s) => s)
        .sort((seq1, seq2) => {
          const dist1 = SequenceSorter.hammingDistance(querySeq, seq1);
          const dist2 = SequenceSorter.hammingDistance(querySeq, seq2);
          return dist1 - dist2;
        });
    }
  );

  static readonly HAMMING_DIST_CONSENSUS = new SequenceSorter(
    "hamming-dist-to-consensus",
    "Hamming distance to consensus sequence",
    true,
    "both",
    (sequences, alignment) => {
      const consensusSeq = alignment.getConsensus();
      return sequences
        .map((s) => s)
        .sort((seq1, seq2) => {
          const dist1 = SequenceSorter.hammingDistance(consensusSeq, seq1);
          const dist2 = SequenceSorter.hammingDistance(consensusSeq, seq2);
          return dist1 - dist2;
        });
    }
  );

  static readonly BLOSUM62_SCORE_CONSENSUS = new SequenceSorter(
    "blosum-score-to-consensus",
    "BLOSUM62 score to consensus sequence",
    true,
    "aminoacid",
    (sequences, alignment) => {
      const consensusSeq = alignment.getConsensus();
      return sequences
        .map((s) => s)
        .sort((seq1, seq2) => {
          const dist1 = SequenceSorter.blosumScore(consensusSeq, seq1);
          const dist2 = SequenceSorter.blosumScore(consensusSeq, seq2);
          return dist2 - dist1; //reverse from distance
        });
    }
  );

  static readonly BLOSUM62_SCORE_QUERY = new SequenceSorter(
    "blosum-score-to-query",
    "BLOSUM62 score to query sequence",
    true,
    "aminoacid",
    (sequences, alignment) => {
      const querySeq = alignment.getQuerySequence();
      return sequences
        .map((s) => s)
        .sort((seq1, seq2) => {
          const dist1 = SequenceSorter.blosumScore(querySeq, seq1);
          const dist2 = SequenceSorter.blosumScore(querySeq, seq2);
          return dist2 - dist1; //reverse from distance
        });
    }
  );

  /*
   *
   *
   * LIST OF ALL AVAILABLE OPTIONS
   *
   *
   */
  private static list = [
    SequenceSorter.INPUT,
    SequenceSorter.HAMMING_DIST_QUERY,
    SequenceSorter.HAMMING_DIST_CONSENSUS,
    SequenceSorter.BLOSUM62_SCORE_QUERY,
    SequenceSorter.BLOSUM62_SCORE_CONSENSUS,
  ];

  static aminoAcidSorters = SequenceSorter.list.reduce((acc, seqSort) => {
    if (
      seqSort.targetAlignmentType === "aminoacid" ||
      seqSort.targetAlignmentType === "both"
    ) {
      acc.push(seqSort);
    }
    return acc;
  }, [] as SequenceSorter[]);

  static nucleotideSorters = SequenceSorter.list.reduce((acc, seqSort) => {
    if (
      seqSort.targetAlignmentType === "nucleotide" ||
      seqSort.targetAlignmentType === "both"
    ) {
      acc.push(seqSort);
    }
    return acc;
  }, [] as SequenceSorter[]);

  static fromKey(key: string) {
    return SequenceSorter.list.find((at) => {
      return at.key === key;
    });
  }

  private constructor(
    public readonly key: string,
    public readonly description: string,
    public readonly isQuerySequenceDependent: boolean,
    public readonly targetAlignmentType: "aminoacid" | "nucleotide" | "both",
    public readonly sortFn: (
      sequencesAsInput: ISequence[],
      alignment: Alignment
    ) => ISequence[]
  ) {}
}
