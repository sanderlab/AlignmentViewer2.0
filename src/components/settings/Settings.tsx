import "./Settings.scss";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SequenceSorter, SequenceSorterInstance } from "../../common/AlignmentSorter";
import {
  AminoAcidColorSchemes,
  NucleotideColorSchemes,
  AlignmentTypes,
  PositionsToStyle,
  AminoacidColorSchemeInstance,
  NucleotideColorSchemeInstance,
  ResidueColoring,
  PositionsToStyleInstance,
  ResidueColoringInstance,
  AminoAcidAlignmentTypeInstance,
  NucleotideAlignmentTypeInstance,
} from "../../common/MolecularStyles";
import { LogoType, LogoTypeInstance } from "../../components/SequenceLogoHook";
import { AlignmentLoadError, AlignmentLoader } from "../../common/AlignmentLoader";
import { 
  InputBooleanSetting,
  InputMultiSelectSetting,
  InputNumberSetting,
  InputSelectSetting,
  globalSettingsUrlLocalStorageManager
} from "./LocalStorageAndURLManager";
import { IPositionalBarplotDataSeries, PreconfiguredPositionalBarplots } from "../PositionalBarplotHook";
import { AlignmentExampleFile, AlignmentFileDrop, AlignmentFileLoader } from "../AlignmentFileLoaderHook";
import { Alignment } from "../../common/Alignment";

interface ISettingsState {
  alignmentType: AminoAcidAlignmentTypeInstance | NucleotideAlignmentTypeInstance;
  ntColorScheme: NucleotideColorSchemeInstance;
  aaColorScheme: AminoacidColorSchemeInstance;
  positionsToStyle: PositionsToStyleInstance;
  residueColoring: ResidueColoringInstance;

  sortBy: SequenceSorterInstance;

  logoType: LogoTypeInstance;

  //booleans
  showLogo: boolean;
  showMinimap: boolean;
  showAnnotations: boolean;
  removeDuplicateSequences: boolean;

  //numbers
  zoomLevel: number;
  
  //barplots
  barplots: IPositionalBarplotDataSeries[];
  
  //file handling
  alignment?: Alignment;
  alignmentLoading: boolean;
  alignmentLoadError?: AlignmentLoadError;
} ;


