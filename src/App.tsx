import React, { useEffect, useState } from "react";
import "./App.scss";
import { Alignment } from "./common/Alignment";
import { SequenceSorter } from "./common/AlignmentSorter";
import { getURLParameters } from "./common/Utils";
import { AlignmentViewer, IBarplotExposedProps } from "./components/AlignmentViewerComponent";
import {
  AminoAcidAlignmentStyle,
  NucleotideAlignmentStyle,
  AlignmentStyle,
  AlignmentTypes,
  PositionsToStyle,
  IColorScheme,
  ResidueColoring,
  ALL_AMINOACID_COLORSCHEMES,
  ALL_NUCLEOTIDE_COLORSCHEMES,
} from "./common/MolecularStyles";
import { LOGO_TYPES } from "./components/SequenceLogoComponent";
import { AlignmentFileLoaderComponent } from "./components/AlignmentFileLoaderComponent";
import { ISequenceBarplotDataSeries, SequenceBarplotComponent } from "./components/SequenceBarplotComponent";
import { AlignmentLoader, AlignmentLoadError } from "./common/AlignmentLoader";

interface AppProps {}
interface AppState {
  alignment?: Alignment;
  style: AminoAcidAlignmentStyle | NucleotideAlignmentStyle; //alignment type and color scheme
  residueColoring: ResidueColoring;
  positionsToStyle: PositionsToStyle;
  sortBy: SequenceSorter;
  logoPlotStyle: LOGO_TYPES;
  zoomLevel: number;
  showMiniMap: boolean;
  showConservationBarplot: boolean;
  showEntropyGapBarplot: boolean;
  showKLDivergenceBarplot: boolean;
  showAnnotations: boolean;
  showSettings: boolean;
  loading?: boolean;
  loadError?: AlignmentLoadError;
}


//inspired by https://pierrehedkvist.com/posts/react-state-url
class UrlLocalstorageInputManager<T>{
  protected initialValue: T;
  protected onChange: (newValue: T) => void;

  static LOCAL_STORAGE_KEY = "UI_OPTIONS_CACHE";
  static initializeAllInputs = () => {
    const urlSearchParams = new URLSearchParams( window.location.search )
    const finalParams = new URLSearchParams( 
      localStorage.getItem(UrlLocalstorageInputManager.LOCAL_STORAGE_KEY) ? 
      localStorage.getItem(UrlLocalstorageInputManager.LOCAL_STORAGE_KEY)! : 
      undefined
    )

    //overwrite or add url parameters to local storage parameters 
    for (const [key, value] of urlSearchParams) {
      finalParams.set(key, value);
    }
    UrlLocalstorageInputManager.writeParamsToUrlAndLocalstorage(finalParams);
  }

  static writeParamsToUrlAndLocalstorage = (params: URLSearchParams) => {
    //write the complete parameter list to both the url and local storage
    window.history.replaceState(null, "", "?"+params.toString());
    params.delete("alignment-url")
    localStorage.setItem(
      UrlLocalstorageInputManager.LOCAL_STORAGE_KEY, 
      params.toString()
    );
  }

