import React from 'react';
import logo from './logo.svg';
import './App.css';
import ace from 'ace-builds'
import { RawLogo } from 'logojs-react';
import {AceEditorComponent} from './AceEditorComponent'



  

class App extends React.Component {

  /*
  const CTCF_PPM = [
    [0.09, 0.31, 0.08, 0.50], [0.18, 0.15, 0.45, 0.20], [0.30, 0.05, 0.49, 0.14],
    [0.06, 0.87, 0.02, 0.03], [0.00, 0.98, 0.00, 0.02], [0.81, 0.01, 0.07, 0.09], 
    [0.04, 0.57, 0.36, 0.01], [0.11, 0.47, 0.05, 0.35], [0.93, 0.01, 0.03, 0.01],
    [0.00, 0.00, 0.99, 0.01], [0.36, 0.00, 0.64, 0.00], [0.05, 0.01, 0.55, 0.37], 
    [0.03, 0.00, 0.97, 0.00], [0.06, 0.00, 0.85, 0.07], [0.11, 0.80, 0.00, 0.07],
    [0.40, 0.01, 0.55, 0.01], [0.09, 0.53, 0.33, 0.04], [0.12, 0.35, 0.08, 0.43], 
    [0.44, 0.19, 0.29, 0.06]
  ];
  const ANNOTATED_VALUES = [
    [1,.1,.1,.1,.1,.1,.2,.8],
    [0,0,2,0,0,0,0,0],
    [.5,0,0,0,0,0,0,0],
    [2,0,0,0,0,0,0,0],
    [0,2,0,0,0,0,0,0],
    [2,0,0,0,0,0,0,0],
    [0,0,0,0,0.25,0.25,0.25,0.25],
    [0,0,0,0,0.25,0.25,0.25,0.25],
    [0,0,0,0,0.25,0.25,0.25,0.25],
    [0,0,0,2,0,0,0,0],
    [0,0,2,0,0,0,0,0],
    [0,0,0,2,0,0,0,0],
    [0,0,0,2,0,0,0,0],
    [0,2,0,0,0,0,0,0],
    [0,0,0,2,0,0,0,0]
  ];
  const ANNOTATED_ALPHABET = [
    {"regex":"R","color":"red"},
    {"regex":"C","color":"blue"},
    {"regex":"G","color":"orange"},
    {"regex":"T","color":"#228b22"},
    {"color":"#aaaaaa","regex":"A"},
    {"color":"#aaaaaa","regex":"C"},
    {"color":"#aaaaaa","regex":"G"},
    {"color":"#aaaaaa","regex":"T"}
  ];
  */
 
  constructor(props) {
    super(props);
    this.state = {
      alignment: null,
      targetSequence: null,
      horizPos: 0,
    }

  }
  async componentDidMount() {
    console.log('hi');
    const result = await fetch(`${process.env.PUBLIC_URL}/7fa1c5691376beab198788a726917d48_b0.4.a2m`);

    const fastaSplitCaret = (await result.text()).split('>');
    var targetSequence;
    var sequences = [];
    for(var i = 0; i < fastaSplitCaret.length; i++){
        const seqname_seq_arr = fastaSplitCaret[i].split(/\r?\n/);
        if (seqname_seq_arr.length > 1){
            var seqObj = {
                'seqname': seqname_seq_arr[0],
                'seq': seqname_seq_arr.slice(1).join('')
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
    })
  }

  render() {
    
    return this.state.targetSequence && this.state.alignment && (
      <div className="App">
        <div id="column_mouseover"></div>

        <div className="conservation_box">conservation_box - for a conservation plot</div>
        <div className="logo_box">logo_box - for a sequence logo</div>
        <div className="queryseq_box">
            <AceEditorComponent 
              id="ace-queryseq"
              type="query"
              targetSequence={this.state.targetSequence}
              alignment={this.state.alignment}
              horizPos={this.state.horizPos} 
              onHorizScroll={(e) => this.setState({horizPos: e})}
            />
        </div>
        <div className="position_box">
            {/*<AceEditorComponent 
              id="ace-positions"
              type="position"
              targetSequence={this.state.targetSequence}
              alignment={this.state.alignment}
              horizPos={this.state.horizPos} 
              onHorizScroll={(e) => this.setState({horizPos: e})}
            />*/}
        </div>
        <div className="datatable_box" id="datatable">
          datatable_box for data about each sequence
          <canvas id="msaimage"></canvas>
        </div>
        
        <div className="alignment_box">
          <AceEditorComponent 
              id="ace-alignment"
              type="alignment"
              targetSequence={this.state.targetSequence}
              alignment={this.state.alignment}
              horizPos={this.state.horizPos} 
              onHorizScroll={(e) => this.setState({horizPos: e})}
          />
        </div>
      </div>
    );
  }
}

export default App;
