import { getPositionalAxisRuler } from "../components/PositionalAxisHook";
import { Alignment } from "./Alignment";
import { AlignmentTypes, AminoAcidAlignmentStyle, IColorScheme, NucleotideAlignmentStyle, PositionsToStyle, ResidueColoring } from "./MolecularStyles";
import { AminoAcid, Nucleotide } from "./Residues";
import { startEndIdxToArray } from "./Utils";




/**
 * Pull the logo dom element off the page, clean up the dom a bit, add styling
 * and intiate a download.
 * @param style 
 */
export function downloadLogoSvg(props: {
  alignment: Alignment, 
  style: AminoAcidAlignmentStyle | NucleotideAlignmentStyle
}){
  const {
    alignment,
    style
  } = props;

  const svgLogoElements = document.getElementsByClassName("av2-sequence-logo");
  if (svgLogoElements.length < 1){
    console.error(
      "ERROR: no logo on page (no elements with 'av2-sequence-logo' found on the page)"
    );
  }
  else{
    const svgElement = svgLogoElements[0].cloneNode(true) as SVGElement;

    //1. remove the interaction placeholder rectangles
    const placeholders = svgElement.getElementsByClassName("interaction-placeholder");
    for (var i = placeholders.length - 1; i >= 0; --i) {
      placeholders[i].remove();
    }
    
    //2. add the classes to the decorate with the current color
    const newStyleDom = document.createElement('style')
    newStyleDom.setAttribute("type", "text/css");
    newStyleDom.textContent = Object.entries(
      style.selectedColorScheme.colors
    ).map(([resiCode, color])=>{
      return `path.resi_${resiCode}{ 
        color: ${color}; 
        fill: ${color};
      }`;
    }).join('\n');
    svgElement.insertBefore(
      newStyleDom, svgElement.firstChild!
    );

    //(3) setup and request download
    var url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
      svgElement.outerHTML.replaceAll(
        "resi_", "r" //illustrator can't handle underscores in class names
      )
    );
    var link = document.createElement("a");
    link.download = `logo_${alignment.getName()}.svg`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

  /**
   * 
   * @param props 
   */
  export function downloadAlignment(props: {
    alignment: Alignment, 
    alignmentType: AlignmentTypes, 
    positionsToStyle: PositionsToStyle, 
    residueColoring: ResidueColoring, 
    colorScheme: IColorScheme,
    startIdx?: number, 
    endIdx?: number
  }){
    const {
      alignment, 
      alignmentType, 
      positionsToStyle, 
      residueColoring, 
      colorScheme,
      endIdx,
      startIdx = 0,
    } = props;

    const startSeqIdx = startIdx;
    const endSeqIdx = endIdx !== undefined 
      ? endIdx
      : alignment.getSequenceCount() > 100 
        ? 99 
        : alignment.getSequenceCount()-1;
    
    const moleculeWidth = 7;
    const moleculeHeight = 10;

    const seqs = alignment.getSequences();
    const exportedSeqs = startEndIdxToArray(startSeqIdx, endSeqIdx).map(
      seqIdx => seqs[seqIdx]
    );
    const maxGenenameCharCount = exportedSeqs.reduce((acc, seq) => {
      return acc > seq.id.length ? acc : seq.id.length;
    }, -1);
    const genenameWidth = maxGenenameCharCount * moleculeWidth;

    const moleculeClass = alignmentType === AlignmentTypes.AMINOACID 
      ? AminoAcid 
      : Nucleotide;
    
    //Collect all unique letters being exported
    const allLettersInExport = [...new Set( //only take unique set
      [ //make sure to include unknown - this is what is exported for unknown letters,
        //lower case letters, and letters outside positions to style.
        moleculeClass.UNKNOWN.singleLetterCode,
        ...exportedSeqs.map((seq)=>{
          return seq.sequence.split("");
        }).join("")
      ])
    ];

    //Collect unique letters being exported at each position 
    const posidxLetters = new Map<number, string[]>();
    for(let posIdx=0; posIdx < exportedSeqs[0].sequence.length; posIdx++){
      posidxLetters.set(
        posIdx, 
        [...new Set( //only take unique set
          exportedSeqs.reduce((acc, seq) => {
            acc.push(seq.sequence[posIdx]);
            return acc;
          }, [] as string[])
        )]
      );
    }

    //get colors for each letter (position agnostic)
    const letterToColors = allLettersInExport.reduce((acc, letter)=>{
      const molecule = moleculeClass.fromSingleLetterCode(letter);
      const molColorset = molecule.colors.get(colorScheme)!.get(residueColoring)!;
      acc[letter] = {
        letter: letter,
        backgroundColor: molColorset.backgroundColor["hexString"],
        letterColor: molColorset.letterColor["hexString"]
      };
      return acc;
    }, {} as {
      [letter: string]: {
        letter: string,
        backgroundColor: string,
        letterColor: string
      }
    });

    const getIdForLetter = (letter: string, positionIdx?: number) => {
      const baseId = letter === "." 
        ? "dot" 
        : letter==="-" 
          ? "dash" 
          : letter;

      return positionIdx !== undefined && positionsToStyle !== PositionsToStyle.ALL
        ? `${baseId}${positionIdx}` 
        : baseId;
    }

    //
    // (1) setup the names
    //
    const idElements = exportedSeqs.map((seq, seqIdx) => {
      return [
        //unsure why the width needs to be less than the starting width
        //UPDATE: width is different beause it is a full string rather than broken characters
        //separated out per position as in the matrix. - I had to break up the positional axis
        //to make it exact and we could do so here, but I think having the sequence ids as
        //full strings is more useful.
        `<g transform="translate(${genenameWidth - moleculeWidth}, ${seqIdx * moleculeHeight+moleculeHeight})">`,
          '<text text-anchor="end"',
          'font-family="monospace"',
          'font-size="10px"',
          'dominant-baseline="hanging"',
          `fill="black" border="black">${seq.id}</text>`,
        `</g>`
      ].join(" ")
    });

    //
    // (2) setup the position axis
    //
    const positionalAxisText = getPositionalAxisRuler(exportedSeqs[0].sequence.length);
    const positionalTextElem = [
      `<g transform="translate(${genenameWidth}, 0)">`,
        ...positionalAxisText.split("").map((char, charIdx)=>{
          return [
            '<text ',
              `dx="${charIdx*moleculeWidth}"`,
              'font-family="monospace"',
              'font-size="10px"',
              `dominant-baseline="hanging"`,
              `text-anchor="start"`,
              `fill="black">${char}</text>`
          ].join(" ");
        }),
      `</g>`
    ].join(" ")

    //
    // (3) generate the definitions for each square - color box + AA/NT code
    //
    const getLetterDef = (
      id: string,
      letter: string,
      bgColor: string, 
      letterColor: string
    ) => {
      const textElem = [
        '<text ',
        'font-family="monospace"',
        'font-size="10px"',
        `x="${moleculeWidth/2}"`,
        `dominant-baseline="hanging"`,
        `text-anchor="middle"`,
        `fill="${letterColor}">${letter}</text>`
      ].join(" ");

      const rectElem = [
        `<rect`,
        `x="0" y="0"`,
        `width="${moleculeWidth}"`,
        `height="${moleculeHeight}"`,
        `fill="${bgColor}"/>`
      ].join(" ");

      return `<g id="${id}">${rectElem}${textElem}</g>`;
    };
    const letterDefs = positionsToStyle === PositionsToStyle.ALL
      ? allLettersInExport.map((letter)=>{
          //option 1: colors are not based on position (i.e., color all)
          const colors = letterToColors[letter];
          return getLetterDef(
            getIdForLetter(letter), //id
            letter,
            colors.backgroundColor as string, 
            colors.letterColor as string
          )
        })
      : Array.from(posidxLetters).map(([posIdx, lettersAtPosition]) => {
          //option 2: colors are based on position (i.e., same as or different than query/consensus)
          const querySeq = alignment.getQuery().sequence;
          const consensusSeq = alignment.getConsensus().sequence;
          const colorArr = lettersAtPosition.map(letter => {
            return (positionsToStyle === PositionsToStyle.QUERY && letter === querySeq[posIdx]) ||
                   (positionsToStyle === PositionsToStyle.QUERY_DIFF && letter !== querySeq[posIdx]) ||
                   (positionsToStyle === PositionsToStyle.CONSENSUS && letter === consensusSeq[posIdx]) ||
                   (positionsToStyle === PositionsToStyle.CONSENSUS_DIFF && letter !== consensusSeq[posIdx])
                    ? letterToColors[letter]
                    : { 
                        ...letterToColors[moleculeClass.UNKNOWN.singleLetterCode],
                        letter: letter //set the letter to be correct with the unknown style
                      };
          });
          return colorArr.map(colors=>{
            return getLetterDef(
              getIdForLetter(colors.letter, posIdx), 
              colors.letter,
              colors.backgroundColor as string, 
              colors.letterColor as string
            )
          }).join("\n");
        });

    //
    // (4) generate the MSA matrix of squares (color box + AA/NT code)
    //
    const msa = exportedSeqs.map((seq, seqIdx)=>{
      return [
        `<g transform="translate(${genenameWidth}, ${seqIdx * moleculeHeight+moleculeHeight})">`,
        ...seq.sequence.split("").map((letter, posIdx)=>{
          return `<use xlink:href="#${getIdForLetter(letter, posIdx)}" x="${posIdx * moleculeWidth}"/>`;
        }),
        `</g>`
      ].join("\n");
    });

    //
    // (3) create the file
    //
    const totalWidth = (
      genenameWidth +
      (alignment.getSequenceLength() * moleculeWidth) //width of MSA letters
    );
    const totalHeight = (
      (endSeqIdx-startSeqIdx+1) * moleculeHeight + //num of sequences * height of sequences
      moleculeHeight // for the extra positional axis bar
    );
    const fileContentsArr = [
      `<?xml version="1.0" encoding="utf-8"?>`,
      `<svg viewBox="0 0 ${totalWidth} ${totalHeight}" 
            xmlns="http://www.w3.org/2000/svg" 
            xmlns:xlink="http://www.w3.org/1999/xlink">`,
      "<defs>",
      ...letterDefs,
      "</defs>",
      positionalTextElem,
      ...idElements,
      ...msa,
      "</svg>"
    ].join("\n");

    //(3) setup and request download
    var url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(fileContentsArr);
    var link = document.createElement("a");
    link.download = `msa_${startSeqIdx}_${endSeqIdx}_${alignment.getName()}.svg`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };