import React from "react";
import "./App.scss";
import { Ace } from "ace-builds";
import Alignment from "./Alignment";
import ScrollSync, { ScrollType } from "./ScrollSync";
import { AceMSAComponent } from "./AceMSAComponent";
import { SequenceLogoComponent } from "./SequenceLogoComponent";
import { SequenceConservationComponent } from "./SequenceConservationComponent";
import { AlignmentCanvasComponent } from "./AlignmentCanvasComponent";
import {
  AminoAcidAlignmentStyle,
  NucleotideAlignmentStyle,
  AlignmentTypes,
  AlignmentStyle,
  PositionsToStyle,
  IColorScheme
} from "./MolecularStyles";

export enum AceEditorTypes {
  query,
  consensus,
  alignment,
  position
}

export interface AppProps {}
export interface AppState {
  aceCharacterWidth: number;
  aceEditors: Ace.Editor[];
  alignment?: Alignment;
  alignmentEditorFirstRow?: number;
  alignmentEditorLastRow?: number;

  alignmentStyle: AminoAcidAlignmentStyle | NucleotideAlignmentStyle;
}

class App extends React.Component<AppProps, AppState> {
  constructor(props: AppProps) {
    super(props);
    this.state = {
      aceEditors: [],
      aceCharacterWidth: 0,
      alignmentStyle: new AminoAcidAlignmentStyle() //TODO - decide based on alignment
    };

    //setup scroll groups
    ScrollSync.getInstance().setScrollerGroup("horiz", ScrollType.horizontal);
  }

  async componentDidMount() {
    const result = await fetch(
      `${process.env.PUBLIC_URL}/7fa1c5691376beab198788a726917d48_b0.4.a2m`
    );

    this.setState({
      alignment: Alignment.fromFile(
        "7fa1c5691376beab198788a726917d48_b0.4.a2m",
        await result.text()
      )
    });
  }

  _aceEditorLoaded(id: string, editor: Ace.Editor) {
    console.log("_aceEditorLoaded id =" + id);
    let scrollSync = ScrollSync.getInstance();
    scrollSync.registerScroller(editor, "horiz");
    this.setState({
      aceCharacterWidth: editor.renderer.characterWidth, //todo: check if the same always.
      aceEditors: [editor].concat(this.state.aceEditors)
    });

    //track visible rows to show in canvas MSA
    if (id === "ace-alignment") {
      editor.renderer.on("afterRender", () => {
        // BREAKS LOGO, rerenders everything below and kills performance. React lifecycle stuff.
        this.setState({
          alignmentEditorFirstRow: editor.renderer.getFirstFullyVisibleRow(),
          alignmentEditorLastRow: editor.renderer.getLastFullyVisibleRow()
        });
      });
    }
  }

  _elementLoaded(id: string, scroller: HTMLElement) {
    console.log("_elementLoaded id =" + id);
    let scrollSync = ScrollSync.getInstance();
    scrollSync.registerScroller(scroller, "horiz");
  }

