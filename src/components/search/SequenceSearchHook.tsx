/**
 * Hook for rendering the position axis
 */
import "./SequenceSearch.scss";
import { AminoAcidAlignmentStyle, NucleotideAlignmentStyle, PositionsToStyle, ResidueColoring } from "../../common/MolecularStyles";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alignment } from "../../common/Alignment";
import { AlignmentViewer, AlignmentViewerType, IBarplotExposedProps } from "../AlignmentViewerHook";
import { IFixedWidth } from "../layout/AlignmentViewerLayoutHook";
import { PreconfiguredPositionalBarplots } from "../PositionalBarplotHook";

interface ISearchResults {
  alignmentIdx: number;
  id: string;
  sequence: string;
}

/**
 * @param props
 */
export function SequenceSearch(props: {
  closePressed: ()=>void;
  sortedSequences: string[];
  sortedSequenceIds: string[];

  style: AminoAcidAlignmentStyle | NucleotideAlignmentStyle;
  positionsToStyle: PositionsToStyle;
  residueColoring: ResidueColoring;
}) {
  const {
    closePressed,
    sortedSequences,
    sortedSequenceIds,

    style,
    positionsToStyle,
    residueColoring
  } = props;

  const MIN_SEARCH_STRING_SIZE = 3;

  //const maxResultsToShow = 100;

  //
  // state
  //
  const [
    searchResults, setSearchResults
  ] = useState<Alignment>();
  const [
    lastSearchString, setLastSearchString
  ] = useState<string>();

  //
  // cache
  //

  //convert all sequences to lowercase
  const lowerOrderedSequences = useMemo(()=>{
    return sortedSequences.map(s => s.toLowerCase());
  }, [sortedSequences]);

  const lowerOrderedSequenceIds = useMemo(()=>{
    return sortedSequenceIds.map(s => s.toLowerCase());
  }, [sortedSequenceIds]);

  //
  // perform search
  //
  const handleSearchChange = useCallback((
    e?: React.ChangeEvent<HTMLInputElement>
  )=>{
    const searchStr = e?.target.value 
      ? e?.target.value 
      : lastSearchString && lastSearchString.length >= MIN_SEARCH_STRING_SIZE
        ? lastSearchString
        : "";
    setLastSearchString(searchStr);
    const lowerSearchStr = searchStr.toLowerCase();
    const results: ISearchResults[] = [];
    if(searchStr.length >= MIN_SEARCH_STRING_SIZE) {
      for(var i = 0; i < lowerOrderedSequences.length; i++){
        if(lowerOrderedSequences[i].indexOf(lowerSearchStr) !== -1 ||
           lowerOrderedSequenceIds[i].indexOf(lowerSearchStr) !== -1){
          
          results.push({
            alignmentIdx: i,
            id: sortedSequenceIds[i],
            sequence: sortedSequences[i]
          });
        }
      }
    }
    const alignment = new Alignment(
      "search results alignment", 
      results, 
      false,   //keep duplicates
      true     //supress start time
    );
    setSearchResults(alignment);
  }, [
    sortedSequenceIds,
    sortedSequences,
    lowerOrderedSequences,
    lowerOrderedSequenceIds,
    lastSearchString
  ]);

  //if the alignment changes, refresh search
  useEffect(()=>{
    handleSearchChange();
  }, [
    handleSearchChange,
    sortedSequences,
    sortedSequenceIds,
    style,
    positionsToStyle,
    residueColoring
  ]);
  
  /*
  const avCache = useMemo(()=>{
    return !searchResults || searchResults.getSequenceCount() < 1 ? undefined : (
      <AlignmentViewer 
        alignment={searchResults}
        style={style} 
        positionsToStyle={positionsToStyle} 
        residueColoring={residueColoring}
        barplots={[{
          svgId: `search-conservation-${generateUUIDv4()}`,
          dataSeriesSet: [
            PreconfiguredPositionalBarplots.Conservation
          ],
          tooltipPlacement: undefined
        }]}
        disableSearch={true}
        zoomLevel={8}
        showQuery={false}
        showAnnotations={true}
        showMinimap={false}
        metadataSizing={{
          type: "fixed-width",
          width: 100
        } as IFixedWidth}/>
    )
  }, [
    searchResults,
    style, 
    positionsToStyle,
    residueColoring
  ]);*/

  const barplotsCache = useMemo(()=>{
    return [{
      svgId: `search-conservation`,
      dataSeriesSet: [
        PreconfiguredPositionalBarplots.Conservation
      ],
      tooltipPlacement: undefined
    }] as IBarplotExposedProps[];
  }, []);

  const metadataSizingCache = useMemo(()=>{
    return {
      type: "fixed-width",
      width: 100
    } as IFixedWidth
  }, []);

  //
  // render
  //
  return (
    <>
      <div 
        className="background-search-box"
        onClick={(e)=>{
          if(e.currentTarget === e.target){
            closePressed();
          }
        }}
      />

      <div 
        className="search-box-grid"
        onClick={(e)=>{
          if(e.currentTarget === e.target){
            closePressed();
          }
        }}>

        <form className="search-box-contents">
          <div className="search-bar">
            <label htmlFor="search-input">Search:</label>
            <input type="text" id="search-input" onChange={handleSearchChange} autoFocus={true}/>
            { !searchResults ? undefined : 
              <span className="search-results-count">
              { lastSearchString && lastSearchString.length > 2
                ? `${searchResults?.getSequenceCount().toLocaleString()} matches (of 
                  ${sortedSequences.length.toLocaleString()})`
                : `enter ${MIN_SEARCH_STRING_SIZE}+ characters search`
              }
              </span>
            }
          </div>
          <div className="search-bar-results-separator"/>
          <div className="search-results">
            <div style={{display: !searchResults || searchResults.getSequenceCount() < 1 ? "none" : undefined}}>
              { !searchResults ? undefined :
                <AlignmentViewer 
                  alignment={searchResults}
                  style={style} 
                  positionsToStyle={positionsToStyle} 
                  residueColoring={residueColoring}
                  barplots={barplotsCache}
                  disableSearch={true}
                  zoomLevel={6}
                  showQuery={false}
                  showAnnotations={true}
                  showMinimap={true}
                  metadataSizing={metadataSizingCache}
                  whichViewer={AlignmentViewerType.SearchViewer}/>
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
