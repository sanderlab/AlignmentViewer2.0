import React, { useCallback, useMemo, useState } from "react";
import "./App.scss";
import { downloadFullViewportSVG } from "./common/FileExporter"
import { 
  AlignmentViewer, 
  IBarplotExposedProps
} from "./components/AlignmentViewerHook";
import { shallowEqual } from "react-redux";
import useAV2Settings from "./components/settings/Settings";

export default function App(){
  const triggerShowSearch = React.useRef<() => void | undefined>();

  //local state
  const [state, setState] = useState({
    showSettings: true,
    mainViewportVisibleIdxs: undefined as undefined | {
      seqIdxStart: number, seqIdxEnd: number,
      posIdxStart: number, posIdxEnd: number
    }
  });

  const {
    showSettings,
  } = state;

  const hideSettingsFn = useCallback(()=>{
    setState({
      ...state,
      showSettings: false
    });
  }, [
    state
  ]);

  const settings = useAV2Settings({
    requestSettingsClose: hideSettingsFn,
    useUrlAndLocalstorage: true
  });

  const {
    alignment,
    alignmentLoading,
    ntColorScheme,
    aaColorScheme,
    alignmentType,
    showLogo,
    logoType,
    positionsToStyle,
    residueColoring,
    showAnnotations,
    showMinimap,
    sortBy,
    zoomLevel,
    barplots
  } = settings.currentlySelectedProperties;

  //const colorScheme = alignmentType === AlignmentTypes.AMINOACID
  //  ? aaColorScheme : ntColorScheme;

  //
  // settings box and main app rendering
  //
  const logoSvgId = alignment ? `logo-${alignment.getUUID()}` : "logoplot";

  const barplotsProps: IBarplotExposedProps[] = useMemo(()=>{
    return !alignment ? [] : barplots.map((bp)=>{
      return {
        svgId: `${bp.key}-barplot-${alignment?.getUUID()}`,
        dataSeriesSet: [bp],
        heightPx: 75
      }
    });
  }, [
    alignment,
    barplots
  ]);

  const renderedAlignment = useMemo(()=>{
    return !alignment 
      ? undefined 
      : (
        <div className="app-content">
          <AlignmentViewer
            alignment={alignment}
            alignmentType={alignmentType}
            aaColorScheme={aaColorScheme}
            ntColorScheme={ntColorScheme}
            residueColoring={residueColoring}
            positionsToStyle={positionsToStyle}
            triggerShowSearch={triggerShowSearch}
            mainViewportVisibleChanged={(newIdxs)=>{
              if(!shallowEqual(state.mainViewportVisibleIdxs, newIdxs)){
                setState({
                  ...state,
                  mainViewportVisibleIdxs: newIdxs
                })
              }
            }}
            zoomLevel={zoomLevel}
            sortBy={sortBy}
            disableSearch={false}
            disableSearchKeyboardShortcut={false}
            showQuery={true}
            showConsensus={true}
            showMinimap={showMinimap}
            showAnnotations={showAnnotations}
            showLogo={showLogo}
            logoOptions={{
              svgId: logoSvgId,
              logoType: logoType
            }}
            barplots={barplotsProps}
          ></AlignmentViewer>
        </div>
      )
  }, [
    alignment,
    barplotsProps,
    logoType,
    positionsToStyle,
    residueColoring,
    logoSvgId,
    showMinimap,
    showAnnotations,
    showLogo,
    sortBy,
    state,
    aaColorScheme,
    ntColorScheme,
    alignmentType,
    zoomLevel
  ]);

  //
  // the full settings box
  //
  const renderedSettingsBox = useMemo(()=>{

    const alignmentDescription = alignment ? (
      <>
        <h3><strong>Alignment:</strong> {alignment.getName()}</h3>
        <h4>
          {`${alignment.getSequenceCount()} sequences (rows) and ${alignment.getSequenceLength()} positions (columns)`}
          {alignment.getNumberRemovedDuplicateSequences() > 0 ||
           alignment.getNumberDuplicateSequencesInAlignment() > 0 ? (
             <span className="duplicates-removed">
               {alignment.getNumberRemovedDuplicateSequences() > 0
                 ? `${"\u2605"} ${alignment.getNumberRemovedDuplicateSequences()} duplicate sequences removed`
                 : `${"\u2605"} contains ${alignment.getNumberDuplicateSequencesInAlignment()} duplicate sequences`}
             </span>
           ) : null}
        </h4>
      </>
    ) : (
      <></>
    );

    //
    // settings
    //
    return (
      <>
        {settings.dropZoneElement}
        <div style={{display: alignment && !showSettings ? "none" : undefined}}>
          {settings.element}
        </div>

        <div className="app-header">
          <div className="settings-box">
            <form>
              <div className="settings-header">
                <h2>{`AlignmentViewer 2.0`}</h2>

                <div className="settings-alignment-description">
                  {alignmentDescription}
                </div>

                <a
                  className="github-link"
                  href="https://github.com/sanderlab/AlignmentViewer2.0"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Github Repository"
                >
                  <img
                    alt="Alignment Viewer 2.0 GitHub Repo"
                    width="16"
                    height="16"
                    src={`${process.env.PUBLIC_URL}/github-mark.svg`}
                  /> 
                </a>
    
                <button
                  className={`download button-link${!alignment ? " hide" : ""}`}
                  type="button"
                  title="Download Full Viewport"
                  onClick={()=>{
                    if (alignment){
                      downloadFullViewportSVG({
                        alignment: alignment,
                        sortBy: sortBy,
                        alignmentType: alignmentType, 
                        aaColorScheme: aaColorScheme,
                        ntColorScheme: ntColorScheme,
                        positionsToStyle: positionsToStyle, 
                        residueColoring: residueColoring, 
                        logoSvgId: logoSvgId,
                        barplots: barplotsProps.map(bp => {
                          return {
                            svgId: bp.svgId, 
                            title: bp.dataSeriesSet.map(ds=>ds.description).join("/")
                          };
                        }),
                        includePositionAxis: true,
                        includeMetadata: true,
                        startSeqIdx: state.mainViewportVisibleIdxs?.seqIdxStart, 
                        endSeqIdx: state.mainViewportVisibleIdxs?.seqIdxEnd,
                      });

                      //downloadLogoSVG({
                      //  svgId: logoSvgId,
                      //  alignment: alignment,
                      //  alignmentType: style.alignmentType,
                      //  colorScheme: style.selectedColorScheme,
                      //  positionsToStyle: positionsToStyle,
                      //  positionalAxis: {
                      //    numPos: alignment.getSequenceLength(),
                      //    posHeight: 10, posWidth: 7,
                      //    spaceBtwBarplotAndPositionalAxis: 5
                      //  }
                      //})

                      //downloadBarplotSVG({
                      //  alignment: alignment,
                      //  svgId: barplots[0].svgId,
                      //  positionalAxis: {
                      //    numPos: alignment.getSequenceLength(),
                      //    posHeight: 10, posWidth: 7,
                      //    spaceBtwBarplotAndPositionalAxis: 5
                      //  }
                      //})
                    }
                  }}
                >
                  <img
                    alt="Download Alignment" 
                    width="16"
                    height="16"
                    src={`${process.env.PUBLIC_URL}/download.svg`}
                  />
                </button>
                
                <button
                  id="search-button"
                  className="search-button button-link"
                  type="button"
                  title="Show Search"
                  onClick={() => {
                    if(triggerShowSearch.current) triggerShowSearch.current();
                  }}
                >
                  <img
                    alt="Show Search"
                    width="16"
                    height="16"
                    src={`${process.env.PUBLIC_URL}/search.svg`}
                  />
                </button>

                <button
                  id="settings-toggle-button"
                  className="button-link settings-toggle"
                  type="button"
                  style={{ paddingRight: 0 }}
                  title={showSettings ? "Hide Settings" : "Show Settings"}
                  onClick={()=>{
                    setState({
                      ...state,
                      showSettings: !showSettings,
                    });
                  }}
                >
                  <img
                    alt="Show Settings Box"
                    width="16"
                    height="16"
                    src={`${process.env.PUBLIC_URL}/settings.svg`}
                  />
                </button>
              </div> 
            </form>
          </div>
        </div>
      </>
    );
  }, [
    alignment,
    alignmentType,
    barplotsProps,
    aaColorScheme,
    ntColorScheme,
    positionsToStyle, 
    residueColoring,
    logoSvgId,
    showSettings,
    settings.dropZoneElement,
    settings.element,
    sortBy,
    state,
  ]);
  
  return (
    <>
      { renderedSettingsBox }
      <div className={`fullscreen-loading-indicator ${alignmentLoading ? "" : "hidden"}`}>
        <div className="loader" />

        {
          //spinners from https://github.com/n3r4zzurr0/svg-spinners
        }
        {
          //<svg xmlns="http://www.w3.org/2000/svg" style={{margin: "auto", background: "#fff", display: "block"}} width="200px" height="200px" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid">
          //  <g transform="translate(20 20)">
          //    <rect x="-15" y="-15" width="30" height="30" fill="#e15b64">
          //      <animateTransform attributeName="transform" type="scale" repeatCount="indefinite" calcMode="spline" dur="1s" values="1;1;0.2;1;1" keyTimes="0;0.2;0.5;0.8;1" keySplines="0.5 0.5 0.5 0.5;0 0.1 0.9 1;0.1 0 1 0.9;0.5 0.5 0.5 0.5" begin="-0.4s"></animateTransform>
          //    </rect></g>
          //  <g transform="translate(50 20)">
          //    <rect x="-15" y="-15" width="30" height="30" fill="#f47e60">
          //      <animateTransform attributeName="transform" type="scale" repeatCount="indefinite" calcMode="spline" dur="1s" values="1;1;0.2;1;1" keyTimes="0;0.2;0.5;0.8;1" keySplines="0.5 0.5 0.5 0.5;0 0.1 0.9 1;0.1 0 1 0.9;0.5 0.5 0.5 0.5" begin="-0.3s"></animateTransform>
          //    </rect></g>
          //  <g transform="translate(80 20)">
          //    <rect x="-15" y="-15" width="30" height="30" fill="#f8b26a">
          //      <animateTransform attributeName="transform" type="scale" repeatCount="indefinite" calcMode="spline" dur="1s" values="1;1;0.2;1;1" keyTimes="0;0.2;0.5;0.8;1" keySplines="0.5 0.5 0.5 0.5;0 0.1 0.9 1;0.1 0 1 0.9;0.5 0.5 0.5 0.5" begin="-0.2s"></animateTransform>
          //    </rect></g>
          //  <g transform="translate(20 50)">
          //    <rect x="-15" y="-15" width="30" height="30" fill="#f47e60">
          //      <animateTransform attributeName="transform" type="scale" repeatCount="indefinite" calcMode="spline" dur="1s" values="1;1;0.2;1;1" keyTimes="0;0.2;0.5;0.8;1" keySplines="0.5 0.5 0.5 0.5;0 0.1 0.9 1;0.1 0 1 0.9;0.5 0.5 0.5 0.5" begin="-0.3s"></animateTransform>
          //    </rect></g>
          //  <g transform="translate(50 50)">
          //    <rect x="-15" y="-15" width="30" height="30" fill="#f8b26a">
          //      <animateTransform attributeName="transform" type="scale" repeatCount="indefinite" calcMode="spline" dur="1s" values="1;1;0.2;1;1" keyTimes="0;0.2;0.5;0.8;1" keySplines="0.5 0.5 0.5 0.5;0 0.1 0.9 1;0.1 0 1 0.9;0.5 0.5 0.5 0.5" begin="-0.2s"></animateTransform>
          //    </rect></g>
          //  <g transform="translate(80 50)">
          //    <rect x="-15" y="-15" width="30" height="30" fill="#abbd81">
          //      <animateTransform attributeName="transform" type="scale" repeatCount="indefinite" calcMode="spline" dur="1s" values="1;1;0.2;1;1" keyTimes="0;0.2;0.5;0.8;1" keySplines="0.5 0.5 0.5 0.5;0 0.1 0.9 1;0.1 0 1 0.9;0.5 0.5 0.5 0.5" begin="-0.1s"></animateTransform>
          //    </rect></g>
          //  <g transform="translate(20 80)">
          //    <rect x="-15" y="-15" width="30" height="30" fill="#f8b26a">
          //      <animateTransform attributeName="transform" type="scale" repeatCount="indefinite" calcMode="spline" dur="1s" values="1;1;0.2;1;1" keyTimes="0;0.2;0.5;0.8;1" keySplines="0.5 0.5 0.5 0.5;0 0.1 0.9 1;0.1 0 1 0.9;0.5 0.5 0.5 0.5" begin="-0.2s"></animateTransform>
          //    </rect></g>
          //  <g transform="translate(50 80)">
          //    <rect x="-15" y="-15" width="30" height="30" fill="#abbd81">
          //      <animateTransform attributeName="transform" type="scale" repeatCount="indefinite" calcMode="spline" dur="1s" values="1;1;0.2;1;1" keyTimes="0;0.2;0.5;0.8;1" keySplines="0.5 0.5 0.5 0.5;0 0.1 0.9 1;0.1 0 1 0.9;0.5 0.5 0.5 0.5" begin="-0.1s"></animateTransform>
          //    </rect></g>
          //  <g transform="translate(80 80)">
          //    <rect x="-15" y="-15" width="30" height="30" fill="#849b87">
          //      <animateTransform attributeName="transform" type="scale" repeatCount="indefinite" calcMode="spline" dur="1s" values="1;1;0.2;1;1" keyTimes="0;0.2;0.5;0.8;1" keySplines="0.5 0.5 0.5 0.5;0 0.1 0.9 1;0.1 0 1 0.9;0.5 0.5 0.5 0.5" begin="0s"></animateTransform>
          //    </rect></g>
          //  </svg>
        }
        {
          //<div className="spinner1">
          //<div className="circleHolder">
          //  <div className="circle1 spinner_b2T7z"/>
          //</div>
          //<div className="circleHolder">
          //  <div className="circle2 spinner_b2T7z spinner_YRVVz"/>
          //</div>
          //<div className="circleHolder">
          //  <div className="circle3 spinner_b2T7z spinner_c9oYz"/>
          //</div>
          //</div>
        }
        {
          //<svg width="96" height="96" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          //  <circle className="spinner_b2T7" cx="4" cy="12" r="3"/>
          //  <circle className="spinner_b2T7 spinner_YRVV" cx="12" cy="12" r="3"/>
          //  <circle className="spinner_b2T7 spinner_c9oY" cx="20" cy="12" r="3"/>
          //</svg>
        }
        {
          //<svg 
          //  width="96" 
          //  height="96" 
          //  viewBox="0 0 24 24"
          //  xmlns="http://www.w3.org/2000/svg">
          //  <rect className="spinner_zWVm" x="1" y="1" width="7.33" height="7.33"/>
          //  <rect className="spinner_gfyD" x="8.33" y="1" width="7.33" height="7.33"/>
          //  <rect className="spinner_T5JJ" x="1" y="8.33" width="7.33" height="7.33"/>
          //  <rect className="spinner_E3Wz" x="15.66" y="1" width="7.33" height="7.33"/>
          //  <rect className="spinner_g2vs" x="8.33" y="8.33" width="7.33" height="7.33"/>
          //  <rect className="spinner_ctYB" x="1" y="15.66" width="7.33" height="7.33"/>
          //  <rect className="spinner_BDNj" x="15.66" y="8.33" width="7.33" height="7.33"/>
          //  <rect className="spinner_rCw3" x="8.33" y="15.66" width="7.33" height="7.33"/>
          //  <rect className="spinner_Rszm" x="15.66" y="15.66" width="7.33" height="7.33"/>
          //</svg>
        }
      </div>
      {/*renderedSettingsBox*/}
      {renderedAlignment}
    </>
  );
};