//
//
//
export default function useAV2Settings(props:{
  //caller needs to respond to this to hide the settings screen
  requestSettingsClose: ()=>void;
  useUrlAndLocalstorage?: boolean;
}){

  const {
    requestSettingsClose,
    useUrlAndLocalstorage = false
  } = props;

  const defaultGlobalSettings = useMemo(()=>{
    return {
      alignmentType: AlignmentTypes.AMINOACID,
      ntColorScheme: NucleotideColorSchemes.list[0],
      aaColorScheme: AminoAcidColorSchemes.list[0],
      sortBy: SequenceSorter.INPUT,
      positionsToStyle: PositionsToStyle.ALL,
      residueColoring: ResidueColoring.LIGHT,
    
      logoStyle: LogoType.LETTERS,
    
      barplots: [
        PreconfiguredPositionalBarplots.Conservation,
        PreconfiguredPositionalBarplots.Gaps
      ] as IPositionalBarplotDataSeries[],
    
      showMinimap: true,
      showAnnotations: true,
      showLogo: true,
      removeDuplicateSequences: true,
      
      zoomLevel: 12,
    }
  }, []);

  //
  //helper object - initialize settings props and prepare
  //                data to pass to input form 
  const properties = useMemo(()=>{
    function populateObj<T>(props: {
      propKey: string,
      stateKey: keyof typeof defaultGlobalSettings,
      defaultVal: T, 
      all: T[],
      serialize: (v: T)=>string | undefined, 
      deserialize: (s: string)=>T | undefined,
    }){
      const {
        propKey, stateKey, defaultVal, all, serialize, deserialize
      } = props;

      let initCache = globalSettingsUrlLocalStorageManager.getCurrentDeserializedValue(
        propKey, deserialize
      );
      if(!useUrlAndLocalstorage || 
         initCache === undefined || 
         !all.includes(initCache)){ //set default if not found or not valid
        initCache = defaultVal;
      }
      return {
        propKey: propKey,
        initialValue: initCache,
        defaultValue: defaultVal,
        serialize: serialize,
        deserialize: deserialize,
        allPossibleValues: all,
        useUrlAndLocalstorage: useUrlAndLocalstorage,
        onChange: (newVal: any) => {
          setState((prevState) => { return {
            ...prevState,
            [stateKey]: newVal
          }})
        }
      }
    }

    const booleanHelper = {
      all: [true, false],
      serialize: (b: boolean) => {
        return b ? 'true': 'false'
      },
      deserialize: (s: string) => {
        return s.toUpperCase() === 'TRUE' ? true: false
      }
    }

    return {
      alignmentType: populateObj({
        propKey: "alignment-type", stateKey: "alignmentType",
        defaultVal: defaultGlobalSettings.alignmentType, 
        all: AlignmentTypes.list,
        serialize: AlignmentTypes.serialize, 
        deserialize: AlignmentTypes.deserialize
      }),
      ntColorScheme: populateObj({
        propKey: "nt-color-scheme", stateKey: "ntColorScheme",
        defaultVal: defaultGlobalSettings.ntColorScheme, 
        all: NucleotideColorSchemes.list,
        serialize: NucleotideColorSchemes.serialize, 
        deserialize: NucleotideColorSchemes.deserialize
      }),
      aaColorScheme: populateObj({
        propKey:  "aa-color-scheme", stateKey: "aaColorScheme",
        defaultVal: defaultGlobalSettings.aaColorScheme, 
        all: AminoAcidColorSchemes.list,
        serialize: AminoAcidColorSchemes.serialize, 
        deserialize: AminoAcidColorSchemes.deserialize
      }),
      sortBy: populateObj({
        propKey: "sort-by", stateKey: "sortBy", 
        defaultVal: defaultGlobalSettings.sortBy, 
        all: SequenceSorter.list,
        serialize: SequenceSorter.serialize, 
        deserialize: SequenceSorter.deserialize
      }),
      positionsToStyle: populateObj({
        propKey: "positions-to-style", stateKey: "positionsToStyle", 
        defaultVal: defaultGlobalSettings.positionsToStyle,
        all: PositionsToStyle.list,
        serialize: PositionsToStyle.serialize, 
        deserialize: PositionsToStyle.deserialize
      }),
      residueColoring: populateObj({
        propKey: "residue-coloring", stateKey: "residueColoring",
        defaultVal: defaultGlobalSettings.residueColoring,
        all: ResidueColoring.list,
        serialize: ResidueColoring.serialize, 
        deserialize: ResidueColoring.deserialize
      }),
      showMinimap: populateObj({
        propKey: "show-minimap", stateKey: "showMinimap",
        defaultVal: defaultGlobalSettings.showMinimap,
        ...booleanHelper
      }),
      showAnnotations: populateObj({
        propKey: "show-annotations", stateKey: "showAnnotations",
        defaultVal: defaultGlobalSettings.showAnnotations,
        ...booleanHelper
      }),
      showLogo: populateObj({
        propKey: "show-logo", stateKey: "showLogo",
        defaultVal: defaultGlobalSettings.showLogo,
        ...booleanHelper
      }),
      removeDuplicateSequences: populateObj({
        propKey: "remove-duplicates", stateKey: "removeDuplicateSequences",
        defaultVal: defaultGlobalSettings.removeDuplicateSequences,
        ...booleanHelper
      }),
      logoStyle: populateObj({
        propKey: "logo-style", stateKey: "logoStyle",
        defaultVal: defaultGlobalSettings.logoStyle,
        all: LogoType.list,
        serialize: LogoType.serialize, 
        deserialize: LogoType.deserialize
      }),
      zoomLevel: populateObj({
        propKey: "zoom-level", stateKey: "zoomLevel",
        defaultVal: defaultGlobalSettings.zoomLevel,
        all: [...Array(15).keys()].map(m => m+6), //from 6-20
        serialize: (n: number)=>{
          return n.toString();
        }, 
        deserialize: (s: string)=>{
          return !isNaN(+s) ? +s : 12 //default if it fails
        }
      })
    }
  }, [
    defaultGlobalSettings,
    useUrlAndLocalstorage
  ]);
  
  //
  // The barplots are a multi selector so they require a custom initialization
  // 
  const barplots = useMemo(()=> {
    const propKey = "barplots";
    const defaultVals = defaultGlobalSettings.barplots;
    const serialize = (vals: IPositionalBarplotDataSeries[])=>{
      let toreturn = vals.map(
        v => PreconfiguredPositionalBarplots.serialize(v)!
      ).toSorted().join("|");
      return encodeURIComponent(toreturn);
    };
    const deserialize = (s: string) => {
      const toreturn = decodeURIComponent(s).split("|").map(key => {
        return PreconfiguredPositionalBarplots.deserialize(key);
      });
      return toreturn.findIndex(v => v === undefined) !== -1 ? [] :
        toreturn as IPositionalBarplotDataSeries[]
    };
    const all = PreconfiguredPositionalBarplots.list;

    const initCacheVals = globalSettingsUrlLocalStorageManager.getCurrentDeserializedValue(
      propKey, deserialize
    );
    let initialValues = defaultVals;
    if(useUrlAndLocalstorage && initCacheVals !== undefined){ //check that all are valid
      const allValid = initCacheVals.reduce((acc, cache)=>{
        if(!all.includes(cache)) acc = false;
        return acc;
      }, true);
      if(allValid) initialValues = initCacheVals;
    }

    return {
      propKey: propKey, 
      initialValues: initialValues,
      defaultValues: defaultVals, 
      allPossibleValues: all,
      serialize: serialize, 
      deserialize: deserialize,
      useUrlAndLocalstorage: useUrlAndLocalstorage,
      onChange: (newVals: IPositionalBarplotDataSeries[]) => {
        setState((prevState) => { return {
          ...prevState,
          barplots: newVals
        }});
      }
    }
  }, [
    defaultGlobalSettings.barplots,
    useUrlAndLocalstorage,
  ]);

  useEffect(()=>{
    const validPropKeys = Object.keys(properties).reduce((acc, key)=>{
      acc.push(
        properties[key as keyof typeof properties].propKey
      );
      return acc;
    }, [barplots.propKey] as string[]);

    globalSettingsUrlLocalStorageManager.setValidSavePropKeys(validPropKeys)
  }, [
    barplots, 
    properties
  ]);

  //
  // state values - will be returned as a value to caller.
  //
  const [state, setState] = useState<ISettingsState>({
    alignmentType: properties.alignmentType.initialValue,
    ntColorScheme: properties.ntColorScheme.initialValue,
    aaColorScheme: properties.aaColorScheme.initialValue,
    sortBy: properties.sortBy.initialValue,
    positionsToStyle: properties.positionsToStyle.initialValue,
    residueColoring: properties.residueColoring.initialValue,
    showMinimap: properties.showMinimap.initialValue,
    showAnnotations: properties.showAnnotations.initialValue,
    showLogo: properties.showLogo.initialValue,
    removeDuplicateSequences: properties.removeDuplicateSequences.initialValue,

    logoType: properties.logoStyle.initialValue,

    zoomLevel: properties.zoomLevel.initialValue,

    barplots: barplots.initialValues,

    alignmentLoading: false,
  });

  //
  // when the alignment type changes we need to make sure the sort order is 
  // updated if not valid.
  //
  const alignmentTypeChanged = useCallback((
    newAlignmentType: AminoAcidAlignmentTypeInstance | NucleotideAlignmentTypeInstance
  )=>{

    if(
      (newAlignmentType === AlignmentTypes.AMINOACID && (
        !state.sortBy || !SequenceSorter.ALL_AMINO_ACID_SORTERS.includes(state.sortBy)
      )) ||
      (newAlignmentType === AlignmentTypes.NUCLEOTIDE && (
        !state.sortBy || !SequenceSorter.ALL_NUCLEOTIDE_SORTERS.includes(state.sortBy)
      ))
    ){
      setState((prevState) => { return {
        ...prevState,
        alignmentType: newAlignmentType,
        sortBy: properties.sortBy.defaultValue
      }});
    }
    else{
      setState((prevState) => { return {
        ...prevState,
        alignmentType: newAlignmentType
      }});
    }
  }, [
    properties.sortBy.defaultValue,
    state.sortBy
  ]);

  /*****************************************************************
   * 
   * 
   * 
   * File handling
   * 
   * 
   * 
   ****************************************************************/

  const startAlignmentLoading = useCallback(() => {
    setState((prevState) => { return {
      ...prevState,
      alignmentLoading: true
    }});
  }, []);
  //
  // new alignment loaded
  //
  const onAlignmentReceived = useCallback((alignment: Alignment) => {
    setState((prevState) => { return {
      ...prevState,
      alignment: alignment,
      alignmentLoading: false,
      alignmentLoadError: undefined
    }});
    requestSettingsClose();
  }, [requestSettingsClose]);

  //
  // new alignment loading failed
  //
  const onAlignmentLoadError = useCallback((error: AlignmentLoadError) => {
    setState((prevState) => { return {
      ...prevState,
      alignmentLoading: false,
      alignmentLoadError: error
    }});
  }, []);



  //
  // a drop zone so users can drag and drop files into the page
  //
  const renderedFileDropZone = useMemo(() => {
    return (
      <AlignmentFileDrop
        removeDuplicateSeqs={state.removeDuplicateSequences}
        alignmentLoaded={onAlignmentReceived}
        onAlignmenLoadError={(e)=>{
          onAlignmentLoadError(e);
          requestSettingsClose();
        }}
        onFileLoadStart={startAlignmentLoading}
      />
    )
  }, [
    onAlignmentLoadError,
    onAlignmentReceived,
    requestSettingsClose,
    startAlignmentLoading,
    state.removeDuplicateSequences
  ]);

  //
  // only run a single time to load url if it is in the url  
  //
  const onceHappened = useRef<boolean>(false);
  useEffect(()=>{
    if (!onceHappened.current){
      onceHappened.current = true;

      //is there an alignment in the URL?
      const alignmentUrlName = "alignment-url";
      const potentialUrl = globalSettingsUrlLocalStorageManager.getAlignmentUrlParam();

      if (potentialUrl) {
        try {
          const url = new URL(potentialUrl);  //throws an exception 
          if (url.protocol !== "http:" && url.protocol !== "https:"){
            throw new Error(
              `URL protocol is "${url.protocol}" not "http:" or "https:"`
            );
          }
          startAlignmentLoading();
          console.log(`Loading URL from "${potentialUrl}"`);
          AlignmentLoader.loadAlignmentFromURL(
            potentialUrl,
            state.removeDuplicateSequences,
            onAlignmentReceived,
            onAlignmentLoadError
          );
        } catch (e) {
          console.error(
            `Loading URL from parameter (${alignmentUrlName}="${potentialUrl}") failed:`, 
            e
          );
          onAlignmentLoadError(
            new AlignmentLoadError(
            "Alignment URL Parse Error", [{
              name: "URL invalid",
              message: `The alignment link in the URL is not a valid http or https
              link (parameter="${alignmentUrlName}", link="${potentialUrl}").`
            }]
          ));
        }
      }
    }
  }, [
    onAlignmentLoadError,
    onAlignmentReceived, 
    startAlignmentLoading,
    state.removeDuplicateSequences,
  ]);



  /*****************************************************************
   * 
   * 
   * 
   * Render the settings elements
   * 
   * 
   * 
   ****************************************************************/


  const renderedErrors = useMemo(()=>{
    if(state.alignmentLoadError){
      return (
        <div className={`load-error`}>
          <h3>
            <strong>{state.alignmentLoadError.message}</strong>
          </h3>
          <ul>
            {state.alignmentLoadError.errors.map((e) => {
              return (
                <li key={e.name}>
                  <strong>{e.name}:</strong> {e.message}
                </li>
              );
            })}
          </ul>
          {!state.alignmentLoadError.possibleResolution ? null : (
            <div>{state.alignmentLoadError.possibleResolution}</div>
          )}
        </div>
      )
    }
    return undefined;
  }, [state.alignmentLoadError]);

  
  const renderedSettings = useMemo(()=>{
    return (
      <div className={"settings-content"}>

        <h3 className="subheader">
        Alignment Styling
        </h3>
        <div className="options-box">

          <label htmlFor={properties.alignmentType.propKey}>
            Alignment Type:
          </label>
          <InputSelectSetting
            {...properties.alignmentType}
            currentValue={state.alignmentType}
            onChange={alignmentTypeChanged}/>

          <label htmlFor={properties.sortBy.propKey}>
            Sort Order:
          </label>

          <InputSelectSetting
            {...properties.sortBy}
            currentValue={state.sortBy}
            allPossibleValues={state.alignmentType === AlignmentTypes.AMINOACID 
              ? SequenceSorter.ALL_AMINO_ACID_SORTERS
              : SequenceSorter.ALL_NUCLEOTIDE_SORTERS}/>

          {
            state.alignmentType === AlignmentTypes.AMINOACID
              ? (
                <>
                  <label htmlFor={properties.aaColorScheme.propKey}>
                    Color Scheme:
                  </label>
                  <InputSelectSetting
                    {...properties.aaColorScheme}
                    currentValue={state.aaColorScheme}/>
                </>
              )
              : (
                <>
                  <label htmlFor={properties.ntColorScheme.propKey}>
                    Color Scheme:
                  </label>
                  <InputSelectSetting
                    {...properties.ntColorScheme}
                    currentValue={state.ntColorScheme}/>
                </>
              )
          }

          <label htmlFor={properties.residueColoring.propKey}>
            Residue Coloring:
          </label>
          <InputSelectSetting
            {...properties.residueColoring}
            currentValue={state.residueColoring}/>


          <label htmlFor={properties.positionsToStyle.propKey}>
            Positions To Style:
          </label>
          <InputSelectSetting
            {...properties.positionsToStyle}
            currentValue={state.positionsToStyle}/>


          <label htmlFor={properties.zoomLevel.propKey}>
            Zoom Level:
          </label>
          <InputNumberSetting
            {...properties.zoomLevel}
            currentValue={state.zoomLevel}
            minValue={5}
            maxValue={20}/>
        </div>

        <h3 className="subheader">
        Analysis
        </h3>
        <div className="options-box">
          <label htmlFor={barplots.propKey}>
            Barplots:
          </label>
          <InputMultiSelectSetting
            {...barplots}
            currentValues={state.barplots}/>
        
          <label htmlFor={properties.logoStyle.propKey}>
            Sequence logo type:
          </label>
          <InputSelectSetting
            {...properties.logoStyle}
            currentValue={state.showLogo 
              ? state.logoType
              : {
                key: "hide-logo",
                description: "No logo (hidden)"
              } satisfies LogoTypeInstance
            }
            allPossibleValues={[
              {
                key: "hide-logo",
                description: "No logo (hidden)"
              } satisfies LogoTypeInstance,
              ...LogoType.list
            ]}
            onChange={(newLogoType)=>{
              if(!newLogoType){ //hide-logo is selected - undefined in LogoType.deserialize
                setState((prevState) => { return {
                  ...prevState,
                  showLogo: false
                }});
              }
              else{
                setState((prevState) => { return {
                  ...prevState,
                  showLogo: true,
                  logoType: newLogoType
                }});
              }
            }}/>


          <label htmlFor={properties.showMinimap.propKey}>
            Show Minimap:
          </label>
          <InputBooleanSetting
            {...properties.showMinimap}
            currentValue={state.showMinimap}/>

          <label htmlFor={properties.showAnnotations.propKey}>
            Show Annotations:
          </label>
          <InputBooleanSetting
            {...properties.showAnnotations}
            currentValue={state.showAnnotations}/>
          {/* //can be selected in dropdown
          <label htmlFor={properties.showLogo.propKey}>
            Show Logo:
          </label>
          <InputBooleanSetting
            {...properties.showLogo}
            currentValue={state.showLogo}/> 
          */}

          {/* //TODO: implement. requires clever axis
          <label htmlFor={properties.collapseUnalignedPositions.propKey}>
            Collapse Unaligned Positions:
          </label>
          <InputBooleanSetting
            {...properties.collapseUnalignedPositions}
            currentValue={state.collapseUnalignedPositions}/>
          */}
  
        </div>

        <h3 className="subheader">
        File Input
        </h3>
        <div className="options-box">
          <label htmlFor="file-loader">
            Upload Alignment File:
          </label>
          <AlignmentFileLoader
            id={"file-loader"}
            onFileLoadStart={startAlignmentLoading}
            onAlignmentLoaded={onAlignmentReceived}
            onAlignmenLoadError={onAlignmentLoadError}
            removeDuplicateSeqs={state.removeDuplicateSequences}
          />

          <label htmlFor="example-files">
            Load Example File:
          </label>
          <div id="example-files">
            <AlignmentExampleFile 
              id={"beta-lactamase"}
              labelText={"β-lactamase"} 
              fileURL={`${process.env.PUBLIC_URL}/7fa1c5691376beab198788a726917d48_b0.4.a2m`} 
              fileName={"7fa1c5691376beab198788a726917d48_b0.4.a2m"} 
              removeDuplicateSeqs={state.removeDuplicateSequences} 
              onFileLoadStart={startAlignmentLoading}
              onAlignmentLoaded={onAlignmentReceived} 
              onAlignmenLoadError={onAlignmentLoadError}/>
            <AlignmentExampleFile 
              id={"covid-spike"}
              labelText={"SARS-CoV-2 Spike"} 
              fileURL={`${process.env.PUBLIC_URL}/Spike_Full_f05_m05_t08.a2m`} 
              fileName={"Spike_Full_f05_m05_t08.a2m"} 
              removeDuplicateSeqs={state.removeDuplicateSequences} 
              onFileLoadStart={startAlignmentLoading}
              onAlignmentLoaded={onAlignmentReceived} 
              onAlignmenLoadError={onAlignmentLoadError}/>
          </div>

          <label htmlFor={properties.removeDuplicateSequences.propKey}>
            Remove Duplicate Sequences on Load:
          </label>
          <InputBooleanSetting
            {...properties.removeDuplicateSequences}
            currentValue={state.removeDuplicateSequences}/>

        </div>
        {renderedErrors}
      </div>
    )
  }, [
    alignmentTypeChanged,
    onAlignmentLoadError,
    onAlignmentReceived,
    startAlignmentLoading,
    barplots,
    properties,
    state,
    renderedErrors
  ]);
  
  //return an object that includes the currently selected properties
  return {
    currentlySelectedProperties: state,
    dropZoneElement: renderedFileDropZone,
    element: (
      <>
        <div className="settings-holder">
          <div 
            className={`outside-settings-box`}
            onMouseDown={requestSettingsClose}
          />
          <div className="settings">
            {/*renderedFileDropZone*/}
            <div className="settings-header">
              <h2>Settings</h2>
              <button 
                className="button-link close"
                onClick={(e)=>{
                  e.preventDefault();
                  requestSettingsClose();
                }}>
                  <img
                    alt="Close Search Box" 
                    width="16"
                    height="16"
                    src={`${process.env.PUBLIC_URL}/close.svg`}/>
              </button>
            </div>
            {renderedSettings}
          </div>
        </div>
      </>
    )
  }
};