  render() {
    return !this.state.alignment ? null : (
      <div className="App">
        <div id="column_mouseover"></div>

        <div className="testing_box">
          <form>
            <label>Alignment Type:</label>
            {AlignmentTypes.listAll().map(alignmentType => {
              return (
                <div className="radio" key={alignmentType.className}>
                  <label>
                    <input
                      type="radio"
                      value={alignmentType.className}
                      checked={
                        this.state.alignmentStyle.alignmentType ===
                        alignmentType
                      }
                      onChange={e =>
                        this.setState({
                          alignmentStyle: AlignmentStyle.fromAlignmentType(
                            alignmentType
                          )
                        })
                      }
                    />
                    {alignmentType.description}
                  </label>
                </div>
              );
            })}
          </form>

          <form>
            <label>Style:</label>
            {this.state.alignmentStyle.alignmentType.allColorSchemes.map(
              (colorScheme: IColorScheme) => {
                return (
                  <div className="radio" key={colorScheme.className}>
                    <label>
                      <input
                        type="radio"
                        value={colorScheme.className}
                        checked={
                          this.state.alignmentStyle.colorScheme === colorScheme
                        }
                        onChange={e => {
                          const newAlignmentStyle = AlignmentStyle.fromAlignmentType(
                            this.state.alignmentStyle.alignmentType
                          );
                          newAlignmentStyle.colorScheme = colorScheme;
                          newAlignmentStyle.positionsToStyle = this.state.alignmentStyle.positionsToStyle;
                          this.setState({
                            alignmentStyle: newAlignmentStyle
                          });
                        }}
                      />
                      {colorScheme.commonName}
                    </label>
                  </div>
                );
              }
            )}
          </form>

          <form>
            <label>Positions to Style:</label>
            {PositionsToStyle.listAll().map(ptc => {
              return (
                <div className="radio" key={ptc.className}>
                  <label>
                    <input
                      type="radio"
                      value={ptc.className}
                      checked={
                        this.state.alignmentStyle.positionsToStyle === ptc
                      }
                      onChange={e => {
                        const newAlignmentStyle = AlignmentStyle.fromAlignmentType(
                          this.state.alignmentStyle.alignmentType
                        );
                        newAlignmentStyle.colorScheme = this.state.alignmentStyle.colorScheme;
                        newAlignmentStyle.positionsToStyle = ptc;
                        this.setState({
                          alignmentStyle: newAlignmentStyle
                        });
                      }}
                    />
                    {ptc.description}
                  </label>
                </div>
              );
            })}
          </form>
        </div>

        <div className="conservation_box">
          {
            <SequenceConservationComponent
              id="sequence_conservation"
              alignment={this.state.alignment}
              characterWidth={this.state.aceCharacterWidth}
              conservationPlotLoaded={element => {
                this._elementLoaded("sequence_conservation", element);
              }}
            />
          }
        </div>
        <div
          className={`logo_box ${this.state.alignmentStyle.alignmentType.className}
                               ${this.state.alignmentStyle.colorScheme.className} 
                               ${PositionsToStyle.ALL.className}`}
        >
          {
            <SequenceLogoComponent
              id="sequence_logo"
              alignment={this.state.alignment}
              glyphWidth={this.state.aceCharacterWidth}
              logoLoaded={element => {
                this._elementLoaded("sequence_logo", element as HTMLElement);
              }}
            />
          }
        </div>
        <div className="consensusseq_box">
          {
            <AceMSAComponent
              id="ace-consensusseq"
              type={AceEditorTypes.consensus}
              alignment={this.state.alignment}
              topLevelClassNames={[
                this.state.alignmentStyle.alignmentType.className,
                this.state.alignmentStyle.positionsToStyle.className,
                this.state.alignmentStyle.colorScheme.className
              ].join(" ")}
              editorLoaded={editor => {
                this._aceEditorLoaded("ace-consensusseq", editor);
              }}
            />
          }
        </div>
        <div className="queryseq_box">
          {
            <AceMSAComponent
              id="ace-queryseq"
              type={AceEditorTypes.query}
              alignment={this.state.alignment}
              topLevelClassNames={[
                this.state.alignmentStyle.alignmentType.className,
                this.state.alignmentStyle.positionsToStyle.className,
                this.state.alignmentStyle.colorScheme.className
              ].join(" ")}
              editorLoaded={editor => {
                this._aceEditorLoaded("ace-queryseq", editor);
              }}
            />
          }
        </div>
        <div className="position_box">
          {
            <AceMSAComponent
              id="ace-positions"
              type={AceEditorTypes.position}
              alignment={this.state.alignment}
              editorLoaded={editor => {
                this._aceEditorLoaded("ace-positions", editor);
              }}
            />
          }
        </div>
        <div className="datatable_box" id="datatable">
          {
            <AlignmentCanvasComponent
              id="alignment_canvas"
              alignment={this.state.alignment}
              alignmentType={this.state.alignmentStyle.alignmentType}
              positionsToStyle={this.state.alignmentStyle.positionsToStyle}
              colorScheme={this.state.alignmentStyle.colorScheme}
              highlightRows={
                this.state.alignmentEditorFirstRow !== undefined &&
                this.state.alignmentEditorLastRow !== undefined
                  ? [
                      this.state.alignmentEditorFirstRow,
                      this.state.alignmentEditorLastRow
                    ]
                  : undefined
              }
            />
          }
        </div>

        <div className="alignment_box">
          <AceMSAComponent
            id="ace-alignment"
            type={AceEditorTypes.alignment}
            alignment={this.state.alignment}
            topLevelClassNames={[
              this.state.alignmentStyle.alignmentType.className,
              this.state.alignmentStyle.positionsToStyle.className,
              this.state.alignmentStyle.colorScheme.className
            ].join(" ")}
            editorLoaded={editor => {
              this._aceEditorLoaded("ace-alignment", editor);
            }}
          />
        </div>
      </div>
    );
  }
}

export default App;
