/**
 * Base class for a webgl alignment that shows alignment detail.
 */
import React from "react";
import "./WebGLAlignmentComponent.scss";
import { Alignment } from "../common/Alignment";
import { SequenceSorter } from "../common/AlignmentSorter";
import { Stage, AppContext } from "@inlet/react-pixi";
import { CanvasAlignmentTiled } from "./CanvasAlignmentTiledComponent";
import { WebGLViewport } from "./WebGLViewportComponent";
import { WebGLViewport2 } from "./WebGLViewportComponent2";
import { WebGLScrollbar } from "./WebGLAlignmentScrollbarComponent";
import {
  AminoAcidAlignmentStyle,
  NucleotideAlignmentStyle,
} from "../common/MolecularStyles";
import { ResizeSensor } from "css-element-queries";
import { store } from "../common/ReduxStore";
import { Provider } from "react-redux";

export interface IWebGLAlignmentProps {
  alignment: Alignment;
  sortBy: SequenceSorter;
  alignmentStyle: AminoAcidAlignmentStyle | NucleotideAlignmentStyle;
  residueWidth: number;

  scrollerLoaded: (e: HTMLElement) => void;
  scrollerUnloaded: (e: HTMLElement) => void;
}
interface IWebGLAlignmetnState {
  //viewport is the webgl window in which we draw the alignment
  webGLViewport: {
    pixelsFromWorldTop: number;
  };

  //the client is the dom element is the parent to all the
  //other components (webgl, scroller etc). The dimensions are
  //the actual height / width visible on the screen
  clientDimensions?: {
    width: number;
    height: number;
  };

  mouseHovering: boolean;
}

export class WebGLAlignmentComponent extends React.Component<
  IWebGLAlignmentProps,
  IWebGLAlignmetnState
