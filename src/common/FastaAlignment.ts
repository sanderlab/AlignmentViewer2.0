import { Alignment, ISequence } from "./Alignment";
import { getParseError } from "./Utils";
import { parseSequenceAnnotations } from './Annotations'

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
    fileContents: string,
    removeDuplicateSequences?: boolean
  ): FastaAlignment {
    const trimmedFile = fileContents.trim();
    if (trimmedFile.length < 1 || trimmedFile[0] !== ">") {
      throw getParseError("Fasta", "File needs to begin with '>'");
    }

    const fastaSplitCaret = trimmedFile.split(">");
    var sequences: ISequence[] = [];
    for (var i = 0; i < fastaSplitCaret.length; i++) {
      const seqArr = fastaSplitCaret[i].split(/\r?\n/);
      if (seqArr.length > 1) {
        const idDesc = seqArr[0].match(/^\s*(?<id>\S+)(?:\s+(?<description>.+\S+)\s*)?$/)?.groups;
        const sequence = seqArr.slice(1).join("");
        if (idDesc) {
          sequences.push({
            sequence,
            annotations: parseSequenceAnnotations(idDesc.id, sequence, idDesc.description),
          });
        }
      }
    }
    try {
      return new FastaAlignment({
        name: fileName, 
        sequencesAsInput: sequences, 
        removeDuplicateSequences: removeDuplicateSequences
      });
    } catch (e) {
      throw getParseError("Fasta", (e as Error).message);
    }
  }
}
