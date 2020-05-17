/**
 * A helper class for loading alignments.
 */
import { Alignment } from "../common/Alignment";
import { FastaAlignment } from "../common/FastaAlignment";
import { StockholmAlignment } from "../common/StockholmAlignment";

export class AlignmentLoader {
  /**
   * List of all possible alignments. The order is respected when attempting
   * to parse an alignment from text / url / file.
   */
  public static AlignmentFileTypes = [StockholmAlignment, FastaAlignment];

  /**
   * Load an alignment from a URL.
   * @param url
   * @param callback will be called on successful loading of alignment
   * @param errorCallback will be called if the url fails to load or the
   *                      contents are unable to be parsed.
   * @param alignmentName explicitly set the alignment name - otherwise will
   *                      be guessed from the url.
   */
  public static async loadAlignmentFromURL(
    url: string,
    callback: (a: Alignment) => void,
    errorCallback: (e: Error[]) => void,
    alignmentName?: string
  ) {
    try {
      const f = new File(
        [await (await fetch(`${url}`)).blob()],
        alignmentName ? alignmentName : url.substring(url.lastIndexOf("/") + 1)
      );
      AlignmentLoader.loadAlignmentFromFile(f, callback, errorCallback);
    } catch (e) {
      errorCallback(e);
    }
  }

  /**
   * Load an alignment from a File.
   * @param file
   * @param callback will be called on successful loading of alignment
   * @param errorCallback will be called if the url fails to load or the
   *                      contents are unable to be parsed.
   */
  public static async loadAlignmentFromFile(
    file: File,
    callback: (a: Alignment) => void,
    errorCallback: (e: Error[]) => void
  ) {
    var reader = new FileReader();
    reader.onload = (e) => {
      try {
        callback(
          AlignmentLoader.loadAlignmentFromText(
            file.name,
            reader.result as string
          )
        );
      } catch (e) {
        errorCallback(e);
      }
    };
    reader.readAsText(file);
  }

  /**
   * Parse an alignment from text
   * @param alignmentName
   * @param text
   * @throws an excpetion if the text cannot be parsed.
   */
  public static loadAlignmentFromText(alignmentName: string, text: string) {
    const errors: Error[] = [];
    for (let i = 0; i < AlignmentLoader.AlignmentFileTypes.length; i++) {
      try {
        const toreturn = AlignmentLoader.AlignmentFileTypes[i].fromFileContents(
          alignmentName,
          text
        );
        return toreturn;
      } catch (e) {
        errors.push(e);
      }
    }
    throw errors;
  }
}
