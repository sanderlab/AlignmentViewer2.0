import { Alignment, ISequence } from "./Alignment";

/**
 * FastaAlignment
 * This class represents a Fasta formatted multiple sequence alignment.
 */
export class FastaAlignment extends Alignment {
  /**
   * Parse a string that contains a fasta alignment.
   * @param fileName
   * @param fileContents
   */
  static fromFileContents(
    fileName: string,
    fileContents: string
  ): FastaAlignment {
    const fastaSplitCaret = fileContents.trim().split(">");
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
    return new FastaAlignment(fileName, sequences);
  }
}