  constructor(
    defaultValue: T,
    paramName: string,
    serialize: (state: T) => string,
    deserialize: (state: string) => T
  ) {
    function loadValue(searchStr: string | null, db: "URL" | "Local Storage"){
      const val = new URLSearchParams( searchStr ? searchStr : undefined ).get(paramName);
      if (val){ return deserialize(val); }
    }

    const localstorageStr = localStorage.getItem(
      UrlLocalstorageInputManager.LOCAL_STORAGE_KEY
    );

    //default initial value priority: url -> local storage -> default
    this.initialValue = loadValue(window.location.search, "URL") !== undefined ? 
                        loadValue(window.location.search, "URL")! :
                        loadValue(localstorageStr, "Local Storage") !== undefined ?
                        loadValue(localstorageStr, "Local Storage")! :
                        defaultValue;

    this.onChange = (newValue: T) => {
      const searchParams = new URLSearchParams( window.location.search )
      if (serialize(newValue) === serialize(defaultValue)){ 
        searchParams.delete(paramName) 
      }
      else {
        searchParams.set(paramName, serialize(newValue));
      }
      UrlLocalstorageInputManager.writeParamsToUrlAndLocalstorage(searchParams);
    };
  }
}
class UrlLocalstorageBooleanInputManager extends UrlLocalstorageInputManager<boolean>{
  constructor(defaultValue: boolean, paramName: string){
    super(
      defaultValue, paramName, 
      (b) => {return b ? 'true': 'false'},
      (s) => {return s.toUpperCase() === 'TRUE' ? true: false}
    );
  }
}
class UrlLocalstorageNumberInputManager extends UrlLocalstorageInputManager<number>{
  constructor(defaultValue: number, paramName: string){
    super(
      defaultValue, paramName, 
      (n) => {return n.toString();},
      (s) => {return !isNaN(+s) ? +s : defaultValue}
    );
  }
}

export default class App extends React.Component<AppProps, AppState> {
  private url_cookie_inputs;
  
  constructor(props: AppProps) {
    super(props);
    this.state = {
      style: new AminoAcidAlignmentStyle(),
      residueColoring: ResidueColoring.LIGHT,
      positionsToStyle: PositionsToStyle.ALL,
      logoPlotStyle: LOGO_TYPES.LETTERS, //TODO - decide NT or AA based on alignment
      zoomLevel: 12,
      sortBy: SequenceSorter.INPUT,
      showMiniMap: true,
      showConservationBarplot: true,
      showEntropyGapBarplot: true,
      showKLDivergenceBarplot: false,
      showAnnotations: true,
      showSettings: true,
    };

    //write defaults for all UI parameters
    UrlLocalstorageInputManager.initializeAllInputs()
    this.url_cookie_inputs = {
      ALIGNMENT_STYLE: new UrlLocalstorageInputManager<AlignmentStyle>(
        new AminoAcidAlignmentStyle(), 'alignment-style',
        (as: AlignmentStyle) => {return as.alignmentType.key + '.' + as.colorScheme.commonName},
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
        (s: LOGO_TYPES) => {return s == LOGO_TYPES.LETTERS ? 'letters' : 'bars'},
        (key: string) => {
          return key === 'letters' ? LOGO_TYPES.LETTERS : LOGO_TYPES.BARS;
        },
      ),
      
      MINIMAP: new UrlLocalstorageBooleanInputManager(true, 'minimap'),
      CONSERVATION_BARPLOT: new UrlLocalstorageBooleanInputManager(true, 'conservation-barplot'),
      ENTROPY_BARPLOT: new UrlLocalstorageBooleanInputManager(true, 'entropy-barplot'),
      KLDIVERGENCE_BARPLOT: new UrlLocalstorageBooleanInputManager(false, 'kl-divergence-barplot'),
      ANNOTATIONS: new UrlLocalstorageBooleanInputManager(true, 'annotations'),

      ZOOM_LEVEL: new UrlLocalstorageNumberInputManager(12, 'zoom-level'),
    }

    this.onAlignmentReceived = this.onAlignmentReceived.bind(this);
    this.onAlignmentLoadError = this.onAlignmentLoadError.bind(this);
  }

