/**
 * Hook for rendering the position axis
 */
import "./SequenceSearch.scss";
import { AminoAcidAlignmentStyle, NucleotideAlignmentStyle, PositionsToStyle, ResidueColoring } from "../../common/MolecularStyles";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alignment } from "../../common/Alignment";
import { AlignmentViewer } from "../AlignmentViewerHook";
import { IFixedWidth } from "../layout/AlignmentViewerLayoutHook";
import { PreconfiguredPositionalBarplots } from "../PositionalBarplotHook";
import { generateUUIDv4 } from "../../common/Utils";

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
      : lastSearchString
        ? lastSearchString
        : "";
    setLastSearchString(searchStr);
    const lowerSearchStr = searchStr.toLowerCase();
    const results: ISearchResults[] = [];
    if(searchStr.length >= 3) {
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
      "search results alignment", results, false
    )
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
  ]);


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
              <span className="search-results-count">{
                `${searchResults?.getSequenceCount().toLocaleString()} matches (of 
                  ${sortedSequences.length.toLocaleString()})`
              }
              </span>
            }
          </div>
          <div className="search-bar-results-separator"/>
          <div className="search-results">
            <div style={{display: !searchResults ? "none" : undefined}}>
              {avCache}
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
