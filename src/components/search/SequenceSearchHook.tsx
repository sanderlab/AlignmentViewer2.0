/**
 * Hook for rendering the position axis
 */
import "./SequenceSearch.scss";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { 
  AlignmentTypes,
  AminoAcidAlignmentTypeInstance,
  AminoAcidColorSchemes,
  AminoacidColorSchemeInstance,
  NucleotideAlignmentTypeInstance,
  NucleotideColorSchemeInstance, 
  NucleotideColorSchemes, 
  PositionsToStyle, 
  PositionsToStyleInstance, 
  ResidueColoringInstance
} from "../../common/MolecularStyles";
import { Alignment, ISequence } from "../../common/Alignment";
import { type TAnnotations } from "../../common/Annotations";
import { AlignmentViewer, IBarplotExposedProps } from "../AlignmentViewerHook";
import { IAdjustableWidth } from "../layout/AlignmentViewerLayoutHook";
import { ISingleBarDetails, PreconfiguredPositionalBarplots } from "../PositionalBarplotHook";
import { getCachedCanvasGenerators } from "../msa-blocks-and-letters/MSABlockGenerator";

export interface ISearchMatchDetails{
  searchString: string;
  posidxsMatchedPerSequence: {[sequence: string]: number[]}; //all positionIdxs that are part of the match
  highlightColor: {    
    red: number;
    green: number;
    blue: number;
  }
}

/**
 * @param props
 */