  componentDidMount() {
    const params = getURLParameters();

    //is there an alignment in the URL?
    const alignment_url_name = 'alignment-url'
    if (params.has(alignment_url_name) && 
        typeof params.get(alignment_url_name) === 'string') {
      this.setState({
        loading: true,
      });

      AlignmentLoader.loadAlignmentFromURL(
        params.get(alignment_url_name) as string,
        this.onAlignmentReceived,
        this.onAlignmentLoadError
      );
    }

    this.setState({
      alignment: undefined,
      style: this.url_cookie_inputs.ALIGNMENT_STYLE.initialValue,
      positionsToStyle: this.url_cookie_inputs.POSITIONS_TO_STYLE.initialValue,
      residueColoring: this.url_cookie_inputs.RESIDUE_COLORING.initialValue,
      logoPlotStyle: this.url_cookie_inputs.LOGO_STYLE.initialValue,
      sortBy: this.url_cookie_inputs.SORT_BY.initialValue,
      
      showMiniMap: this.url_cookie_inputs.MINIMAP.initialValue,
      showConservationBarplot: this.url_cookie_inputs.CONSERVATION_BARPLOT.initialValue,
      showEntropyGapBarplot: this.url_cookie_inputs.ENTROPY_BARPLOT.initialValue,
      showKLDivergenceBarplot: this.url_cookie_inputs.KLDIVERGENCE_BARPLOT.initialValue,
      showAnnotations: this.url_cookie_inputs.ANNOTATIONS.initialValue,
      zoomLevel: this.url_cookie_inputs.ZOOM_LEVEL.initialValue,

      showSettings: true,
    });
  }

  render() {
    const {
      alignment,
      positionsToStyle,
      residueColoring,
      logoPlotStyle,
      showAnnotations,
      showConservationBarplot,
      showEntropyGapBarplot,
      showKLDivergenceBarplot,
      showMiniMap,
      sortBy,
      style,
      zoomLevel,
    } = this.state;

    const barplots: IBarplotExposedProps[] = [];
    if (showConservationBarplot) {
      barplots.push({
        dataSeriesSet: [SequenceBarplotComponent.CONSERVATION_BARPLOT],
        height: "75px",
      });
    }
    if (showEntropyGapBarplot) {
      barplots.push({
        dataSeriesSet: [
          SequenceBarplotComponent.SHANNON_ENTROPY_BARPLOT,
          SequenceBarplotComponent.GAPS_BARPLOT,
        ],
        height: "75px",
      });
    }
    if (showKLDivergenceBarplot) {
      barplots.push({
        dataSeriesSet: [
          SequenceBarplotComponent.KULLBAC_LEIBLER_DIVERGENCE_BARPLOT,
        ],
        height: "75px",
      });
    }

    const alignmentElement = !alignment ? (
      <></>
    ) : (
      <div className="app-content">
        <AlignmentViewer
          alignment={alignment}
          style={style}
          positionsToStyle={positionsToStyle}
          residueColoring={residueColoring}
          zoomLevel={zoomLevel}
          sortBy={sortBy}
          showMinimap={showMiniMap}
          showAnnotations={showAnnotations}
          logoOptions={{
            logoType: logoPlotStyle,
            height: "80px",
          }}
          minimapOptions={{
            startingWidth: 120,
            verticalHeight: "div",
            alignHorizontal: "right",
            resizable: "horizontal",
          }}
          barplots={barplots}
        ></AlignmentViewer>
      </div>
    );

    return (
      <>
        {this.renderSettingsBox(style)}
        {alignmentElement}
      </>
    );
  }

