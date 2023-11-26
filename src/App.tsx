import React from "react";
import "./App.scss";
import { Alignment } from "./common/Alignment";
import { SequenceSorter } from "./common/AlignmentSorter";
import { UrlLocalstorageBooleanInputManager, UrlLocalstorageInputManager, UrlLocalstorageNumberInputManager, getURLParameters } from "./common/Utils";
import { AlignmentViewer, IBarplotExposedProps } from "./components/AlignmentViewerComponent";
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
import { SequenceBarplotComponent } from "./components/SequenceBarplotComponent";
import { AlignmentLoader, AlignmentLoadError } from "./common/AlignmentLoader";

interface AppProps {}
interface AppState {
  alignment?: Alignment;
  style: AminoAcidAlignmentStyle | NucleotideAlignmentStyle;
  positionsToStyle: PositionsToStyle;
  residueColoring: ResidueColoring;
  sortBy: SequenceSorter;
  logoPlotStyle: LOGO_TYPES;
  zoomLevel: number;
  showLogo: boolean;
  showMiniMap: boolean;
  showConservationBarplot: boolean;
  showEntropyGapBarplot: boolean;
  showKLDivergenceBarplot: boolean;
  showAnnotations: boolean;
  showSettings: boolean;
  loading?: boolean;
  loadError?: AlignmentLoadError;
  removeDuplicateSeqs: boolean;
}

export default class App extends React.Component<AppProps, AppState> {
  private urlInputs;

  constructor(props: AppProps) {
    super(props);
    this.state = {
      style: new AminoAcidAlignmentStyle(),
      residueColoring: ResidueColoring.LIGHT,
      positionsToStyle: PositionsToStyle.ALL,
      logoPlotStyle: LOGO_TYPES.LETTERS, //TODO - decide NT or AA based on alignment
      zoomLevel: 12,
      sortBy: SequenceSorter.INPUT,
      showLogo: true,
      showMiniMap: true,
      showConservationBarplot: true,
      showEntropyGapBarplot: true,
      showKLDivergenceBarplot: false,
      showAnnotations: true,
      showSettings: true,
      removeDuplicateSeqs: true
    };

    //write defaults for all UI parameters
    UrlLocalstorageInputManager.initializeAllInputs()
    this.urlInputs = {
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
        (s: LOGO_TYPES) => {return s === LOGO_TYPES.LETTERS ? 'letters' : 'bars'},
        (key: string) => {
          return key === 'letters' ? LOGO_TYPES.LETTERS : LOGO_TYPES.BARS;
        },
      ),

      MINIMAP: new UrlLocalstorageBooleanInputManager(true, 'minimap'),
      CONSERVATION_BARPLOT: new UrlLocalstorageBooleanInputManager(true, 'conservation-barplot'),
      ENTROPY_BARPLOT: new UrlLocalstorageBooleanInputManager(true, 'entropy-barplot'),
      KLDIVERGENCE_BARPLOT: new UrlLocalstorageBooleanInputManager(false, 'kl-divergence-barplot'),
      ANNOTATIONS: new UrlLocalstorageBooleanInputManager(true, 'annotations'),
      SHOW_LOGO: new UrlLocalstorageBooleanInputManager(true, 'show-logo'),

      REMOVE_DUPLICATE_SEQS: new UrlLocalstorageBooleanInputManager(true, 'remove-duplicates'),

      ZOOM_LEVEL: new UrlLocalstorageNumberInputManager(12, 'zoom-level'),
    };

