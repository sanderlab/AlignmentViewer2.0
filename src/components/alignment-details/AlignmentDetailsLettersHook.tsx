/**
 * Hook for rendering the letters that appear in the alignment details
 * viewport.
 */
import React from "react";
import "./AlignmentDetails.scss";
import {
  AminoAcidAlignmentStyle,
  NucleotideAlignmentStyle,
  ResidueStyle,
  AlignmentTypes,
  PositionsToStyle,
} from "../../common/MolecularStyles";
import { AminoAcid, Nucleotide } from "../../common/Residues";

/**
 * Get the color of a single letter.
 * @param letter
 * @param positionIdx
 * @param props
 */
const getLetterColor = (
  letter: string,
  positionIdx: number,
  consensusSequence: string,
  querySequence: string,
  alignmentStyle: AminoAcidAlignmentStyle | NucleotideAlignmentStyle
) => {
  const moleculeClass =
    alignmentStyle.alignmentType === AlignmentTypes.AMINOACID
      ? AminoAcid
      : Nucleotide;
  let molecule = moleculeClass.UNKNOWN;

  if (alignmentStyle.positionsToStyle === PositionsToStyle.ALL) {
    molecule = moleculeClass.fromSingleLetterCode(letter);
  } else {
    const isConsensus = consensusSequence[positionIdx] === letter;
    const isQuery = querySequence[positionIdx] === letter;
    if (
      (alignmentStyle.positionsToStyle === PositionsToStyle.CONSENSUS &&
        isConsensus) ||
      (alignmentStyle.positionsToStyle === PositionsToStyle.CONSENSUS_DIFF &&
        !isConsensus) ||
      (alignmentStyle.positionsToStyle === PositionsToStyle.QUERY && isQuery) ||
      (alignmentStyle.positionsToStyle === PositionsToStyle.QUERY_DIFF &&
        !isQuery)
    ) {
      molecule = moleculeClass.fromSingleLetterCode(letter);
    }
  }
  return alignmentStyle.residueDetail === ResidueStyle.DARK
    ? molecule.colors[alignmentStyle.colorScheme.commonName].darkTheme
        .letterColor
    : alignmentStyle.residueDetail === ResidueStyle.LIGHT
    ? molecule.colors[alignmentStyle.colorScheme.commonName].lightTheme
        .letterColor
    : molecule.colors[alignmentStyle.colorScheme.commonName].lettersOnlyTheme
        .letterColor;
};

/**
 * Hook to render the alignment details text. Generates a div for each
 * color rendered, each of which contain all the visible
 * sequences (sequencesToRender) -- those letters which are not
 * stylized will be put as spaces.
 * @param props
 */
export function AlignmentDetailsLetters(props: {
  sequencesToRender: string[];
  consensusSequence: string;
  querySequence: string;
  alignmentStyle: AminoAcidAlignmentStyle | NucleotideAlignmentStyle;
  fontSize: number;
  lineHeight: number;
}) {
  const {
    sequencesToRender,
    consensusSequence,
    querySequence,
    alignmentStyle,
    fontSize,
    lineHeight,
  } = props;

  //each sequence style will be rendered as a single separate div.
  //munge the data first
  const letterColorToLocations = {} as {
    [letterColor: string]: { [seqId: number]: number[] };
  };
  for (let seqId = 0; seqId < sequencesToRender.length; seqId++) {
    const seqStr = sequencesToRender[seqId];
    for (let positionIdx = 0; positionIdx < seqStr.length; positionIdx++) {
      const letter = seqStr[positionIdx];
      const color = getLetterColor(
        letter,
        positionIdx,
        consensusSequence,
        querySequence,
        alignmentStyle
      );
      if (!letterColorToLocations[color.hexString]) {
        letterColorToLocations[color.hexString] = {};
      }
      if (!letterColorToLocations[color.hexString][seqId]) {
        letterColorToLocations[color.hexString][seqId] = [];
      }
      letterColorToLocations[color.hexString][seqId].push(positionIdx);
    }
  }

  //Array of JSX elements - one for each letter color. Each contains
  //a character for every position in the rendered sequences, (each
  //position will be blank for all except one of the elemnets)
  const individualColors = Object.entries(letterColorToLocations).map(
    ([color, locations]) => {
      const colorStrings = sequencesToRender.map((seqStr, seqIdx) => {
        return seqStr
          .split("")
          .map((letter, colIdx) => {
            if (seqIdx in locations && locations[seqIdx].indexOf(colIdx) >= 0) {
              return letter;
            }
            return "\u00A0";
          })
          .join("");
      });

      return (
        <div
          className={`letters-with-specific-color`}
          style={{ color: color }}
          key={`${color}_${colorStrings.join("")}`}
        >
          {colorStrings.map((seqStr, idx) => {
            return (
              <React.Fragment key={idx + seqStr}>
                {seqStr}
                <br />
              </React.Fragment>
            );
          })}
        </div>
      );
    }
  );

  return (
    <div
      className="letters-viewport"
      style={{ fontSize: fontSize, lineHeight: lineHeight + "px" }}
    >
      {
        //output each color separately
      }
      {individualColors}

      {
        // add a hidden interaction element that contains all the displayed sequences
        // so users can copy paste
      }
      <div className={`hidden-residues-for-copy-paste`}>
        {sequencesToRender.map((seqStr, idx) => {
          return (
            <React.Fragment key={idx + seqStr}>
              {seqStr} <br />
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