  protected renderSettingsBox = (
    style: AminoAcidAlignmentStyle | NucleotideAlignmentStyle
  ) => {
    const { alignment, loading, loadError, showSettings } = this.state;
    const alignmentDescription = alignment ? (
      <div>
        <h3>{alignment.getName()}</h3>
        <h4>{`${
          alignment.getSequences().length
        } sequences (rows) and ${alignment.getMaxSequenceLength()} positions (columns) `}</h4>
      </div>
    ) : (
      <></>
    );

    return (
      <div className="app-header">
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
                className={`button-link${showSettings ? " hide" : ""}`}
                type="button"
                style={{ padding: 0, margin: 0, border: "none" }}
                onClick={(e) => {
                  this.setState({
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
                  this.setState({
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
              className="settings-parameters"
              style={{
                display: showSettings ? "block" : "none",
              }}
            >
              {this.renderAlignmentTypeLabel(style)}
              {this.renderColorScheme(style)}
              {this.renderPositionStyling()}
              {this.renderResidueColoring()}
              {this.renderSequenceLogo()}
              {this.renderSortControl()}
              {this.renderZoomButtons()}
              {this.renderMiniMapToggle()}
              {this.renderConservationBarplotToggle()}
              {this.renderEntropyGapBarplotToggle()}
              {this.renderKLDivergenceBarplot()}
              {this.renderAnnotationToggle()}
              <br></br>
              {this.renderFileUpload()}
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
  };

  protected renderSortControl = () => {
    const { sortBy, style } = this.state;
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
              this.setState({
                sortBy: sb,
              })
              this.url_cookie_inputs.SORT_BY.onChange(sb);
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
  };
  protected renderAlignmentTypeLabel = (
    style: AminoAcidAlignmentStyle | NucleotideAlignmentStyle
  ) => {
    return (
      <div>
        <label>
          <strong>Alignment Type:</strong>
          <select
            value={style.alignmentType.key}
            onChange={(e) => {
                const newAlignmentStyle = AlignmentStyle.fromAlignmentType(
                  AlignmentTypes.fromKey(e.target.value)!
                )
                this.setState({
                  style: newAlignmentStyle,
                });
                this.url_cookie_inputs.ALIGNMENT_STYLE.onChange(newAlignmentStyle);
              } 
            }
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
  };
  protected renderColorScheme = (
    style: AminoAcidAlignmentStyle | NucleotideAlignmentStyle
  ) => {
    return (
      <div>
        <label>
          <strong>Color Scheme:</strong>
          <select
            value={style.alignmentType.allColorSchemes.indexOf(
              style.colorScheme
            )}
            onChange={(e) => {
              const newStyle = {
                ...style!, 
                colorScheme: style.alignmentType.allColorSchemes[
                  parseInt(e.target.value)
                ],
              }
              this.setState({
                style: newStyle,
              });
              this.url_cookie_inputs.ALIGNMENT_STYLE.onChange(newStyle);
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
  };
  protected renderResidueColoring = () => {
    const { residueColoring } = this.state;
    return (
      <div>
        <label>
          <strong>Residue Coloring:</strong>
          <select
            value={residueColoring.key}
            onChange={(e) => {
              const rc = ResidueColoring.fromKey(e.target.value)!
              this.setState({
                residueColoring: rc,
              });
              this.url_cookie_inputs.RESIDUE_COLORING.onChange(rc);
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
  };
  protected renderPositionStyling = () => {
    const { positionsToStyle } = this.state;
    return (
      <div>
        <label>
          <strong>Positions to Style:</strong>
          <select
            value={PositionsToStyle.list.indexOf(positionsToStyle)}
            onChange={(e) => {
              const pts = PositionsToStyle.list[parseInt(e.target.value)];
              this.setState({
                positionsToStyle: pts
              });
              this.url_cookie_inputs.POSITIONS_TO_STYLE.onChange(pts);
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
  };
  protected renderSequenceLogo = () => {
    const { logoPlotStyle } = this.state;
    return (
      <div>
        <label>
          <strong>Sequence Logo Style:</strong>
          <select
            value={logoPlotStyle}
            onChange={(e) => {
              const ls = e.target.value as LOGO_TYPES
              this.setState({
                logoPlotStyle: ls,
              });
              this.url_cookie_inputs.LOGO_STYLE.onChange(ls);
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
  };
  protected renderZoomButtons = () => {
    const { zoomLevel } = this.state;
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
                this.setState({
                  zoomLevel: zl,
                });
                this.url_cookie_inputs.ZOOM_LEVEL.onChange(zl);
              }}
            >
              -
            </button>
            {zoomLevel}
            <button
              type="button"
              disabled={zoomLevel > 15}
              onClick={(e) => {
                const zl = zoomLevel + 1;
                this.setState({
                  zoomLevel: zl,
                });
                this.url_cookie_inputs.ZOOM_LEVEL.onChange(zl);
              }}
            >
              +
            </button>
          </div>
        </label>
      </div>
    );
  };

  protected renderFileUpload = () => {
    return (
      <div>
        <AlignmentFileLoaderComponent
          fileSelectorLabelText={"Upload Alignment File:"}
          exampleFiles={[
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
            this.setState({
              loading: true,
            });
          }}
          onAlignmentLoaded={this.onAlignmentReceived}
          onAlignmenLoadError={this.onAlignmentLoadError}
        />
      </div>
    );
  };

  protected renderConservationBarplotToggle = () => {
    return (
      <div className="barplot-conservation-toggle">
        <label>
          <strong>Show Conservation Barplot:</strong>

          <input
            name="conservationBarplotToggle"
            type="checkbox"
            checked={this.state.showConservationBarplot}
            onChange={(e) => {
              const target = e.target;
              this.setState({
                showConservationBarplot: target.checked,
              });
              this.url_cookie_inputs.CONSERVATION_BARPLOT.onChange(target.checked);
            }}
          />
        </label>
      </div>
    );
  };

  protected renderEntropyGapBarplotToggle = () => {
    return (
      <div className="barplot-entroy-gap-toggle">
        <label>
          <strong>Show Entropy/Gap Barplot:</strong>

          <input
            name="entropyGapBarplotToggle"
            type="checkbox"
            checked={this.state.showEntropyGapBarplot}
            onChange={(e) => {
              const target = e.target;
              this.setState({
                showEntropyGapBarplot: target.checked,
              });
              this.url_cookie_inputs.ENTROPY_BARPLOT.onChange(target.checked);
            }}
          />
        </label>
      </div>
    );
  };

  protected renderKLDivergenceBarplot = () => {
    return (
      <div className="barplot-kldivergence-toggle">
        <label>
          <strong>Show KL Divergence Barplot:</strong>

          <input
            name="kldivergenceBarplotToggle"
            type="checkbox"
            checked={this.state.showKLDivergenceBarplot}
            onChange={(e) => {
              const target = e.target;
              this.setState({
                showKLDivergenceBarplot: target.checked,
              });
              this.url_cookie_inputs.KLDIVERGENCE_BARPLOT.onChange(target.checked);
            }}
          />
        </label>
      </div>
    );
  };

  protected renderMiniMapToggle = () => {
    return (
      <div className="minimap-toggle">
        <label>
          <strong>Show MiniMap:</strong>

          <input
            name="showMiniMap"
            type="checkbox"
            checked={this.state.showMiniMap}
            onChange={(e) => {
              const target = e.target;
              this.setState({
                showMiniMap: target.checked,
              });
              this.url_cookie_inputs.MINIMAP.onChange(target.checked);
            }}
          />
        </label>
      </div>
    );
  };

  protected renderAnnotationToggle = () => {
    return (
      <div className="annotation-toggle">
        <label>
          <strong>Show Annotations:</strong>

          <input
            name="showAnnotations"
            type="checkbox"
            checked={this.state.showAnnotations}
            onChange={(e) => {
              const target = e.target;
              this.setState({
                showAnnotations: target.checked,
              });
              this.url_cookie_inputs.ANNOTATIONS.onChange(target.checked);
            }}
          />
        </label>
      </div>
    );
  };

  protected onAlignmentLoadError(error: AlignmentLoadError) {
    this.setState({
      loadError: error,
      loading: false,
    });
  }

  protected onAlignmentReceived(alignment: Alignment) {
    this.setState({
      alignment: alignment,
      showSettings: false,
      //style: alignment.getDefaultStyle(),
      loading: false,
      loadError: undefined,
    });
  }
}
