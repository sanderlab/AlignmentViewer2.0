import React from 'react';
import './App.css';
import {AceEditorComponent} from './AceEditorComponent'
import ScrollSync, { ScrollType } from './ScrollSync';
import { Ace, edit } from 'ace-builds';
import { SequenceLogoComponent } from './SequenceLogoComponent';
import { SequenceConservationComponent } from './SequenceConservationComponent';
import Alignment from './Alignment';
import { AlignmentCanvasComponent } from './AlignmentCanvasComponent';


export enum AceEditorTypes{
  query, alignment, position
}

export interface AppProps{
}
export interface AppState{
  aceCharacterWidth: number;
  aceEditors: Ace.Editor[];
  alignment?: Alignment;
}

class App extends React.Component <AppProps, AppState> {

  constructor(props: AppProps) {
    super(props);
    this.state = {
      aceEditors: [],
      aceCharacterWidth: 0
    }

    //setup scroll groups
    ScrollSync.getInstance().setScrollerGroup('horiz', ScrollType.horizontal);
  }
  
  async componentDidMount() {
    const result = await fetch(`${process.env.PUBLIC_URL}/7fa1c5691376beab198788a726917d48_b0.4.a2m`);

    this.setState({
      alignment: Alignment.fromFile(await result.text())
    })
  }


  _aceEditorLoaded(id: string, editor: Ace.Editor){
    let scrollSync = ScrollSync.getInstance();
    scrollSync.registerScroller(editor, 'horiz');
    this.setState({
      aceCharacterWidth: editor.renderer.characterWidth, //todo: check if the same always.
      aceEditors: [editor].concat(this.state.aceEditors)
    });
  }

  _elementLoaded(id: string, scroller: HTMLElement, scrollerParentElement: HTMLElement){
    let scrollSync = ScrollSync.getInstance();
    scrollSync.registerScroller(scrollerParentElement, 'horiz');
  }

  render() {
    return (!this.state.alignment) ? null : (
      <div className="App">
        <div id="column_mouseover"></div>

        <div className="conservation_box">
          <SequenceConservationComponent 
            id="sequence_conservation" 
            alignment={this.state.alignment}
            characterWidth={this.state.aceCharacterWidth}
            conservationPlotLoaded={(element) => this._elementLoaded('sequence_conservation', element, element) }
          />
        </div>
        <div className="logo_box">
          <SequenceLogoComponent 
            id="sequence_logo" 
            alignment={this.state.alignment}
            characterWidth={this.state.aceCharacterWidth}
            logoLoaded={(element) => this._elementLoaded('sequence_logo', element, element.parentElement as HTMLElement) }
          />
        </div>
        <div className="queryseq_box">
          {
            <AceEditorComponent 
              id="ace-queryseq"
              type={AceEditorTypes.query}
              alignment={this.state.alignment}
              editorLoaded={(editor) => this._aceEditorLoaded('ace-queryseq', editor)}
            />
          }
        </div>
        <div className="position_box">
          {
            <AceEditorComponent 
              id="ace-positions"
              type={AceEditorTypes.position}
              alignment={this.state.alignment}
              editorLoaded={(editor) => this._aceEditorLoaded('ace-positions', editor)}
            />
          }
        </div>
        <div className="datatable_box" id="datatable">
          <AlignmentCanvasComponent
            id="alignment_canvas" 
            alignment={this.state.alignment}
            characterWidth={this.state.aceCharacterWidth}
          />
        </div>
        
        <div className="alignment_box">
          <AceEditorComponent 
              id="ace-alignment"
              type={AceEditorTypes.alignment}
              alignment={this.state.alignment}
              editorLoaded={(editor) => this._aceEditorLoaded('ace-alignment', editor)}
          />
        </div>
      </div>
    );
  }
}

export default App;
