/**
 * This class conatins methods for sorting sequences
 */
import { IListOfPropObjects, IPropObjectInstanceInList } from "./GlobalEnumObject";
import { Alignment, ISequence } from "./Alignment";
import { BLOSUM62 } from "./BLOSUM";


export interface SequenceSorterInstance extends IPropObjectInstanceInList {
  targetAlignmentType: "aminoacid" | "nucleotide" | "both";
  sortFn: (
    sequencesAsInput: ISequence[],
    alignment: Alignment
  ) => ISequence[];
}

export const SequenceSorter = (() => {
  //
  //
  // HELPER
  //
  //
  function hammingDistance(seq1: ISequence, seq2: ISequence) {
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

  function blosumScore(seq1: ISequence, seq2: ISequence) {
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

  
  //
  //
  // AVAILBLE SORT TYPES WITH FUNCTIONS
  //
  //
  const propList = {

    INPUT: {
      key: "as-input",
      description: "As input",
      targetAlignmentType: "both",
      sortFn: (sequencesAsInput, alignment) => sequencesAsInput
     } satisfies SequenceSorterInstance,
    
    HAMMING_DIST_QUERY: {
      key: "hamming-dist-to-query",
      description: "Hamming distance to query sequence",
      targetAlignmentType: "both",
      sortFn: (sequences, alignment) => {
          const querySeq = alignment.getQuery();
          return sequences
            .map((s) => s) //copy list
            .sort((seq1, seq2) => {
              const dist1 = hammingDistance(querySeq, seq1);
              const dist2 = hammingDistance(querySeq, seq2);
              return dist1 - dist2;
            });
        }
    } satisfies SequenceSorterInstance,
    
    HAMMING_DIST_CONSENSUS: {
      key: "hamming-dist-to-consensus",
      description: "Hamming distance to consensus sequence",
      targetAlignmentType: "both",
      sortFn: (sequences, alignment) => {
        const consensusSeq = alignment.getConsensus();
        return sequences
          .map((s) => s)
          .sort((seq1, seq2) => {
            const dist1 = hammingDistance(consensusSeq, seq1);
            const dist2 = hammingDistance(consensusSeq, seq2);
            return dist1 - dist2;
          });
        }
    } satisfies SequenceSorterInstance,
    
    BLOSUM62_SCORE_QUERY: {
      key: "blosum-score-to-query",
      description: "BLOSUM62 score to query sequence",
      targetAlignmentType: "aminoacid",
      sortFn: (sequences, alignment) => {
        const querySeq = alignment.getQuery();
        return sequences
          .map((s) => s)
          .sort((seq1, seq2) => {
            const dist1 = blosumScore(querySeq, seq1);
            const dist2 = blosumScore(querySeq, seq2);
            return dist2 - dist1; //reverse from distance
          });
        }
    } satisfies SequenceSorterInstance,
    
    BLOSUM62_SCORE_CONSENSUS: {
      key: "blosum-score-to-consensus",
      description: "BLOSUM62 score to consensus sequence",
      targetAlignmentType: "aminoacid",
      sortFn: (sequences, alignment) => {
        const consensusSeq = alignment.getConsensus();
        return sequences
          .map((s) => s)
          .sort((seq1, seq2) => {
            const dist1 = blosumScore(consensusSeq, seq1);
            const dist2 = blosumScore(consensusSeq, seq2);
            return dist2 - dist1; //reverse from distance
          });
        }
    } satisfies SequenceSorterInstance,
  };
  
  // 
  // 
  // LIST OF ALL AVAILABLE OPTIONS
  // 
  // 
  const propListObj = IListOfPropObjects(Object.values(propList));

  const aminoAcidSorters = propListObj.list.reduce((
    acc, seqSort
  ) => {
    if (
      (seqSort as SequenceSorterInstance).targetAlignmentType === "aminoacid" ||
      (seqSort as SequenceSorterInstance).targetAlignmentType === "both"
    ) {
      acc.push(seqSort as SequenceSorterInstance);
    }
    return acc;
  }, [] as SequenceSorterInstance[]);

  const nucleotideSorters = propListObj.list.reduce((
    acc, seqSort
  ) => {
    if (
      (seqSort as SequenceSorterInstance).targetAlignmentType === "nucleotide" ||
      (seqSort as SequenceSorterInstance).targetAlignmentType === "both"
    ) {
      acc.push(seqSort as SequenceSorterInstance);
    }
    return acc;
  }, [] as SequenceSorterInstance[]);

  return {
    ALL_AMINO_ACID_SORTERS: aminoAcidSorters,
    ALL_NUCLEOTIDE_SORTERS: nucleotideSorters,
    ...propList,
    ...IListOfPropObjects<SequenceSorterInstance>(Object.values(propList))
  };
})();
