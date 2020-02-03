
export interface Sequence{
  id: string;
  sequence: string;
};



export default class Alignment {

  private sequences: Sequence[] = [];
  private positionalLetterCounts = new Map<number, {[letter:string]: number}>();
  private globalAlphaLetterCounts: {[letter: string]: number} = {};
  private allAlphaLettersSorted: string[];
  private consensus: {
    letter: string,
    position: number,
    occurrences: number
  }[] = [];

  /**
   * Create and return a new Alignment object from a fasta-type file
   * @param fileContents the multiple sequence alignment fasta file as a string
   */
  static fromFile(fileContents: string): Alignment{
    const fastaSplitCaret = fileContents.split('>');
    var sequences: Sequence[] = [];
    for(var i = 0; i < fastaSplitCaret.length; i++){
        const seqArr = fastaSplitCaret[i].split(/\r?\n/);
        if (seqArr.length > 1){
            var seqObj = {
                'id': seqArr[0],
                'sequence': seqArr.slice(1).join('')
            }
            sequences.push(seqObj);
        }
    }
    return new Alignment(sequences);
  }

  /**
   * Normalize all values in an object that contains all counts such that
   * the sum of those counts equals 1.
   * @param letterCounts an object that contains the same keys, but whose
   *                     values now sum to 1.
   * @param validLetters if provided, returned object will only contain letters
   *                     that are in this array.
   */
  static normalizeLetterCounts(letterCounts: {[letter:string]: number}, validLetters?: string[]){
    const totalCounts = Object.keys( letterCounts ).reduce((acc, letter) =>{
      if (!validLetters || validLetters.includes(letter)){
        acc += letterCounts[letter];
      }
      return acc;
    }, 0);

    return Object.keys( letterCounts ).reduce((acc, letter) => {
      if (!validLetters || validLetters.includes(letter)){
        acc[letter] = letterCounts[letter] / totalCounts;
      }
      return acc;
    }, {} as {[letter: string]: number});
  }


  /**
   * Create a new Alignment object
   * @param sequences 
   * @param targetSequence 
   */
  constructor(sequences: Sequence[]){
    this.sequences = sequences;

    //
    //generate statistics
    //
    const start = new Date();
    const allLetters: {[key:string]:number} = {}; //all letters in the alignment
    
    for (let sequenceIdx=0; sequenceIdx < this.sequences.length; sequenceIdx++){
      const seq = this.sequences[sequenceIdx];
      for (let positionIdx=0; positionIdx < seq.sequence.length; positionIdx++){
        const letter = seq.sequence[positionIdx].toUpperCase();
        const letterIsAlpha = letter.match(/[a-z]/i) ? true : false;

        const position = positionIdx+1;
        allLetters[letter] = 1;

        let letterCounts = this.positionalLetterCounts.get(position);
        if (!letterCounts){
          letterCounts = {};
          this.positionalLetterCounts.set(position, letterCounts);
        }
        if (letter in letterCounts === false){
          letterCounts[letter] = 0;
        }
        letterCounts[letter] += 1;

        if (letterIsAlpha){
          if (letter in this.globalAlphaLetterCounts === false){
            this.globalAlphaLetterCounts[letter] = 0;
          }
          this.globalAlphaLetterCounts[letter] += 1;
        }
      }
    };

    this.allAlphaLettersSorted = Object.keys(allLetters)
                                       .sort()
                                       .reduce((arr: string[], value: string) =>{
                                         if(value.match(/[a-z]/i)){ // only keep letters
                                           arr.push(value);
                                         }
                                         return arr;
                                       }, []);

    this.consensus = Array.from( this.positionalLetterCounts ).map(([position, letterCounts]) => {
      const topLetter = this.allAlphaLettersSorted.reduce((acc, currentLetter) => {
        if (acc in letterCounts === false || letterCounts[acc] < letterCounts[currentLetter]){
          return currentLetter;
        }
        return acc;
      });

      return {
        position: position,
        letter: topLetter,
        occurrences: letterCounts[topLetter]
      }
    });
    console.log('done parsing alignment in '+(new Date().getTime() - start.getTime())+'ms');
  }

  /**
   * Get the consensus sequence
   * @returns a position ordered array of objects that contain each letter, its number of
   *          occurrences, and the actual position number
   */
  getConsensus(){
    return this.consensus;
  }

  /**
   * Get the number of gaps at each position
   * @returns an array of gap counts, ordered by position
   */
  getGapsPerColumn(): number[]{
    return Array.from( this.positionalLetterCounts ).map(([position, letterCounts]) => {
      return !isNaN(letterCounts['-']) ? letterCounts['-'] : 0;
    }); 
  }

  /**
   * Get the total number of times each letter appears in the alignment.
   * @param normalize if true, will normalize the returned array such that
   *                  it sums to 1.
   * @param validLetters if provided, only those letters will be included
   *                     in the resulting counts
   */
  getGlobalAlphaLetterCounts(normalize?: boolean, validLetters?: string[]){
    if (normalize){
      return Alignment.normalizeLetterCounts(this.globalAlphaLetterCounts, validLetters);
    }
    return this.globalAlphaLetterCounts;
  }

  /**
   * Get the length of the longest sequence
   * @returns the length of the largest sequence in this alignment
   */
  getMaxSequenceLength(): number{
    return this.sequences.reduce((acc, seq) => {
      if (seq.sequence.length > acc){ acc = seq.sequence.length; }
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
   */
  getPositionalLetterCounts(normalize?: boolean, validLetters?: string[]){
    if (normalize){
      return Array.from(this.positionalLetterCounts).reduce((acc, [position, letterCounts]) => {
        acc.set(position, Alignment.normalizeLetterCounts(letterCounts, validLetters));
        return acc;
      }, new Map<Number, {[letter: string]: number}>());
    }

    return this.positionalLetterCounts;
  }

  /**
   * Get all the sequences in this alignment - ordered as they were input
   * @returns all sequences in this alignment
   */
  getSequences(): Sequence[]{
    return this.sequences;
  }

  /**
   * Get a sorted list of all of the letters in the alignment.
   * @returns a list of all letters in the alignment sorted alphabetically.
   */
  getSortedAlphaLetters(): string[]{
    return this.allAlphaLettersSorted;
  }

  /**
   * Get all the first sequence in the alignment, aka, target / query / first
   * @returns all sequences in this alignment
   */
  getTargetSequence(): Sequence{
    return this.sequences[0];
  }
}