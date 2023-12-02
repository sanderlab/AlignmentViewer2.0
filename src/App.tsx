import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.scss";
import { Alignment } from "./common/Alignment";
import { SequenceSorter } from "./common/AlignmentSorter";
import { downloadLogoSvg } from "./common/FileExporter"
import { UrlLocalstorageBooleanInputManager, UrlLocalstorageInputManager, UrlLocalstorageNumberInputManager, getURLParameters } from "./common/Utils";
import { AlignmentViewer, IBarplotExposedProps } from "./components/AlignmentViewerHook";
import {
  AminoAcidAlignmentStyle,
  NucleotideAlignmentStyle,
  AlignmentStyle,
  AlignmentTypes,
  PositionsToStyle,
  IColorScheme,
  ResidueColoring,
  ALL_NUCLEOTIDE_COLORSCHEMES,
  ALL_AMINOACID_COLORSCHEMES,
} from "./common/MolecularStyles";
import { LOGO_TYPES } from "./components/SequenceLogoHook";
import { AlignmentFileDrop, AlignmentFileLoader } from "./components/AlignmentFileLoaderHook";
import { AlignmentLoader, AlignmentLoadError } from "./common/AlignmentLoader";
import { PreconfiguredPositionalBarplots } from "./components/PositionalBarplotHook";

interface AppProps {}
interface BooleanStateVariables {
  showLogo: boolean;
  showMiniMap: boolean;
  showConservationBarplot: boolean;
  showEntropyGapBarplot: boolean;
  showKLDivergenceBarplot: boolean;
  showAnnotations: boolean;
  showSettings: boolean;
  loading?: boolean;
  removeDuplicateSeqs: boolean;
}
interface AlignmentStateVariables {
  alignment?: Alignment;
  style: AminoAcidAlignmentStyle | NucleotideAlignmentStyle;
  positionsToStyle: PositionsToStyle;
  residueColoring: ResidueColoring;
  sortBy: SequenceSorter;
  logoPlotStyle: LOGO_TYPES;
  zoomLevel: number;
  loadError?: AlignmentLoadError;
};
interface AppState extends BooleanStateVariables, AlignmentStateVariables {};


interface ObjectURLInputs{
  ALIGNMENT_STYLE: UrlLocalstorageInputManager<AlignmentStyle>,
  POSITIONS_TO_STYLE: UrlLocalstorageInputManager<PositionsToStyle>,
  RESIDUE_COLORING: UrlLocalstorageInputManager<ResidueColoring>,
  SORT_BY: UrlLocalstorageInputManager<SequenceSorter>,
  LOGO_STYLE: UrlLocalstorageInputManager<LOGO_TYPES>,
}
interface BooleanURLInputs {
  MINIMAP: UrlLocalstorageBooleanInputManager,
  CONSERVATION_BARPLOT: UrlLocalstorageBooleanInputManager,
  ENTROPY_BARPLOT: UrlLocalstorageBooleanInputManager,
  KLDIVERGENCE_BARPLOT: UrlLocalstorageBooleanInputManager,
  ANNOTATIONS: UrlLocalstorageBooleanInputManager,
  SHOW_LOGO: UrlLocalstorageBooleanInputManager,
  REMOVE_DUPLICATE_SEQS: UrlLocalstorageBooleanInputManager
}
interface NumberURLInputs{
  ZOOM_LEVEL: UrlLocalstorageNumberInputManager
}
interface URLInputs extends ObjectURLInputs, BooleanURLInputs, NumberURLInputs {};


