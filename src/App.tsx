import React from "react";
import "./App.scss";
import { Alignment, SequenceSortOptions } from "./common/Alignment";
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

interface AppProps {}
interface AppState {
  alignment?: Alignment;
  style: AminoAcidAlignmentStyle | NucleotideAlignmentStyle;
  sortBy: SequenceSortOptions;
  logoPlotStyle: LOGO_TYPES;
  zoomLevel: number;
  showMiniMap: boolean;
  showEntropyGapBarplot: boolean;
  showKLDivergenceBarplot: boolean;
  showAnnotations: boolean;
  showSettings: boolean;
  loading?: boolean;
}

export default class App extends React.Component<AppProps, AppState> {
  constructor(props: AppProps) {
    super(props);
    this.state = {
      style: new AminoAcidAlignmentStyle(),
      logoPlotStyle: LOGO_TYPES.LETTERS, //TODO - decide NT or AA based on alignment
      zoomLevel: 14,
      sortBy: SequenceSortOptions.INPUT,
      showMiniMap: false,
      showEntropyGapBarplot: true,
      showKLDivergenceBarplot: false,
      showAnnotations: true,
      showSettings: true,
    };
    this.onAlignmentReceived = this.onAlignmentReceived.bind(this);
  }

  render() {
    const {
      alignment,
      logoPlotStyle,
      showAnnotations,
      showEntropyGapBarplot,
      showKLDivergenceBarplot,
      showMiniMap,
      sortBy,
      style,
      zoomLevel,
    } = this.state;

    const barplots = [];
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
    const { alignment } = this.state;
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
              <button
                className={`button-link${
                  this.state.showSettings ? " hide" : ""
                }`}
                type="button"
                onClick={(e) => {
                  this.setState({
                    showSettings: true,
                  });
                }}
              >
                Expand
              </button>
              <button
                className={`button-link${
                  this.state.showSettings ? "" : " hide"
                }`}
                type="button"
                onClick={(e) => {
                  this.setState({
                    showSettings: false,
                  });
                }}
              >
                Hide
              </button>
              <div>
                <h2>{`AlignmentViewer 2.0 Settings Demo`}</h2>
                {alignmentDescription}
              </div>
            </div>
            <div
              style={{
                display: this.state.showSettings ? "block" : "none",
                position: "relative",
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
              {this.renderEntropyGapBarplotToggle()}
              {this.renderKLDivergenceBarplot()}
              {this.renderAnnotationToggle()}
              <br></br>
              {this.renderFileUpload()}
              <div
                className={`loader${this.state.loading ? "" : " hide"}`}
              ></div>
            </div>
          </form>
        </div>
      </div>
    );
  };

  protected renderSortControl = () => {
    const { sortBy } = this.state;
    return (
      <div>
        <label>
          <strong>Sort order:</strong>
          <select
            value={sortBy.key}
            onChange={(e) =>
              this.setState({
                sortBy: SequenceSortOptions.fromKey(e.target.value)!,
              })
            }
          >
            {SequenceSortOptions.list.map((sso) => {
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
              disabled={zoomLevel < 3}
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
          ]}
          onFileLoadStart={() => {
            this.setState({
              loading: true,
            });
          }}
          onAlignmentLoaded={this.onAlignmentReceived}
        />
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

  protected onAlignmentReceived(alignment: Alignment) {
    this.setState({
      alignment: alignment,
      showSettings: false,
      style: alignment.getDefaultStyle(),
      loading: false,
    });
  }
}
