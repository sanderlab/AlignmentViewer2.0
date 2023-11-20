/**
 * Hooks for pure webgl alignment details.
 */
import "./AlignmentDetails.scss";
import React, { useCallback, useMemo } from "react";
import {
  AminoAcidAlignmentStyle,
  NucleotideAlignmentStyle,
  ResidueStyle,
  AlignmentTypes,
  PositionsToStyle,
} from "../../common/MolecularStyles";
import { AminoAcid, Nucleotide } from "../../common/Residues";
import { VirtualizedMatrixViewer } from "../virtualization/VirtualizedMatrixViewerHook";
import { CanvasAlignmentTiled } from "../CanvasAlignmentTiledComponent";
import { AppContext, Stage } from "@pixi/react";


export interface IAlignmentDetailsProps {
  reduxVerticalId?: string;
  reduxHorizontalId?: string;
  sequences: string[];
  consensusSequence: string;
  querySequence: string;
  alignmentStyle: AminoAcidAlignmentStyle | NucleotideAlignmentStyle;
  residueHeight: number;
  residueWidth: number;
  fontSize: number;
  suppressVerticalScrollbar?: boolean;
  suppressHorizontalScrollbar?: boolean;

  highlightedSequenceIdxs?: number[];
  highlightedPositionIdxs?: number[];
}

export function AlignmentDetails(props: IAlignmentDetailsProps) {
  //props
  const {
    reduxHorizontalId,
    reduxVerticalId,
    sequences,
    consensusSequence,
    querySequence,
    alignmentStyle,
    residueHeight,
    residueWidth,
    fontSize,
    suppressVerticalScrollbar,
    suppressHorizontalScrollbar,
  } = props;
  
  //
  // useCallbacks
  //

  const sliceSequences = useCallback((
    sequencesToSlice: string[],
    rowIdxsToRender: number[], 
    colIdxsToRender: number[],
  )=>{
    return rowIdxsToRender.map((seqIdx) => {
      const seq = sequencesToSlice[seqIdx];
      return colIdxsToRender.map((colIdx) => seq[colIdx]).join("");
    });
  }, []);

  const renderMatrixContent = useCallback((
    rowIdxsToRender: number[],
    colIdxsToRender: number[],
    additionalVerticalOffset: number,
    additionalHorizontalOffset: number,
    stageDimensions: {width: number, height: number}
  ) => {
    //issue with loading new alignment (a second alignment): virutalizedmatrix can end up not loading 
    //the redux store after calling getContent 
    const seqsSliced = sliceSequences(
      sequences, rowIdxsToRender, colIdxsToRender
    );
    const querySliced = sliceSequences(
      [querySequence], [0], colIdxsToRender
    )[0];
    const consensusSliced = sliceSequences(
      [consensusSequence], [0], colIdxsToRender
    )[0];

    return (
      <div className="av-viewport">
        <Stage
          className="stage"
          width={stageDimensions.width}
          height={stageDimensions.height}
          raf={false}
          options={{ antialias: false, backgroundAlpha: 0 }}
        >
          <AppContext.Consumer>
            {(app) => {
              return (
                <CanvasAlignmentTiled
                  sequences={seqsSliced}
                  consensusSequence={consensusSliced}
                  querySequence={querySliced}
                  alignmentType={alignmentStyle.alignmentType}
                  residueDetail={alignmentStyle.residueDetail}
                  colorScheme={alignmentStyle.colorScheme}
                  positionsToStyle={alignmentStyle.positionsToStyle}
                  //TODO further optimization by removing this and scaling with pixi 
                  //(see minimap)
                  scale={{x: residueWidth, y: residueHeight}}
                  translateY={additionalVerticalOffset}
                  translateX={additionalHorizontalOffset}
                />
              );
            }}
          </AppContext.Consumer>
        </Stage>

        <AlignmentDetailsLetters
          sequencesToRender={seqsSliced}
          consensusSequence={consensusSliced}
          querySequence={querySliced}
          alignmentStyle={alignmentStyle}
          fontSize={fontSize}
          lineHeight={residueHeight}
          verticalOffset={additionalVerticalOffset}
          horizontalOffset={additionalHorizontalOffset}
        ></AlignmentDetailsLetters>
      </div>
    );
  }, [
    alignmentStyle,
    consensusSequence,
    fontSize,
    querySequence,
    residueHeight,
    residueWidth,
    sequences,
    sliceSequences
  ]);



  /**
   *
   *
   *
   * Render
   *
   *
   *
   */
  return (
    <VirtualizedMatrixViewer
      horizontalReduxId={reduxHorizontalId}
      verticalReduxId={reduxVerticalId}
      direction={sequences.length > 1 ? "all" : "x"}
      columnCount={sequences.length > 0 ? sequences[0].length : 0}
      columnWidth={residueWidth}
      rowCount={sequences.length}
      rowHeight={residueHeight}
      autoOffset={false} //manually offset because of pixi funkyness (probably should recheck)
      suppressVerticalScrollbar={suppressVerticalScrollbar}
      suppressHorizontalScrollbar={suppressHorizontalScrollbar}
      getContent={renderMatrixContent}
    ></VirtualizedMatrixViewer>
  );
}


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
  verticalOffset: number;
  horizontalOffset?: number;
}) {
  const {
    sequencesToRender,
    consensusSequence,
    querySequence,
    alignmentStyle,
    fontSize,
    lineHeight,
    verticalOffset,
    horizontalOffset,
  } = props;

  /**
   * Get the color of a single letter.
   */
  const getLetterColor = useCallback((
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
  }, []);


  //each sequence style will be rendered as a single separate div.
  //munge the data first. letterColorToLocations contains:
  //  { 
  //    key = letter color as hex string: 
  //    value = [
  //        ordered array with each element representing a single sequence
  //        that contains an arrya of positions in that sequence with the
  //        given color
  //    ]
  //  }
  //with each letter color as key and each value is an array of
  //with each entry 
  const letterColorToLocations = useMemo(()=>{
    return sequencesToRender.reduce((colorsAcc, seqStr, seqIdx)=>{
      for (let positionIdx=0, n = seqStr.length; positionIdx < n; ++positionIdx){
        const letter = seqStr[positionIdx];
        const color = getLetterColor(
          letter,
          positionIdx,
          consensusSequence,
          querySequence,
          alignmentStyle
        );
        if (!colorsAcc[color.hexString]) {
          colorsAcc[color.hexString] = {};
        }
        if (!colorsAcc[color.hexString][seqIdx]) {
          colorsAcc[color.hexString][seqIdx] = [];
        }
        colorsAcc[color.hexString][seqIdx].push(positionIdx);
      }
      return colorsAcc;
    }, {} as {[letterColor: string]: { [seqId: number]: number[] }})
  }, [
    sequencesToRender, //changes too frequently. what is that about?
    alignmentStyle, 
    consensusSequence, 
    getLetterColor, 
    querySequence
  ]);
  
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
      className="sequence-text-holder"
      style={{
        top: verticalOffset,
        left: horizontalOffset,
      }}
    >
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
    </div>
  );
}
