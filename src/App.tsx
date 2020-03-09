import React from "react";
import "./App.scss";
import Alignment, { SequenceSortOptions } from "./Alignment";
import { AlignmentViewer } from "./AlignmentViewer";
import {
  AminoAcidAlignmentStyle,
  NucleotideAlignmentStyle,
  AlignmentStyle,
  AlignmentTypes,
  PositionsToStyle,
  IColorScheme,
  ResidueDetailTypes
} from "./MolecularStyles";
import { LOGO_TYPES, SequenceLogoComponent } from "./SequenceLogoComponent";

export interface AppProps {}
export interface AppState {
  alignment?: Alignment;
  style?: AminoAcidAlignmentStyle | NucleotideAlignmentStyle;
  sortBy: SequenceSortOptions;
  logoPlotStyle: LOGO_TYPES;
  zoomLevel: number;
}

export default class App extends React.Component<AppProps, AppState> {
  constructor(props: AppProps) {
    super(props);
    this.state = {
      style: new AminoAcidAlignmentStyle(),
      logoPlotStyle: LOGO_TYPES.LETTERS, //TODO - decide NT or AA based on alignment
      zoomLevel: 12,
      sortBy: SequenceSortOptions.INPUT
    };
  }

  async componentDidMount() {
    const result = await fetch(
      `${process.env.PUBLIC_URL}/7fa1c5691376beab198788a726917d48_b0.4.a2m`
    );

    this.setState({
      alignment: Alignment.fromFileContents(
        "7fa1c5691376beab198788a726917d48_b0.4.a2m",
        await result.text()
      ),
      style: new AminoAcidAlignmentStyle()
    });
  }

  render() {
    return !this.state || !this.state.alignment || !this.state.style ? null : (
      <div>
        <div className="settings_box">
          <form>
            <div>
              <h3>AlignmentViewer 2.0 Settings Demo</h3>
            </div>

            <div>
              <label>
                <strong>Sort order:</strong>
                <select
                  value={this.state.sortBy.key}
                  onChange={e =>
                    this.setState({
                      sortBy: SequenceSortOptions.fromKey(e.target.value)!
                    })
                  }
                >
                  {SequenceSortOptions.list.map(sso => {
                    return (
                      <option value={sso.key} key={sso.key}>
                        {sso.description}
                      </option>
                    );
                  })}
                </select>
              </label>
            </div>

            <div>
              <label>
                <strong>Alignment Type:</strong>
                <select
                  value={this.state.style.alignmentType.key}
                  onChange={e =>
                    this.setState({
                      style: AlignmentStyle.fromAlignmentType(
                        AlignmentTypes.fromKey(e.target.value)!
                      )
                    })
                  }
                >
                  {AlignmentTypes.list.map(alignmentType => {
                    return (
                      <option value={alignmentType.key} key={alignmentType.key}>
                        {alignmentType.description}
                      </option>
                    );
                  })}
                </select>
              </label>
            </div>
            <div>
              <label>
                <strong>Style:</strong>
                <select
                  value={this.state.style.alignmentType.allColorSchemes.indexOf(
                    this.state.style.colorScheme
                  )}
                  onChange={e => {
                    this.setState({
                      style: {
                        ...this.state.style!,
                        colorScheme: this.state.style!.alignmentType
                          .allColorSchemes[parseInt(e.target.value)]
                      }
                    });
                  }}
                >
                  {this.state.style.alignmentType.allColorSchemes.map(
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
            <div>
              <label>
                <strong>Residue Detail:</strong>
                <select
                  value={this.state.style.residueDetail.key}
                  onChange={e => {
                    this.setState({
                      style: {
                        ...this.state.style!,
                        residueDetail: ResidueDetailTypes.fromKey(
                          e.target.value
                        )!
                      }
                    });
                  }}
                >
                  {ResidueDetailTypes.list.map(rd => {
                    return (
                      <option key={rd.key} value={rd.key}>
                        {rd.description}
                      </option>
                    );
                  })}
                </select>
              </label>
            </div>
            <div>
              <label>
                <strong>Positions to Style:</strong>
                <select
                  value={PositionsToStyle.list.indexOf(
                    this.state.style.positionsToStyle
                  )}
                  onChange={e => {
                    this.setState({
                      style: {
                        ...this.state.style!,
                        positionsToStyle:
                          PositionsToStyle.list[parseInt(e.target.value)]
                      }
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

            <div>
              <label>
                <strong>Sequence Logo Style:</strong>
                <select
                  value={this.state.logoPlotStyle}
                  onChange={e => {
                    this.setState({
                      logoPlotStyle: e.target.value as LOGO_TYPES
                    });
                  }}
                >
                  {Object.values(LOGO_TYPES).map(logoType => {
                    return (
                      <option key={logoType} value={logoType}>
                        {logoType}
                      </option>
                    );
                  })}
                </select>
              </label>
            </div>

            <div>
              <label>
                <strong>Zoom:</strong>
                <div className="zoom-level">
                  <button
                    type="button"
                    disabled={this.state.zoomLevel < 3}
                    onClick={e => {
                      this.setState({
                        zoomLevel: this.state.zoomLevel - 1
                      });
                    }}
                  >
                    -
                  </button>
                  {this.state.zoomLevel}
                  <button
                    type="button"
                    disabled={this.state.zoomLevel > 15}
                    onClick={e => {
                      this.setState({
                        zoomLevel: this.state.zoomLevel + 1
                      });
                    }}
                  >
                    +
                  </button>
                </div>
              </label>
            </div>
          </form>
        </div>

        <div className="av_holder">
          <AlignmentViewer
            alignment={this.state.alignment}
            style={this.state.style}
            logoPlotStyle={this.state.logoPlotStyle}
            zoomLevel={this.state.zoomLevel}
            sortBy={this.state.sortBy}
          ></AlignmentViewer>
        </div>
      </div>
    );
  }
}