    this.onAlignmentReceived = this.onAlignmentReceived.bind(this);
    this.onAlignmentLoadError = this.onAlignmentLoadError.bind(this);
  }

  componentDidMount() {
    const params = getURLParameters();

    //is there an alignment in the URL?
    const alignmentUrlName = 'alignment-url'
    if (params.has(alignmentUrlName) && 
        typeof params.get(alignmentUrlName) === 'string') {
      this.setState({
        loading: true,
      });

      AlignmentLoader.loadAlignmentFromURL(
        params.get(alignmentUrlName) as string,
        this.state.removeDuplicateSeqs,
        this.onAlignmentReceived,
        this.onAlignmentLoadError
      );
    }

    this.setState({
      alignment: undefined,
      style: this.urlInputs.ALIGNMENT_STYLE.initialValue,
      positionsToStyle: this.urlInputs.POSITIONS_TO_STYLE.initialValue,
      residueColoring: this.urlInputs.RESIDUE_COLORING.initialValue,
      logoPlotStyle: this.urlInputs.LOGO_STYLE.initialValue,
      sortBy: this.urlInputs.SORT_BY.initialValue,
      
      showMiniMap: this.urlInputs.MINIMAP.initialValue,
      showConservationBarplot: this.urlInputs.CONSERVATION_BARPLOT.initialValue,
      showEntropyGapBarplot: this.urlInputs.ENTROPY_BARPLOT.initialValue,
      showKLDivergenceBarplot: this.urlInputs.KLDIVERGENCE_BARPLOT.initialValue,
      showAnnotations: this.urlInputs.ANNOTATIONS.initialValue,
      zoomLevel: this.urlInputs.ZOOM_LEVEL.initialValue,

      removeDuplicateSeqs: this.urlInputs.REMOVE_DUPLICATE_SEQS.initialValue,

      showSettings: true,
    });
  }

  render() {
    const {
      alignment,
      showLogo,
      logoPlotStyle,
      positionsToStyle,
      residueColoring,
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
    const { alignment, loading, loadError, showSettings, residueColoring, positionsToStyle } = this.state;
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
        {this.renderFileDropZone()}
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
              className={"settings-content"}
              style={{
                display: showSettings ? "block" : "none",
              }}
            >
              {this.renderAlignmentTypeLabel(style)}
              {this.renderSortControl()}
              {this.renderColorScheme(style)}
              {this.renderResidueColoring(residueColoring)}
              {this.renderPositionStyling(positionsToStyle)}
              {this.renderSequenceLogo()}
              {this.renderZoomButtons()}

              {this.renderToggle(
                "annotation-toggle",
                "Show Logo", 
                "showLogo",
                "SHOW_LOGO"
              )}

              {this.renderToggle(
                "annotation-toggle",
                "Show Annotations",
                "showAnnotations",
                "ANNOTATIONS"
              )}
              {this.renderToggle(
                "minimap-toggle",
                "Show MiniMap",
                "showMiniMap",
                "MINIMAP"
              )}
              {this.renderToggle(
                "barplot-conservation-toggle",
                "Show Conservation Barplot",
                "showConservationBarplot",
                "CONSERVATION_BARPLOT"
              )}
              {this.renderToggle(
                "barplot-entropy-gaps-toggle",
                "Show Entropy / Gaps Barplot",
                "showEntropyGapBarplot",
                "ENTROPY_BARPLOT"
              )}
              {this.renderToggle(
                "barplot-kldivergence-toggle",
                "Show KL Divergence Barplot",
                "showKLDivergenceBarplot",
                "KLDIVERGENCE_BARPLOT"
              )}

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
              this.urlInputs.SORT_BY.onChange(sb);
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
              );
              this.setState({
                style: newAlignmentStyle,
              });
              this.urlInputs.ALIGNMENT_STYLE.onChange(newAlignmentStyle);
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
              this.urlInputs.ALIGNMENT_STYLE.onChange(newStyle);
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
  protected renderResidueColoring = (
    residueColoring: ResidueColoring
  ) => {
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
              this.urlInputs.RESIDUE_COLORING.onChange(rc);
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
  protected renderPositionStyling = (
    positionsToStyle: PositionsToStyle
  ) => {
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
              this.urlInputs.POSITIONS_TO_STYLE.onChange(pts);
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
              this.urlInputs.LOGO_STYLE.onChange(ls);
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
                this.urlInputs.ZOOM_LEVEL.onChange(zl);
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
                this.setState({
                  zoomLevel: zl,
                });
                this.urlInputs.ZOOM_LEVEL.onChange(zl);
              }}
            >
              +
            </button>
          </div>
        </label>
      </div>
    );
  };

  protected renderFileDropZone = () => {
    return (
      <AlignmentFileDrop
        removeDuplicateSeqs={true} //todo - prop this, it is presently in the 
        alignmentLoaded={this.onAlignmentReceived}
        onAlignmenLoadError={(e)=>{
          this.onAlignmentLoadError(e);
          this.setState({
            showSettings: true,
          });
        }}
        onFileLoadStart={() => {
          this.setState({
            loading: true,
          });
        }}
      />
    )
  }

  protected renderFileUpload = () => {
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
          this.setState({
            loading: true,
          });
        }}
        removeDuplicateSeqs={this.state.removeDuplicateSeqs}
        setRemoveDuplicateSeqs={(newValue)=>{
          this.setState({
            removeDuplicateSeqs: newValue
          })
          this.urlInputs.REMOVE_DUPLICATE_SEQS.onChange(newValue);
        }}
        onAlignmentLoaded={this.onAlignmentReceived}
        onAlignmenLoadError={this.onAlignmentLoadError}
      />
    );
  };

  protected renderToggle = (
    classInputName: string,
    label: string,
    stateVar: string,
    urlInputLabel: string,
  ) => {
    return (
      <div className={classInputName}>
        <label>
          <strong>{label}:</strong>

          <input
            name={classInputName}
            type="checkbox"
            checked={this.state[stateVar]}
            onChange={(e) => {
              const newState = {};
              newState[stateVar] = e.target.checked;
              this.setState(newState);
              this.urlInputs[urlInputLabel].onChange(e.target.checked);
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
      style: alignment.getDefaultStyle(),
      loading: false,
      loadError: undefined,
    });
  }
}
