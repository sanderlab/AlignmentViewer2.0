import React from "react";
import "./App.scss";
import { Alignment } from "./common/Alignment";
import { SequenceSorter } from "./common/AlignmentSorter";
import { getURLParameters } from "./common/Utils";
import { AlignmentViewer } from "./components/AlignmentViewerComponent";
import {
  AminoAcidAlignmentStyle,
  NucleotideAlignmentStyle,
  AlignmentStyle,
  AlignmentTypes,
  PositionsToStyle,
  IColorScheme,
  ResidueStyle,
} from "./common/MolecularStyles";
import { LOGO_TYPES } from "./components/SequenceLogoComponent";
import { AlignmentFileLoaderComponent } from "./components/AlignmentFileLoaderComponent";
import { SequenceBarplotComponent } from "./components/SequenceBarplotComponent";
import { AlignmentLoader, AlignmentLoadError } from "./common/AlignmentLoader";

interface AppProps {}
interface AppState {
  alignment?: Alignment;
  style: AminoAcidAlignmentStyle | NucleotideAlignmentStyle;
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

const URL_PARAM_NAMES = {
  ALIGNMENT_URL: "alignment-url",
};

export default class App extends React.Component<AppProps, AppState> {
  constructor(props: AppProps) {
    super(props);
    this.state = {
      style: new AminoAcidAlignmentStyle(),
      logoPlotStyle: LOGO_TYPES.LETTERS, //TODO - decide NT or AA based on alignment
      zoomLevel: 14,
      sortBy: SequenceSorter.INPUT,
      showMiniMap: true,
      showConservationBarplot: true,
      showEntropyGapBarplot: true,
      showKLDivergenceBarplot: false,
      showAnnotations: true,
      showSettings: true,
    };
    this.onAlignmentReceived = this.onAlignmentReceived.bind(this);
    this.onAlignmentLoadError = this.onAlignmentLoadError.bind(this);
  }

  componentDidMount() {
    //is there an alignment in the URL?
    const params = getURLParameters();
    if (params.has(URL_PARAM_NAMES.ALIGNMENT_URL)) {
      this.setState({
        loading: true,
      });

      AlignmentLoader.loadAlignmentFromURL(
        params.get(URL_PARAM_NAMES.ALIGNMENT_URL),
        this.onAlignmentReceived,
        this.onAlignmentLoadError
      );
    }
  }

  render() {
    const {
      alignment,
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

    const barplots = [];
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
              {this.renderSortControl()}
              {this.renderColorScheme(style)}
              {this.renderResidueDetail(style)}
              {this.renderPositionStyling(style)}
              {this.renderSequenceLogo()}
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
          <strong>Sort order:</strong>
          <select
            value={sortBy.key}
            onChange={(e) =>
              this.setState({
                sortBy: SequenceSorter.fromKey(e.target.value)!,
              })
            }
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
            onChange={(e) =>
              this.setState({
                style: AlignmentStyle.fromAlignmentType(
                  AlignmentTypes.fromKey(e.target.value)!
                ),
              })
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
              this.setState({
                style: {
                  ...style!,
                  colorScheme:
                    style.alignmentType.allColorSchemes[
                      parseInt(e.target.value)
                    ],
                },
              });
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
  protected renderResidueDetail = (
    style: AminoAcidAlignmentStyle | NucleotideAlignmentStyle
  ) => {
    return (
      <div>
        <label>
          <strong>Residue Style:</strong>
          <select
            value={style.residueDetail.key}
            onChange={(e) => {
              this.setState({
                style: {
                  ...style,
                  residueDetail: ResidueStyle.fromKey(e.target.value)!,
                },
              });
            }}
          >
            {ResidueStyle.list.map((rd) => {
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
    style: AminoAcidAlignmentStyle | NucleotideAlignmentStyle
  ) => {
    return (
      <div>
        <label>
          <strong>Positions to Style:</strong>
          <select
            value={PositionsToStyle.list.indexOf(style.positionsToStyle)}
            onChange={(e) => {
              this.setState({
                style: {
                  ...style,
                  positionsToStyle:
                    PositionsToStyle.list[parseInt(e.target.value)],
                },
              });
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
              this.setState({
                logoPlotStyle: e.target.value as LOGO_TYPES,
              });
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
                this.setState({
                  zoomLevel: zoomLevel - 1,
                });
              }}
            >
              -
            </button>
            {zoomLevel}
            <button
              type="button"
              disabled={zoomLevel > 15}
              onClick={(e) => {
                this.setState({
                  zoomLevel: zoomLevel + 1,
                });
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
          <strong>Show conservation barplot:</strong>

          <input
            name="conservationBarplotToggle"
            type="checkbox"
            checked={this.state.showConservationBarplot}
            onChange={(e) => {
              const target = e.target;
              this.setState({
                showConservationBarplot: target.checked,
              });
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
          <strong>Show entropy/gap barplot:</strong>

          <input
            name="entropyGapBarplotToggle"
            type="checkbox"
            checked={this.state.showEntropyGapBarplot}
            onChange={(e) => {
              const target = e.target;
              this.setState({
                showEntropyGapBarplot: target.checked,
              });
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
          <strong>Show KL Divergence barplot:</strong>

          <input
            name="kldivergenceBarplotToggle"
            type="checkbox"
            checked={this.state.showKLDivergenceBarplot}
            onChange={(e) => {
              const target = e.target;
              this.setState({
                showKLDivergenceBarplot: target.checked,
              });
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