export default function App(props: AppProps){
  const urlInputs: URLInputs = useMemo(()=>{
    return {
      //objects
      ALIGNMENT_STYLE: new UrlLocalstorageInputManager<AlignmentStyle>(
        new AminoAcidAlignmentStyle(), 'alignment-style',
        (as: AlignmentStyle) => {return as.alignmentType.key + '.' + as.selectedColorScheme.commonName},
        (str: string) => {
          const split = str.split('.');
          const at = AlignmentTypes.fromKey(split[0]) ? 
                     AlignmentTypes.fromKey(split[0]) :
                     AlignmentTypes.AMINOACID;

          var colorScheme = AlignmentTypes.AMINOACID ? 
                            ALL_AMINOACID_COLORSCHEMES[0] : 
                            ALL_NUCLEOTIDE_COLORSCHEMES[0];
          if (split.length > 1){
            const commonName = split[1];
            colorScheme = at === AlignmentTypes.AMINOACID ? 
              ALL_AMINOACID_COLORSCHEMES.reduce( (acc: IColorScheme | undefined, colorscheme) => {
                if (colorscheme.commonName === commonName){  return colorscheme; }
                return acc;
              }, ALL_AMINOACID_COLORSCHEMES[0] )! :
              ALL_NUCLEOTIDE_COLORSCHEMES.reduce( (acc: IColorScheme | undefined, colorscheme) => {
                if (colorscheme.commonName === commonName){  return colorscheme; }
                return acc;
              }, ALL_NUCLEOTIDE_COLORSCHEMES[0] )!
          }
          return at === AlignmentTypes.AMINOACID ? 
            new AminoAcidAlignmentStyle(colorScheme) : 
            new NucleotideAlignmentStyle(colorScheme)
        },
      ),

      POSITIONS_TO_STYLE: new UrlLocalstorageInputManager<PositionsToStyle>(
        PositionsToStyle.ALL, 'positions-to-style', 
        (pts: PositionsToStyle) => {return pts.key},
        (key: string) => {
          return PositionsToStyle.fromKey(key) ? PositionsToStyle.fromKey(key)! : PositionsToStyle.ALL;
        },
      ),

      RESIDUE_COLORING: new UrlLocalstorageInputManager<ResidueColoring>(
        ResidueColoring.LIGHT, 'residue-coloring', 
        (rs: ResidueColoring) => {return rs.key},
        (key: string) => {
          return ResidueColoring.fromKey(key) ? ResidueColoring.fromKey(key)! : ResidueColoring.LIGHT;
        },
      ),

      SORT_BY: new UrlLocalstorageInputManager<SequenceSorter>(
        SequenceSorter.INPUT, 'sort-by',
        (s: SequenceSorter) => {return s.key},
        (key: string) => {
          return SequenceSorter.fromKey(key) ? SequenceSorter.fromKey(key)! : SequenceSorter.INPUT;
        },
      ),

      LOGO_STYLE: new UrlLocalstorageInputManager<LOGO_TYPES>(
        LOGO_TYPES.LETTERS, 'logo-style',
        (s: LOGO_TYPES) => {return s === LOGO_TYPES.LETTERS ? 'letters' : 'bars'},
        (key: string) => {
          return key === 'letters' ? LOGO_TYPES.LETTERS : LOGO_TYPES.BARS;
        },
      ),

      //booleans
      MINIMAP: new UrlLocalstorageBooleanInputManager(true, 'minimap'),
      CONSERVATION_BARPLOT: new UrlLocalstorageBooleanInputManager(true, 'conservation-barplot'),
      ENTROPY_BARPLOT: new UrlLocalstorageBooleanInputManager(true, 'entropy-barplot'),
      KLDIVERGENCE_BARPLOT: new UrlLocalstorageBooleanInputManager(false, 'kl-divergence-barplot'),
      ANNOTATIONS: new UrlLocalstorageBooleanInputManager(true, 'annotations'),
      SHOW_LOGO: new UrlLocalstorageBooleanInputManager(true, 'show-logo'),
      REMOVE_DUPLICATE_SEQS: new UrlLocalstorageBooleanInputManager(true, 'remove-duplicates'),

      //numbers
      ZOOM_LEVEL: new UrlLocalstorageNumberInputManager(12, 'zoom-level'),
    };
  }, []);

  const [state, setState] = useState<AppState>({
    alignment: undefined,
    style: urlInputs.ALIGNMENT_STYLE.initialValue,
    positionsToStyle: urlInputs.POSITIONS_TO_STYLE.initialValue,
    residueColoring: urlInputs.RESIDUE_COLORING.initialValue,
    logoPlotStyle: urlInputs.LOGO_STYLE.initialValue,
    sortBy: urlInputs.SORT_BY.initialValue,
    
    showMiniMap: urlInputs.MINIMAP.initialValue,
    showConservationBarplot: urlInputs.CONSERVATION_BARPLOT.initialValue,
    showEntropyGapBarplot: urlInputs.ENTROPY_BARPLOT.initialValue,
    showKLDivergenceBarplot: urlInputs.KLDIVERGENCE_BARPLOT.initialValue,
    showAnnotations: urlInputs.ANNOTATIONS.initialValue,
    showLogo: urlInputs.SHOW_LOGO.initialValue,
    zoomLevel: urlInputs.ZOOM_LEVEL.initialValue,

    removeDuplicateSeqs: urlInputs.REMOVE_DUPLICATE_SEQS.initialValue,
    showSettings: true,
  });

  //
  // new alignment loading failed
  //
  const onAlignmentLoadError = useCallback((error: AlignmentLoadError) => {
    setState({
      ...state,
      loadError: error,
      loading: false,
    });
  }, [state, setState]);

  //
  // new alignment loaded
  //
  const onAlignmentReceived = useCallback((alignment: Alignment) => {
    urlInputs.ALIGNMENT_STYLE.onChange(
      alignment.getDefaultStyle()
    );
    setState({
      ...state,
      alignment: alignment,
      showSettings: false,
      style: alignment.getDefaultStyle(),
      loading: false,
      loadError: undefined,
    });
  }, [state, setState, urlInputs]);


  //
  // only run a single time to load url if it is in the url  
  //
  const onceHappened = useRef<boolean>(false);
  useEffect(()=>{
    if (!onceHappened.current){
      onceHappened.current = true;

      //is there an alignment in the URL?
      const params = getURLParameters()
      const alignmentUrlName = "alignment-url";
      const potentialUrl = params.get(alignmentUrlName);
      if (potentialUrl) {
        try {
          const url = new URL(potentialUrl);  //throws an exception 
          if (url.protocol !== "http:" && url.protocol !== "https:"){
            throw new Error(
              `URL protocol is "${url.protocol}" not "http:" or "https:"`
            );
          }
          setState({
            ...state,
            loading: true,
          });
    
          AlignmentLoader.loadAlignmentFromURL(
            params.get(alignmentUrlName) as string,
            state.removeDuplicateSeqs,
            onAlignmentReceived,
            onAlignmentLoadError
          );
        } catch (e) {
          console.error(
            `Loading URL from parameter (${alignmentUrlName}="${potentialUrl}") failed:`, 
            e
          );
          setState({
            ...state,
            loadError: new AlignmentLoadError(
              "Alignment URL Parse Error", [{
                name: "URL invalid",
                message: `The alignment link in the URL is not a valid http or https
                link (parameter="${alignmentUrlName}", link="${potentialUrl}").`
              }]
            )
          })
        }
      }
    }
  }, [
    onAlignmentLoadError,
    onAlignmentReceived, 
    setState,
    state
  ]);

  //
  // settings box and main app rendering
  //
  const {
    alignment,
    showLogo,
    loadError,
    loading,
    logoPlotStyle,
    positionsToStyle,
    residueColoring,
    showAnnotations,
    showConservationBarplot,
    showEntropyGapBarplot,
    showKLDivergenceBarplot,
    showMiniMap,
    showSettings,
    sortBy,
    style,
    zoomLevel,
  } = state;

  const barplots: IBarplotExposedProps[] = useMemo(()=>{
    return [
      ...(!showConservationBarplot ? [] : [{
        dataSeriesSet: [PreconfiguredPositionalBarplots.Conservation],
        height: 75,
      }] as IBarplotExposedProps[]),

      ...(!showEntropyGapBarplot ? [] : [{
        dataSeriesSet: [
          PreconfiguredPositionalBarplots.ShannonEntropy,
          PreconfiguredPositionalBarplots.Gaps,
        ],
        height: 75,
      }] as IBarplotExposedProps[]),

      ...(!showKLDivergenceBarplot ? [] : [{
        dataSeriesSet: [
          PreconfiguredPositionalBarplots.KullbacLeiblerDivergence,
        ],
        height: 75,
      }] as IBarplotExposedProps[]),
    ];
  }, [
    showConservationBarplot, 
    showEntropyGapBarplot, 
    showKLDivergenceBarplot
  ]);

  const renderedAlignment = useMemo(()=>{
    return !alignment 
      ? undefined 
      : (
        <div className="app-content">
          <AlignmentViewer
            alignment={alignment}
            style={style}
            residueColoring={residueColoring}
            positionsToStyle={positionsToStyle}
            zoomLevel={zoomLevel}
            sortBy={sortBy}
            showMinimap={showMiniMap}
            showAnnotations={showAnnotations}
            showLogo={showLogo}
            logoOptions={{
              logoType: logoPlotStyle,
              height: 80,
            }}
            minimapOptions={{
              startingWidth: 100,
              minWidth: 100,
              verticalHeight: "div",
              alignHorizontal: "right",
              resizable: "horizontal",
            }}
            barplots={barplots}
          ></AlignmentViewer>
        </div>
      )
  }, [
    alignment,
    barplots,
    logoPlotStyle,
    positionsToStyle,
    residueColoring,
    showMiniMap,
    showAnnotations,
    showLogo,
    sortBy,
    style,
    zoomLevel
  ]);


  const renderedSortControl = useMemo(() => {
    const sorters =
      style instanceof AminoAcidAlignmentStyle
        ? SequenceSorter.aminoAcidSorters
        : SequenceSorter.nucleotideSorters;

    return (
      <div>
        <label>
          <strong>Sort Order:</strong>
          <select
            value={sortBy.key}
            onChange={(e) =>{
              const sb = SequenceSorter.fromKey(e.target.value)!;
              setState({
                ...state,
                sortBy: sb,
              })
              urlInputs.SORT_BY.onChange(sb);
            }}
          >
            {sorters.map((sso) => {
              return (
                <option value={sso.key} key={sso.key}>
                  {sso.description}
                </option>
              );
            })}
          </select>
        </label>
      </div>
    );
  }, [
    setState,
    state,
    sortBy, 
    style, 
    urlInputs
  ]);

  const renderedAlignmentTypeLabel = useMemo(() => {
    return (
      <div>
        <label>
          <strong>Alignment Type:</strong>
          <select
            value={style.alignmentType.key}
            onChange={(e) => {
              const newAlignmentStyle = AlignmentStyle.fromAlignmentType(
                AlignmentTypes.fromKey(e.target.value)!
              );
              setState({
                ...state,
                style: newAlignmentStyle,
              });
              urlInputs.ALIGNMENT_STYLE.onChange(newAlignmentStyle);
            }}
          >
            {AlignmentTypes.list.map((alignmentType) => {
              return (
                <option value={alignmentType.key} key={alignmentType.key}>
                  {alignmentType.description}
                </option>
              );
            })}
          </select>
        </label>
      </div>
    );
  }, [setState, state, style, urlInputs]);

  const renderedColorScheme = useMemo(() => {
    return (
      <div>
        <label>
          <strong>Color Scheme:</strong>
          <select
            value={style.alignmentType.allColorSchemes.indexOf(
              style.selectedColorScheme
            )}
            onChange={(e) => {
              const newStyle = {
                ...style!, 
                colorScheme: style.alignmentType.allColorSchemes[
                  parseInt(e.target.value)
                ],
              }
              setState({
                ...state,
                style: newStyle,
              });
              urlInputs.ALIGNMENT_STYLE.onChange(newStyle);
            }}
          >
            {style.alignmentType.allColorSchemes.map(
              (colorScheme: IColorScheme, index: number) => {
                return (
                  <option key={index} value={index}>
                    {colorScheme.description}
                  </option>
                );
              }
            )}
          </select>
        </label>
      </div>
    );
  }, [setState, state, style, urlInputs]);

  const renderedResidueColoring = useMemo(() => {
    return (
      <div>
        <label>
          <strong>Residue Coloring:</strong>
          <select
            value={residueColoring.key}
            onChange={(e) => {
              const rc = ResidueColoring.fromKey(e.target.value)!
              setState({
                ...state,
                residueColoring: rc,
              });
              urlInputs.RESIDUE_COLORING.onChange(rc);
            }}
          >
            {ResidueColoring.list.map((rd) => {
              return (
                <option key={rd.key} value={rd.key}>
                  {rd.description}
                </option>
              );
            })}
          </select>
        </label>
      </div>
    );
  }, [
    residueColoring,
    setState, 
    state, 
    urlInputs
  ]);

  const renderedPositionStyling = useMemo(() => {
    return (
      <div>
        <label>
          <strong>Positions to Style:</strong>
          <select
            value={PositionsToStyle.list.indexOf(positionsToStyle)}
            onChange={(e) => {
              const pts = PositionsToStyle.list[parseInt(e.target.value)];
              setState({
                ...state,
                positionsToStyle: pts
              });
              urlInputs.POSITIONS_TO_STYLE.onChange(pts);
            }}
          >
            {PositionsToStyle.list.map(
              (pts: PositionsToStyle, index: number) => {
                return (
                  <option key={index} value={index}>
                    {pts.description}
                  </option>
                );
              }
            )}
          </select>
        </label>
      </div>
    );
  }, [
    positionsToStyle,
    setState, 
    state, 
    urlInputs
  ]);

  const renderedSequenceLogo = useMemo(() => {
    return (
      <div>
        <label>
          <strong>Sequence Logo Style:</strong>
          <select
            value={logoPlotStyle}
            onChange={(e) => {
              const ls = e.target.value as LOGO_TYPES
              setState({
                ...state,
                logoPlotStyle: ls,
              });
              urlInputs.LOGO_STYLE.onChange(ls);
            }}
          >
            {Object.values(LOGO_TYPES).map((logoType) => {
              return (
                <option key={logoType} value={logoType}>
                  {logoType}
                </option>
              );
            })}
          </select>
        </label>
      </div>
    );
  }, [
    logoPlotStyle,
    setState,
    state,
    urlInputs
  ]);

  const renderedZoomButtons = useMemo(() => {
    return (
      <div>
        <label>
          <strong>Zoom Level:</strong>
          <div className="zoom-level">
            <button
              type="button"
              disabled={zoomLevel < 7}
              onClick={(e) => {
                const zl = zoomLevel - 1;
                setState({
                  ...state,
                  zoomLevel: zl,
                });
                urlInputs.ZOOM_LEVEL.onChange(zl);
              }}
            >
              -
            </button>
            {zoomLevel}
            <button
              type="button"
              disabled={zoomLevel > 19}
              onClick={(e) => {
                const zl = zoomLevel + 1;
                setState({
                  ...state,
                  zoomLevel: zl,
                });
                urlInputs.ZOOM_LEVEL.onChange(zl);
              }}
            >
              +
            </button>
          </div>
        </label>
      </div>
    );
  }, [
    setState,
    state,
    urlInputs,
    zoomLevel,
  ]);

  const renderedFileDropZone = useMemo(() => {
    return (
      <AlignmentFileDrop
        removeDuplicateSeqs={true} //todo - prop this, it is presently in the 
        alignmentLoaded={onAlignmentReceived}
        onAlignmenLoadError={(e)=>{
          onAlignmentLoadError(e);
          setState({
            ...state,
            showSettings: true,
          });
        }}
        onFileLoadStart={() => {
          setState({
            ...state,
            loading: true,
          });
        }}
      />
    )
  }, [
    onAlignmentLoadError,
    onAlignmentReceived,
    setState,
    state,
  ]);

  const renderedFileUpload = useCallback(() => {
    return (
      <AlignmentFileLoader
        fileSelectorLabelText={"Upload Alignment File:"}
        exampleFiles={[
          {
            labelText: "Testasdf",
            fileURL:
              process.env.PUBLIC_URL +
              "/TESTING.a2m",
            fileName: "TESTING.a2m",
          },
          {
            labelText: "β-lactamase",
            fileURL:
              process.env.PUBLIC_URL +
              "/7fa1c5691376beab198788a726917d48_b0.4.a2m",
            fileName: "7fa1c5691376beab198788a726917d48_b0.4.a2m",
          },
          {
            labelText: "SARS-CoV-2 Spike",
            fileURL: process.env.PUBLIC_URL + "/Spike_Full_f05_m05_t08.a2m",
            fileName: "Spike_Full_f05_m05_t08.a2m",
          },
        ]}
        onFileLoadStart={() => {
          setState({
            ...state,
            loading: true,
          });
        }}
        removeDuplicateSeqs={state.removeDuplicateSeqs}
        setRemoveDuplicateSeqs={(newValue)=>{
          setState({
            ...state,
            removeDuplicateSeqs: newValue
          })
          urlInputs.REMOVE_DUPLICATE_SEQS.onChange(newValue);
        }}
        onAlignmentLoaded={onAlignmentReceived}
        onAlignmenLoadError={onAlignmentLoadError}
      />
    );
  }, [
    onAlignmentReceived, 
    onAlignmentLoadError, 
    setState, 
    state, 
    urlInputs
  ]);

  const renderToggle = useCallback((
    classInputName: string,
    label: string,
    stateVar: keyof BooleanStateVariables,
    urlInputLabel: keyof BooleanURLInputs,
  ) => {
    return (
      <div className={classInputName}>
        <label>
          <strong>{label}:</strong>

          <input
            name={classInputName}
            type="checkbox"
            checked={state[stateVar] as boolean}
            onChange={(e) => {
              const newState = {...state};
              newState[stateVar] = e.target.checked;
              setState(newState);
              urlInputs[urlInputLabel].onChange(e.target.checked);
            }}
          />
        </label>
      </div>
    );
  }, [setState, state, urlInputs]);

  const renderedSettingsBox = useMemo(()=>{

    const alignmentDescription = alignment ? (
      <div>
        <h3>{alignment.getName()}</h3>
        <h4>
          {`${alignment.getSequenceCount()} sequences (rows) and ${alignment.getSequenceLength()} positions (columns)`}
          {alignment.getNumberRemovedDuplicateSequences() > 0 ||
          alignment.getNumberDuplicateSequencesInAlignment() > 0 ? (
            <span className="duplicates-removed">
              {alignment.getNumberRemovedDuplicateSequences() > 0
                ? `${"\u2605"} ${alignment.getNumberRemovedDuplicateSequences()} duplicate sequences were removed`
                : `${"\u2605"} alignment contains ${alignment.getNumberDuplicateSequencesInAlignment()} duplicate sequences`}
            </span>
          ) : null}
        </h4>
      </div>
    ) : (
      <></>
    );
  
    return (
      <div className="app-header">
        {renderedFileDropZone}
        <div className="settings-box">
          <form>
            <div className="settings-header">
              <h2>{`AlignmentViewer 2.0`}</h2>
              <a
                className="github-link"
                href="https://github.com/sanderlab/AlignmentViewer2.0"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  alt="Alignment Viewer 2.0 GitHub Repo"
                  width="16"
                  height="16"
                  src={`${process.env.PUBLIC_URL}/GitHub-Mark-32px.png`}
                /> 
              </a>
  
              <button
                className={`download button-link${!alignment ? " hide" : ""}`}
                type="button"
                style={{ margin: 0, border: "none" }}
                onClick={()=>{downloadLogoSvg(style)}}
              >
                <img
                  alt="Download Alignment" 
                  width="16"
                  height="16"
                  src={`${process.env.PUBLIC_URL}/download_32px.png`}
                />
              </button>
  
              <button
                className={`button-link${showSettings ? " hide" : ""}`}
                type="button"
                style={{ padding: 0, margin: 0, border: "none" }}
                onClick={(e) => {
                  setState({
                    ...state,
                    showSettings: true,
                  });
                }}
              >
                <img
                  alt="Show Settings Box"
                  width="16"
                  height="16"
                  src={`${process.env.PUBLIC_URL}/settings_32px.png`}
                />
              </button>
              <button
                className={`button-link${showSettings ? "" : " hide"}`}
                type="button"
                style={{ padding: 0, margin: 0, border: "none" }}
                onClick={(e) => {
                  setState({
                    ...state,
                    showSettings: false,
                  });
                }}
              >
                <img
                  alt="Hide Settings Box"
                  width="16px"
                  height="16px"
                  src={`${process.env.PUBLIC_URL}/hide_contract_icon_32px.png`}
                />
              </button>
            </div>
  
            <div className="settings-alignment-description">
              {alignmentDescription}
            </div>
            <div
              className={"settings-content"}
              style={{
                display: showSettings ? "block" : "none",
              }}
            >
              {renderedAlignmentTypeLabel}
              {renderedSortControl}
              {renderedColorScheme}
              {renderedResidueColoring}
              {renderedPositionStyling}
              {renderedSequenceLogo}
              {renderedZoomButtons}
  
              {renderToggle(
                "annotation-toggle",
                "Show Logo", 
                "showLogo",
                "SHOW_LOGO"
              )}
  
              {renderToggle(
                "annotation-toggle",
                "Show Annotations",
                "showAnnotations",
                "ANNOTATIONS"
              )}
              {renderToggle(
                "minimap-toggle",
                "Show MiniMap",
                "showMiniMap",
                "MINIMAP"
              )}
              {renderToggle(
                "barplot-conservation-toggle",
                "Show Conservation Barplot",
                "showConservationBarplot",
                "CONSERVATION_BARPLOT"
              )}
              {renderToggle(
                "barplot-entropy-gaps-toggle",
                "Show Entropy / Gaps Barplot",
                "showEntropyGapBarplot",
                "ENTROPY_BARPLOT"
              )}
              {renderToggle(
                "barplot-kldivergence-toggle",
                "Show KL Divergence Barplot",
                "showKLDivergenceBarplot",
                "KLDIVERGENCE_BARPLOT"
              )}
  
              <br></br>
              {renderedFileUpload()}
              {!loading ? null : <div className="loader" />}
              {!loadError ? null : (
                <div className={`load-error`}>
                  <h3>
                    <strong>{loadError.message}</strong>
                  </h3>
                  <ul>
                    {loadError.errors.map((e) => {
                      return (
                        <li key={e.name}>
                          <strong>{e.name}:</strong> {e.message}
                        </li>
                      );
                    })}
                  </ul>
                  {!loadError.possibleResolution ? null : (
                    <div>{loadError.possibleResolution}</div>
                  )}
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    );
  }, [
    alignment,
    loadError, 
    loading, 
    renderToggle, 
    renderedAlignmentTypeLabel,
    renderedColorScheme, 
    renderedFileDropZone, 
    renderedFileUpload, 
    renderedPositionStyling, 
    renderedResidueColoring,
    renderedSequenceLogo,
    renderedSortControl,
    renderedZoomButtons,
    showSettings,
    state,
    style
  ]);


  return (
    <>
      {renderedSettingsBox}
      {renderedAlignment}
    </>
  );
};