export function SequenceSearch(props: {
  searchVisible?: boolean;
  closePressed: ()=>void;
  mainAlignmentQuerySequence: ISequence;
  sortedSequences: string[];
  sortedSequenceAnnotations: TAnnotations[];

  alignmentType: AminoAcidAlignmentTypeInstance | NucleotideAlignmentTypeInstance;
  aaColorScheme?: AminoacidColorSchemeInstance;
  ntColorScheme?: NucleotideColorSchemeInstance;
  positionsToStyle: PositionsToStyleInstance;
  residueColoring: ResidueColoringInstance;
}) {
  const {
    searchVisible = true,
    closePressed,
    mainAlignmentQuerySequence,
    sortedSequences,
    sortedSequenceAnnotations,

    alignmentType,
    aaColorScheme = AminoAcidColorSchemes.list[0],
    ntColorScheme = NucleotideColorSchemes.list[0],

    positionsToStyle,
    residueColoring
  } = props;

  const colorScheme = alignmentType === AlignmentTypes.AMINOACID
    ? aaColorScheme : ntColorScheme;

  const MIN_SEARCH_STRING_SIZE = 3;

  //
  // state and ref
  //
  const [
    positionStyling, setPositionStyling
  ] = useState<"none" | "as-primary-viewport" | "all">("all");
  const [
    searchResults, setSearchResults
  ] = useState<{
    alignment: Alignment,
    matchDetails: ISearchMatchDetails
  }>();
  const lastSearchStringRef = useRef<string|undefined>(undefined);
  const [zoomLevel, setZoomLevel] = useState<number>(6);

  const searchInput = useRef<HTMLInputElement>(null);

  //
  // effectively constant
  //
  const highlightColor = useMemo(()=>{
    return {
      red: 255,
      green: 0,
      blue: 0
    };
  }, []);

  //
  // effects
  //
  useEffect(()=>{
    //caller will trigger a selection / focus on the search bar
    //when the dialog opens
    if(searchVisible){
      searchInput.current?.focus();
    }
  }, [searchVisible])

  //
  // cache and callbacks
  //

  //convert all sequences to lowercase
  const lowercaseOrderedSequences = useMemo(()=>{
    return sortedSequences.map(s => s.toLowerCase());
  }, [sortedSequences]);


  //
  // styling
  //
  
  //
  // perform search
  //
  const handleSearchChange = useCallback((
    e?: React.ChangeEvent<HTMLInputElement>
  )=>{
    const searchStr = e?.target.value 
      ? e?.target.value 
      : lastSearchStringRef.current && lastSearchStringRef.current.length >= MIN_SEARCH_STRING_SIZE
        ? lastSearchStringRef.current
        : "";
    lastSearchStringRef.current = searchStr

    const searchStringLength = searchStr.length;
    const lowerSearchStr = searchStr.toLowerCase();
    const sequenceMatches: ISequence[] = [];
    const matchDetails: ISearchMatchDetails = {
      searchString: searchStr,
      posidxsMatchedPerSequence: {},
      highlightColor: highlightColor
    };
    if(searchStr.length >= MIN_SEARCH_STRING_SIZE) {
      for(var i = 0; i < lowercaseOrderedSequences.length; i++){
        const seq = lowercaseOrderedSequences[i];

        //https://stackoverflow.com/questions/3410464
        var startIndex = 0;
        var index: number;
        var positionIdxHM: {[posIdx: number]: number} = {};
        while ((index = seq.indexOf(lowerSearchStr, startIndex)) > -1) {
          for(
            var posIdx = index; 
            posIdx < index+searchStringLength; 
            posIdx++
          ){
            positionIdxHM[posIdx] = posIdx;
          }
          startIndex = index + 1;
        }

        const uniquePositionIdxs: number[] = Object.values(positionIdxHM);
        if (uniquePositionIdxs.length > 0){
          sequenceMatches.push({
            annotations: sortedSequenceAnnotations[i],
            sequence: sortedSequences[i]
          });
          matchDetails.posidxsMatchedPerSequence[sortedSequences[i]] = uniquePositionIdxs;
        }
      }
    }

    //sort by number of matches
    function sortSequencesFn(seq1: ISequence, seq2: ISequence){
      return (
        matchDetails.posidxsMatchedPerSequence[seq2.sequence].length - 
        matchDetails.posidxsMatchedPerSequence[seq1.sequence].length
      )
    };

    const alignment = new Alignment({
      name: "search results alignment", 
      sequencesAsInput: sequenceMatches.sort(sortSequencesFn), 
      removeDuplicateSequences: false,   //keep duplicates
      supressParseTime: true,    //supress start time
      overrideQuery: sequenceMatches.length > 0 ? mainAlignmentQuerySequence : undefined
    });
    setSearchResults({
      alignment, matchDetails
    });
  }, [
    highlightColor,
    lowercaseOrderedSequences,
    mainAlignmentQuerySequence,
    sortedSequenceAnnotations,
    sortedSequences,
  ]);

  //if the alignment changes, refresh search
  useEffect(()=>{
    handleSearchChange();
  }, [
    alignmentType,
    colorScheme,
    handleSearchChange,
    sortedSequences,
    sortedSequenceAnnotations,
    positionsToStyle,
    residueColoring
  ]);

  const barplotsCache = useMemo(()=>{
    return [
      {
        svgId: `search-matches`,
        dataSeriesSet: [
          getSearchResultsCountBarplot(
            `rgb(${highlightColor.red},${highlightColor.green},${highlightColor.blue})`
          )
        ],
        tooltipPlacement: undefined
      },
      {
        svgId: `search-conservation`,
        dataSeriesSet: [
          PreconfiguredPositionalBarplots.Conservation
        ],
        tooltipPlacement: undefined
      },
    ] as IBarplotExposedProps[];
  }, [
    highlightColor
  ]);

  const metadataSizingCache = useMemo(()=>{
    return {
      type: "adjustable-width",
      startingWidth: 100,
      minWidth: 75,
      maxWidth: 300,
    } as IAdjustableWidth
  }, []);

  //
  // render
  //
  const numberSequencesMatched = searchResults?.alignment.getSequenceCount()
    ? searchResults?.alignment.getSequenceCount()
    : 0;
  
  return (
    <>
      <div 
        className="background-behind-search-box"
        onClick={(e)=>{
          if(e.currentTarget === e.target){
            closePressed();
          }
        }}
      />

      <div className="search-box-grid">
        <form className="search-box-contents">
          <div className="search-bar">
            <label htmlFor="search-input"><strong>Search:</strong></label>
            <input 
              type="text" 
              id="search-input" 
              ref={searchInput}
              onChange={handleSearchChange} 
              autoFocus={true}
            />
            { !searchResults ? undefined : 
              <span className="search-results-count">
              { lastSearchStringRef.current && lastSearchStringRef.current.length > 2
                ? `${numberSequencesMatched.toLocaleString()} matches (of 
                  ${sortedSequences.length.toLocaleString()})`
                : `enter ${MIN_SEARCH_STRING_SIZE}+ characters search`
              }
              </span> }
          </div>

          <div className="search-options-bar">
            <label><strong>Sizing:</strong></label>
            <div className="stepper">
              <button className="minus"
                disabled={zoomLevel < 5}
                onClick={(e)=>{
                  setZoomLevel(zoomLevel-1);
                  e.preventDefault();
                }}>&#xFF0D;</button>
              <span>{zoomLevel}</span>
              <button className="plus"
                disabled={zoomLevel > 16}
                onClick={(e)=>{
                  setZoomLevel(zoomLevel+1);
                  e.preventDefault();
                }}>&#xFF0B;</button>
            </div>
            

            <label><strong>Positions to style:</strong></label>
            <select 
              name="backgroundStyle" 
              value={positionStyling}
              onChange={(e)=>{
                setPositionStyling(e.target.value as typeof positionStyling);
              }}>

              <option value="none">
                  none
              </option>
              <option value="as-primary-viewport">
                  same as primary viewport
                </option>
              <option value="all">
                all
              </option>
            </select>
          </div>
          
          <div className="search-bar-results-separator"/>

          <div className="search-results">
            <div style={{display: !searchResults || numberSequencesMatched < 1 ? "none" : undefined}}>
              { !searchResults ? undefined : // || numberSequencesMatched < 1 ? undefined :
                <AlignmentViewer 
                  alignment={searchResults.alignment}
                  canvasGenerators={getCachedCanvasGenerators("search")}
                  alignmentType={alignmentType}
                  aaColorScheme={aaColorScheme}
                  ntColorScheme={ntColorScheme}
                  positionsToStyle={
                    positionStyling === "as-primary-viewport"
                      ? positionsToStyle
                      : positionStyling === "all"
                        ? PositionsToStyle.ALL
                        : PositionsToStyle.SEARCH_RESULTS_ONLY
                  } 
                  highlightPositionalMatches={searchResults.matchDetails}
                  residueColoring={residueColoring}
                  barplots={barplotsCache}
                  disableSearch={true}
                  zoomLevel={zoomLevel}
                  showQuery={true}
                  showConsensus={true}
                  showAnnotations={true}
                  showMinimap={true}
                  metadataSizing={metadataSizingCache}/>
              }
            </div>
          </div>

          <button 
            className="button-link close"
            onClick={(e)=>{
              e.preventDefault();
              closePressed();
            }}>
              <img
                alt="Close Search Box" 
                width="16"
                height="16"
                src={`${process.env.PUBLIC_URL}/close.svg`}
              />
            </button>
        </form>
      </div>
    </>
  );
}

