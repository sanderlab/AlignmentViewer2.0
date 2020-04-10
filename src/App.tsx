import React from "react";
import "./App.scss";
import Alignment, { SequenceSortOptions } from "./common/Alignment";
import { AlignmentViewer } from "./components/AlignmentViewerComponent";
import {
  AminoAcidAlignmentStyle,
  NucleotideAlignmentStyle,
  AlignmentStyle,
  AlignmentTypes,
  PositionsToStyle,
  IColorScheme,
  ResidueDetailTypes,
} from "./common/MolecularStyles";
import { LOGO_TYPES } from "./components/SequenceLogoComponent";
import { FileInputComponent } from "./components/FileInputComponent";

export interface AppProps {}
export interface AppState {
  alignment?: Alignment;
  style: AminoAcidAlignmentStyle | NucleotideAlignmentStyle;
  sortBy: SequenceSortOptions;
  logoPlotStyle: LOGO_TYPES;
  zoomLevel: number;
  showMiniMap: boolean;
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
      showAnnotations: true,
      showSettings: true,
    };
  }

  async componentDidMount() {
    /*this.setState({
      alignment: await this.getAlignmentForFile(
        "7fa1c5691376beab198788a726917d48_b0.4.a2m"
      ),
      style: new AminoAcidAlignmentStyle()
    });*/
  }

  render() {
    const {
      alignment,
      logoPlotStyle,
      showAnnotations,
      showMiniMap,
      sortBy,
      style,
      zoomLevel,
    } = this.state;

    const alignmentElement = !alignment ? (
      <></>
    ) : (
      <div className="av_holder">
        <AlignmentViewer
          alignment={alignment}
          style={style}
          logoPlotStyle={logoPlotStyle}
          zoomLevel={zoomLevel}
          sortBy={sortBy}
          showMiniMap={showMiniMap}
          showAnnotations={showAnnotations}
        ></AlignmentViewer>
      </div>
    );

    return (
      <div>
        {this.renderSettingsBox(style)}
        {alignmentElement}
      </div>
    );
  }

  /*
  protected getAlignmentForFile = async (filename: string) => {
    const result = await fetch(`${process.env.PUBLIC_URL}/${filename}`);

    return Alignment.fromFileContents(filename, await result.text());
  };*/

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
      <div className="settings_box">
        <form>
          <div className="settings-header">
            <button
              style={{
                display: this.state.showSettings ? "none" : "block",
              }}
              type="button"
              className="button-link"
              onClick={(e) => {
                this.setState({
                  showSettings: true,
                });
              }}
            >
              Expand
            </button>
            <button
              style={{
                display: this.state.showSettings ? "block" : "none",
              }}
              type="button"
              className="button-link"
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
            {this.renderAnnotationToggle()}
            <br></br>
            {this.renderFileUpload()}
            {this.renderExampleLinks()}
            <div
              className="loader"
              style={{
                display: this.state.loading ? "block" : "none",
              }}
            ></div>
          </div>
        </form>
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
          <strong>Style:</strong>
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
          <strong>Residue Detail:</strong>
          <select
            value={style.residueDetail.key}
            onChange={(e) => {
              this.setState({
                style: {
                  ...style,
                  residueDetail: ResidueDetailTypes.fromKey(e.target.value)!,
                },
              });
            }}
          >
            {ResidueDetailTypes.list.map((rd) => {
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
          <strong>Character size:</strong>
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
        <FileInputComponent
          labelText={"Upload Sequence File:"}
          onFileLoadCb={this.onFileUpload}
        />
      </div>
    );
  };

  protected renderExampleLinks = () => {
    return (
      <div className="examples">
        <label>
          <strong>Example Alignments:</strong>
          <button
            type="button"
            className="button-link"
            onClick={async (e) => {
              this.setState({
                loading: true,
              });
              const f = new File(
                [
                  await (
                    await fetch(
                      `${process.env.PUBLIC_URL}/7fa1c5691376beab198788a726917d48_b0.4.a2m`
                    )
                  ).blob(),
                ],
                "beta_lactamase_example.fasta"
              );
              this.onFileUpload(f);
            }}
          >
            β-lactamase
          </button>
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

  protected onFileUpload = async (file: File) => {
    //const fileText = await file.text(); //doesn't work in modern safari or even slightly older firefox
    this.setState({
      loading: true,
    });
    var reader = new FileReader();
    reader.onload = (e) => {
      const fileText = reader.result as string;
      const alignment = Alignment.fromFileContents(file.name, fileText);
      this.setState({
        alignment: alignment,
        loading: false,
      });
    };
    reader.readAsText(file);
  };
}
