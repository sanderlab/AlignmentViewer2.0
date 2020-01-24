import React from 'react';
import './App.css';
import {AceEditorComponent} from './AceEditorComponent'
import ScrollSync, { ScrollType } from './ScrollSync';
import { Ace, edit } from 'ace-builds';
import { SequenceLogoComponent } from './SequenceLogoComponent';

export interface Sequence{
  id: string;
  sequence: string;
};

export enum AceEditorTypes{
  query, alignment, position
}

export interface AppProps{
}
export interface AppState{
  aceCharacterWidth: number;
  aceEditors: Ace.Editor[];

  alignment?: Sequence[];
  targetSequence?: Sequence;
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

    const fastaSplitCaret = (await result.text()).split('>');
    var targetSequence: undefined | Sequence;
    var sequences: Sequence[] = [];
    for(var i = 0; i < fastaSplitCaret.length; i++){
        const seqArr = fastaSplitCaret[i].split(/\r?\n/);
        if (seqArr.length > 1){
            var seqObj = {
                'id': seqArr[0],
                'sequence': seqArr.slice(1).join('')
            }
            if (!targetSequence){
                targetSequence = seqObj
            }
            else{
                sequences.push(seqObj);
            }
        }
    }

    this.setState({
      alignment: sequences,
      targetSequence: targetSequence,
    });
  }


  _aceEditorLoaded(id: string, editor: Ace.Editor){
    let scrollSync = ScrollSync.getInstance();
    scrollSync.registerScroller(editor, 'horiz');
    this.setState({
      aceCharacterWidth: editor.renderer.characterWidth, //todo: check if the same always.
      aceEditors: [editor].concat(this.state.aceEditors)
    });
    console.log('_aceEditorLoaded: ' + id);
  }

  _elementLoaded(id: string, scroller: HTMLElement, scrollerParentElement: HTMLElement){
    let scrollSync = ScrollSync.getInstance();
    scrollSync.registerScroller(scrollerParentElement, 'horiz');
    console.log('_elementLoaded: ' + id);
  }

  render() {
    return (!this.state.targetSequence || !this.state.alignment) ? null : (
      <div className="App">
        <div id="column_mouseover"></div>

        <div className="conservation_box">conservation_box - for a conservation plot</div>
        <div className="logo_box">
          <SequenceLogoComponent 
            id="sequence_logo" 
            targetSequence={this.state.targetSequence}
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
              targetSequence={this.state.targetSequence}
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
              targetSequence={this.state.targetSequence}
              alignment={this.state.alignment}
              editorLoaded={(editor) => this._aceEditorLoaded('ace-positions', editor)}
            />
          }
        </div>
        <div className="datatable_box" id="datatable">
          datatable_box for data about each sequence
          <canvas id="msaimage"></canvas>
        </div>
        
        <div className="alignment_box">
          <AceEditorComponent 
              id="ace-alignment"
              type={AceEditorTypes.alignment}
              targetSequence={this.state.targetSequence}
              alignment={this.state.alignment}
              editorLoaded={(editor) => this._aceEditorLoaded('ace-alignment', editor)}
          />
        </div>
      </div>
    );
  }
}

export default App;
