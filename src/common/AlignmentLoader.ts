/**
 * A helper class for loading alignments.
 */
import { Alignment } from "../common/Alignment";
import { FastaAlignment } from "../common/FastaAlignment";
import { StockholmAlignment } from "../common/StockholmAlignment";

export class AlignmentLoadError extends Error {
  errors: { name: string; message: string }[];
  possibleResolution?: string;
  constructor(
    message: string,
    errors: { name: string; message: string }[],
    possibleResolution?: string
  ) {
    super(message);
    this.errors = errors;
    this.possibleResolution = possibleResolution;
  }
}

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
    removeDuplicateSequences: boolean,
    callback: (a: Alignment) => void,
    errorCallback: (e: AlignmentLoadError) => void,
    alignmentName?: string
  ) {
    let f;
    try {
      f = new File(
        [await (await fetch(`${url}`)).blob()],
        alignmentName ? alignmentName : url.substring(url.lastIndexOf("/") + 1)
      );
    } catch (e) {
      console.error("Unable to load alignment by URL '" + url + "'", e);
      const err = new AlignmentLoadError(
        "Unable to fetch alignment in URL",
        [{ name: "Browser-reported error message", message: (e as Error).message }],
        "Possible causes: (1) The alignment is not sent using SSL or (2) the server that hosts " +
          "the alignment has not enabled CORS. To be assessible to Alignment Viewer 2, the " +
          "alignment must be served by HTTPS and the server must enable CORS."
      );
      errorCallback(err);
      return;
    }

    try {
      AlignmentLoader.loadAlignmentFromFile(
        f,
        removeDuplicateSequences,
        callback,
        errorCallback
      );
    } catch (e) {
      errorCallback(e as AlignmentLoadError);
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
    removeDuplicateSequences: boolean,
    callback: (a: Alignment) => void,
    errorCallback: (e: AlignmentLoadError) => void
  ) {
    var reader = new FileReader();
    reader.onload = (e) => {
      try {
        callback(
          AlignmentLoader.loadAlignmentFromText(
            file.name,
            reader.result as string,
            removeDuplicateSequences
          )
        );
      } catch (e) {
        errorCallback(e as AlignmentLoadError);
      }
    };
    reader.readAsText(file);
  }

  /**
   * Parse an alignment from text
   * @param alignmentName
   * @param text
   * @throws an AlignmentLoadError if the text cannot be parsed.
   */
  public static loadAlignmentFromText(
    alignmentName: string,
    text: string,
    removeDuplicateSequences: boolean
  ) {
    const err = new AlignmentLoadError("Alignment Format Error", []);
    for (let i = 0; i < AlignmentLoader.AlignmentFileTypes.length; i++) {
      try {
        const toreturn = AlignmentLoader.AlignmentFileTypes[i].fromFileContents(
          alignmentName,
          text,
          removeDuplicateSequences
        );
        return toreturn;
      } catch (e) {
        err.errors.push(e as { name: string; message: string });
      }
    }
    throw err;
  }
}