> {
  protected static CHARACTER_HEIGHT_TO_WIDTH_RATIO = 2;

  protected app: PIXI.Application | undefined;
  protected resizeSensor?: ResizeSensor;
  protected ref?: HTMLDivElement;

  constructor(props: IWebGLAlignmentProps) {
    super(props);
    this.state = {
      webGLViewport: {
        pixelsFromWorldTop: 0,
      },
      mouseHovering: false,
    };
    this.setupResizeSensor = this.setupResizeSensor.bind(this);
    this.mouseEntered = this.mouseEntered.bind(this);
    this.mouseExited = this.mouseExited.bind(this);
    this.scrollbarDragStart = this.scrollbarDragStart.bind(this);
    this.scrollbarDragEnd = this.scrollbarDragEnd.bind(this);
    this.scrollbarDragMove = this.scrollbarDragMove.bind(this);
  }

  /*
   *
   *
   * FUNCTIONS THAT NEED BINDING
   *
   *
   */

  protected setupResizeSensor(ref: HTMLDivElement | null) {
    if (ref && !this.resizeSensor) {
      this.ref = ref;
      this.resizeSensor = new ResizeSensor(ref, () => {
        if (
          !this.state.clientDimensions ||
          this.state.clientDimensions.width !== ref.clientWidth ||
          this.state.clientDimensions.height !== ref.clientHeight
        ) {
          setTimeout(() => {
            //flashes (worse) without setTimeout. Safari still flashing.
            this.setState({
              clientDimensions: {
                width: ref.clientWidth,
                height: ref.clientHeight,
              },
            });
          });
        }
      });
    }
  }

  protected mouseEntered(e: React.MouseEvent) {
    this.setState({
      mouseHovering: true,
    });
  }
  protected mouseExited(e: React.MouseEvent) {
    this.setState({
      mouseHovering: false,
    });
  }

  protected scrollbarDragStart(e: React.MouseEvent) {}
  protected scrollbarDragEnd(e: React.MouseEvent) {}
  protected scrollbarDragMove(e: React.MouseEvent) {}

  /*
   *
   *
   * RENDERING FUNCTIONS
   *
   *
   */
  protected getScale() {
    const { residueWidth } = this.props;
    return {
      x: residueWidth,
      y: WebGLAlignmentComponent.CHARACTER_HEIGHT_TO_WIDTH_RATIO * residueWidth,
    };
  }

  protected getViewportSizing(sequenceIndiciesToDraw: number[]) {
    const { alignment } = this.props;
    const scale = this.getScale();
    return {
      viewWidth: alignment.getMaxSequenceLength() * scale.x,
      viewHeight: sequenceIndiciesToDraw.length * scale.y,
      worldHeight: alignment.getSequenceCount() * scale.y,
      worldWidth: alignment.getMaxSequenceLength() * scale.x,
    };
  }

  protected getVisibleSequences() {
    const { alignment } = this.props;
    const { webGLViewport, clientDimensions } = this.state;
    if (webGLViewport === undefined || clientDimensions === undefined) {
      return undefined;
    }

    const viewportHeight = clientDimensions.height;

    const scale = this.getScale();
    const spaceForNumSequences = Math.ceil(viewportHeight / scale.y);
    const numVisibleSeqs =
      spaceForNumSequences < alignment.getSequenceCount()
        ? spaceForNumSequences
        : alignment.getSequenceCount();
    let startingSeqIdx = Math.floor(webGLViewport.pixelsFromWorldTop / scale.y);
    if (startingSeqIdx + numVisibleSeqs > alignment.getSequenceCount()) {
      startingSeqIdx = alignment.getSequenceCount() - numVisibleSeqs;
    }

    const sequenceIndiciesToDraw = new Array(numVisibleSeqs)
      .fill(undefined)
      .map((val, idx) => idx + startingSeqIdx);

    return {
      startingSeqIdx: startingSeqIdx,
      sequenceIndiciesToDraw: sequenceIndiciesToDraw,
    };
  }

  protected renderScrollbar() {
    const { clientDimensions } = this.state;
    const visibleSeqs = this.getVisibleSequences();
    if (clientDimensions === undefined || visibleSeqs === undefined) {
      return null;
    }
    const viewportSizing = this.getViewportSizing(
      visibleSeqs.sequenceIndiciesToDraw
    );

    return (
      <WebGLScrollbar visible={true} worldHeight={viewportSizing.worldHeight} />
    );
  }

  protected renderStage() {
    const { alignment, alignmentStyle, sortBy } = this.props;
    const visibleSeqs = this.getVisibleSequences();
    if (visibleSeqs === undefined) {
      return null;
    }
    const scale = this.getScale();
    const viewportSizing = this.getViewportSizing(
      visibleSeqs.sequenceIndiciesToDraw
    );

    return (
      <Stage
        width={viewportSizing.viewWidth}
        height={viewportSizing.viewHeight}
        options={{ antialias: false, transparent: true }}
      >
        <AppContext.Consumer>
          {(app) => {
            this.app = app;
            app.stage.scale.x = scale.x;
            app.stage.scale.y = scale.y;
            return (
              <CanvasAlignmentTiled
                alignment={alignment}
                alignmentType={alignmentStyle.alignmentType}
                sortBy={sortBy}
                colorScheme={alignmentStyle.colorScheme}
                positionsToStyle={alignmentStyle.positionsToStyle}
                drawSequencesIndicies={visibleSeqs.sequenceIndiciesToDraw}
              />
            );
          }}
        </AppContext.Consumer>

        <AppContext.Consumer>
          {(app) => (
            //entrypoint to the interaction viewport for registering scroll
            //and zoom and other events. This is not rendering anything, but
            //is only used to calculate interaction changes and report them
            //back to this component.
            /*<WebGLViewport
                app={app}
                screenWidth={viewportSizing.viewWidth}
                screenHeight={viewportSizing.viewHeight}
                worldWidth={viewportSizing.worldWidth}
                worldHeight={viewportSizing.worldHeight}
                onViewportYChanged={(newTop) => {
                  this.setState({
                    webGLViewport: {
                      pixelsFromWorldTop: newTop,
                    },
                  });
                }}
              ></WebGLViewport>*/

            <Provider store={store}>
              <WebGLViewport2
                alignment={alignment}
                screenWidth={viewportSizing.viewWidth}
                screenHeight={viewportSizing.viewHeight}
                worldWidth={viewportSizing.worldWidth}
                worldHeight={viewportSizing.worldHeight}
              ></WebGLViewport2>
            </Provider>
          )}
        </AppContext.Consumer>
      </Stage>
    );
  }

  /*
   *
   *
   * REACT METHODS
   *
   *
   */
  componentDidMount() {
    this.props.scrollerLoaded(this.ref!);
    store.subscribe(() => {
      this.setState({
        webGLViewport: {
          pixelsFromWorldTop: store.getState().webglViewport.pixelsFromWorldTop,
        },
      });
    });
  }

  componentWillUnmount() {
    this.props.scrollerUnloaded(this.ref!);
  }

  render() {
    if (!this.props.alignment) {
      return null;
    }
    return (
      <Provider store={store}>
        <div
          className="webgl-detailed-alignment-viewer"
          onMouseEnter={this.mouseEntered}
          onMouseLeave={this.mouseExited}
        >
          <div
            ref={this.setupResizeSensor}
            className="webgl-detailed-alignment"
          >
            {this.renderStage()}
          </div>
          {this.renderScrollbar()}
        </div>
      </Provider>
    );
  }
}