const getSearchResultsCountBarplot = (color: string) => {
  /**
   * Search results
   * Plot the number of matches at a each position.
   */
  return {
    id: "search-results",
    name: "Search matches",
    description: "Search matches",
    cssClass: "barplot-search-results",
    color: color,
    getBars: (
      al: Alignment, 
      searchDetails: ISearchMatchDetails
    ) => {
      if(!searchDetails){
        console.error(
          "Unable to render barplot - no search details passed to the "+
          "barplot 'SearchResultsCount'. "
        );
        return [];
      }

      const toReturn: ISingleBarDetails[] = []; 
      const allHighlightedPositions = ([] as number[]).concat(
        ...Object.values(searchDetails.posidxsMatchedPerSequence)
      );
      const idxCountHM = allHighlightedPositions.reduce((
        acc, idx
      ) => {
        acc[idx] = acc[idx] ? acc[idx] + 1 : 1;
        return acc;
      }, {} as {[idx: number]: number});

      const seqCount = al.getSequenceCount();
      const maxSeqLength = al.getSequenceLength();
      for (let idx = 0; idx < maxSeqLength; idx++) {
        const count = idxCountHM[idx] ? idxCountHM[idx] : 0;
        const matchPercentage = (count/seqCount*100);
        const sigDigits =  matchPercentage >= 1
          ? 0
          : matchPercentage <= .1
            ? 2
            : 1;
        toReturn.push({
          height: count,
          tooltipValueText: `n=${count} (${matchPercentage.toFixed(sigDigits)}%)`,
        });
      }
      return toReturn;
    }
  }
}
