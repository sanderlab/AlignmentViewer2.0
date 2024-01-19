import * as PIXI from "pixi.js";
import { 
  generateCanvases,
  ICanvasAlignmentTiledProps, 
  ITiledImages
} from "../../webworkers/MSAGenerationWorker";
import { WorkerFactory } from "../../webworkers/WebWorkerFactory";
import { Observable } from "../../common/Observable";


export interface ISharedObservableCommons{
  loaded: boolean;
  cachePropsKey?: string;
}
export interface IWebglStandaloneSharedObservable extends ISharedObservableCommons{
  datatype: "webgl",
  getMSABlocksWebglApp: () => PIXI.Application<HTMLCanvasElement>;
}
export interface IPairedWebglObservable extends ISharedObservableCommons{
  datatype: "synced-webgl",
  getMSABlocksWebglApp: () => PIXI.Application<HTMLCanvasElement>;
  getMinimapBlocksWebglApp: () => PIXI.Application<HTMLCanvasElement>;
}
export interface ICanvasStandaloneSharedObservable extends ISharedObservableCommons{
  datatype: "canvas",
  getCanvasImageData: () => ITiledImages;
}

export type ObservableDatatypeNames = "webgl" | "synced-webgl" | "canvas"; 
export type ObservableDatatype<T> = 
    T extends "webgl" ? IWebglStandaloneSharedObservable:
    T extends "synced-webgl" ? IPairedWebglObservable:
    T extends "canvas" ? ICanvasStandaloneSharedObservable:
    never;

interface IExposedBlockGeneratorFunctionsCommon{
  updateMSA: (props: ICanvasAlignmentTiledProps, propsKey: string) => void;
}
export interface IExposedStandaloneWebglFunctions extends IExposedBlockGeneratorFunctionsCommon{
  updateObserver: Observable<IWebglStandaloneSharedObservable>;
}
export interface IExposedPairedWebglFunctions extends IExposedBlockGeneratorFunctionsCommon{
  updateObserver: Observable<IPairedWebglObservable>;
}
export interface IExposedCanvasFunctions extends IExposedBlockGeneratorFunctionsCommon{
  updateObserver: Observable<ICanvasStandaloneSharedObservable>;
}

//
// PIXI DEFAULTS
//
//PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
//PIXI.SCALE = PIXI.SCALE_MODES.NEAREST;
//PIXI.BaseTexture.defaultOptions.scaleMode = PIXI.SCALE_MODES.NEAREST;
//PIXI.Sprite.


//
//Create a webgl canvas
//
const createWebGlContext = () => {
  const app = new PIXI.Application<HTMLCanvasElement>({
    antialias: true,
    resolution: window.devicePixelRatio,
    autoDensity: true,
    backgroundAlpha: 0,
    view: document.createElement("canvas")
  });
  app.ticker.autoStart = false;
  app.ticker['stop']();
  return app;
}

/**
 * Shortcut to create all canvases for a single alignmentviewer component.
 * It creates two webgl contexts (main viewport and minimap) as well as a
 * two canvases (consensus and query sequences).
 * 
 * This should only be called ONCE per viewport. If it is called too many
 * times (followed by the "get" methods) then it will result in multiple 
 * webgl viewports - and browsers have a limited number (~8-16) after which
 * the browsers start to dispose of the contexts (yikes!).
 * 
 * @returns 
 */
const createViewerSet = () =>{
  return {
    primaryViewportApp: createMSABlockGenerator("webgl"),
    minimapApp: createMSABlockGenerator("webgl"),
    consensusApp: createMSABlockGenerator("canvas"),
    queryApp: createMSABlockGenerator("canvas"),
  }
}
let primaryViewer: undefined | ReturnType<typeof createViewerSet>;
let searchViewer: undefined | ReturnType<typeof createViewerSet>;
export function getCachedCanvasGenerators(whichViewer: "primary" | "search"){
  if(whichViewer === "primary"){
    if(!primaryViewer)  primaryViewer = createViewerSet();
    return primaryViewer;
  }
  if(!searchViewer)  searchViewer = createViewerSet();
  return searchViewer;
}

/**
 * Low level function to generate and subscribe to changes to alignment viewer 
 * block canvases. This can be used for standalone instances of the main viewer 
 * or minimap if desired. 
 * @param datatype 
 * @returns 
 */
export function createMSABlockGenerator<
  T extends ObservableDatatypeNames
>(datatype: T){

  const appsAndCavnases = {} as {
    webglApp1?: ReturnType<IPairedWebglObservable["getMSABlocksWebglApp"]>,
    webglApp2?: ReturnType<IPairedWebglObservable["getMinimapBlocksWebglApp"]>,
    canvasApp?: ReturnType<ICanvasStandaloneSharedObservable["getCanvasImageData"]>,
  }

  let cacheData = undefined as undefined | ITiledImages;
  let cachePropsKey = undefined as undefined | string;
  let jobBeingExecutedPropsKey = undefined as undefined | string;

  let worker = new WorkerFactory(generateCanvases);
  const sharedObservable = datatype === "synced-webgl" 
    ? new Observable({
        datatype: "synced-webgl",
        loaded: false,
        getMSABlocksWebglApp: ()=>{ //lazy load
          if(!appsAndCavnases.webglApp1){
            appsAndCavnases.webglApp1 = createWebGlContext();
            if(cacheData) dataUpdated(cacheData, true); //possibly already set by webglApp2
          }
          return appsAndCavnases.webglApp1;
        },
        getMinimapBlocksWebglApp: () => { //lazy load
          if(!appsAndCavnases.webglApp2){
            appsAndCavnases.webglApp2 = createWebGlContext();
            if(cacheData) dataUpdated(cacheData, true); //possibly already set by webglApp1
          }
          return appsAndCavnases.webglApp2;
        },
      } as ObservableDatatype<T>)

    : datatype === "webgl"
      ? new Observable({
          datatype: "webgl",
          loaded: false,
          getMSABlocksWebglApp: ()=>{ 
            if(!appsAndCavnases.webglApp1){
              appsAndCavnases.webglApp1 = createWebGlContext();
            }
            return appsAndCavnases.webglApp1;
          },
        } as ObservableDatatype<T>)

      : datatype === "canvas"
        ? new Observable({
            datatype: "canvas",
            loaded: false,
            getCanvasImageData: ()=>{ //lazy load - only to be consistant with webgl
              return appsAndCavnases.canvasApp;
            },
          } as ObservableDatatype<T>)
        : undefined;

  if(!sharedObservable) throw Error(
    `Invalid datatype "${datatype}" provided to createMSABlockGenerator`
  );
  
  /***************************************************
   *  
   * Munge data from webworker and informer observers
   *  - Munge for webgl: reset view (remove children) and
   *    add all tiles as sprites to the view.
   *  - Munge for canvas: Copy the single Image into a
   *    
   * 
   * @param data 
   * @param updatingFromCache 
   */
  const dataUpdated = (
    data: ITiledImages, 
    updatingFromCache: boolean
  ) => {
    cacheData = data;
    if(!updatingFromCache){
      cachePropsKey = jobBeingExecutedPropsKey;
      jobBeingExecutedPropsKey = undefined;
    }

    if(
      datatype === "webgl" || datatype === "synced-webgl"
    ){
      function updateWebgl(app?: PIXI.Application<HTMLCanvasElement>){
        if(app){
          app.stage.removeChildren();
          app.stage.position.set(0, 0);
          app.stage.scale.set(1, 1);

          for(var idx=0; idx < data.tiles.length; idx++){
            const tile = data.tiles[idx];
            const sprite = PIXI.Sprite.from(
              tile.image, { scaleMode: PIXI.SCALE_MODES.NEAREST }
            );
            sprite.interactiveChildren = false;
            sprite.x = tile.pixelX;
            sprite.y = tile.pixelY;
            sprite.scale = {x: 1, y: 1};
            sprite.roundPixels = false;
            sprite.cacheAsBitmap = true; //important
            app.stage.addChild(sprite);
          }
        }
      }

      updateWebgl(appsAndCavnases.webglApp1);
      updateWebgl(appsAndCavnases.webglApp2); //okay if standalone webgl - nothing happens if null
    }
    else{
      //deal with canvas
      appsAndCavnases.canvasApp = data;
    }
    sharedObservable.set({
      ...(sharedObservable.get() as ObservableDatatype<T>),
      loaded: true,
      cachePropsKey: cachePropsKey
    })
  }


  //handle web worker responses, placing the canvases into
  //the webgl context and trigger an observable event
  const dataUpdatedFromWebworker = (message: {data: ITiledImages}) => {
    dataUpdated(message.data, false);
  }

  /**
   * Kickoff a generate canvas web worker job. If the canvas is already
   * available it will return immediately with the resulting canvas message,
   * , otherwise 
   * @param props 
   * @returns 
   */
  const submitMSAUpdateRequest = (
    props: ICanvasAlignmentTiledProps,
    propsKey: string
  ) => {
    //was the canvas in cache generated with these props? (common)
    //inform callers to make sure everyone is up to date
    if(propsKey === cachePropsKey){
      dataUpdated(cacheData!, true); 
      return;
    }

    //is there already a canvas being generated with these props? (common)
    if(propsKey === jobBeingExecutedPropsKey) {
      return;
    }

    if(jobBeingExecutedPropsKey){
      //the canvas being generated has different props (uncommon I think)
      worker.terminate();
      worker = new WorkerFactory(generateCanvases);
      worker.onmessage = dataUpdatedFromWebworker;
    }
    jobBeingExecutedPropsKey = propsKey;
    worker.postMessage(props);
    return;
  }

  //listen for updated canvases
  worker.onmessage = dataUpdatedFromWebworker;

  //return a function to request new images as well as an observable 
  //to receive the updates whenever images are created.
  return {
    updateMSA: submitMSAUpdateRequest,
    updateObserver: sharedObservable
  };
}



/**
 * Main entry point that represents a full viewer consisting of 4 views:
 *   - primary msa (webgl)
 *   - minimap (webgl)
 *   - consensus (canvas element alone)
 *   - query (canvas element alone)
 * @returns 
 
export const createViewerStore = () => {
  const viewports = {
    msaBlocks: undefined as undefined | PIXI.Application<HTMLCanvasElement>,
    minimapBlocks: undefined as undefined | PIXI.Application<HTMLCanvasElement>
  }
  
  //the web worker code
  //goals: 
  //  (1) cache the canvas used by webgl (with the same params)
  //  (2) only run one job at a time
  //  (2) cancel any existing job if it isn't the same params and start new job
  let cacheData = undefined as undefined | ITiledImages;
  let cachePropsKey = undefined as undefined | string;
  let jobBeingExecutedPropsKey = undefined as undefined | string;

  let worker = new WorkerFactory(generateCanvases);
  const sharedObservable = new Observable({
    loaded: false as boolean,
    getMSABlocksWebglContext: ()=>{ 
      if(!viewports.msaBlocks) viewports.msaBlocks = createWebGlContext();
      return viewports.msaBlocks;
    },
    getMinimapBlocksWebglContext: () => { 
      if(!viewports.minimapBlocks) viewports.minimapBlocks = createWebGlContext();
      return viewports.minimapBlocks;
    },
  });

  //create sprites for each set of images and put into webgl contexts
  const msaBlocksUpdated = (
    data: ITiledImages, updatingFromCache: boolean
  ) => {
    cacheData = data;
    if(!updatingFromCache){
      cachePropsKey = jobBeingExecutedPropsKey;
      jobBeingExecutedPropsKey = undefined;
    }

    const drawIntoWebgl = (
      data: ITiledImages,
      webglContext?: PIXI.Application<HTMLCanvasElement>
    ) => {
      if(webglContext){
        webglContext.stage.removeChildren();
        webglContext.stage.position.set(0, 0);
        webglContext.stage.scale.set(1, 1);

        data.tiles.map((tile)=>{
          const sprite = PIXI.Sprite.from(
            tile.image, { scaleMode: PIXI.SCALE_MODES.NEAREST }
          );
          sprite.interactiveChildren = false;
          sprite.x = tile.pixelX;
          sprite.y = tile.pixelY;
          sprite.scale = {x: 1, y: 1};
          webglContext.stage.addChild(sprite);
        });
      }
    }
    drawIntoWebgl(cacheData, viewports.msaBlocks);
    drawIntoWebgl(cacheData, viewports.minimapBlocks);

    //inform everyone
    sharedObservable.set({
      loaded: true,
      msaCanvas: viewports.msaBlocks,
      minimapCanvas: viewports.minimapBlocks,
    })
  }


  //handle web worker responses, placing the canvases into
  //the webgl context and trigger an observable event
  const msaBlocksUpdatedFromWebworker = (message: {data: ITiledImages}) => {
    msaBlocksUpdated(message.data, false);
  }

   //Kickoff a generate canvas web worker job. If the canvas is already
   //available it will return immediately with the resulting canvas message,
   //, otherwise 
   //@param props 
   //@returns 
   
  const submitMSAUpdateRequest = (
    props: ICanvasAlignmentTiledProps,
    propsKey: string
  ) => {
    //was the canvas in cache generated with these props? (common)
    //inform callers to make sure everyone is up to date
    if(propsKey === cachePropsKey){
      msaBlocksUpdated(cacheData!, true); 
      return;
    }

    //is there already a canvas being generated with these props? (common)
    if(propsKey === jobBeingExecutedPropsKey) {
      return;
    }

    if(jobBeingExecutedPropsKey){
      //the canvas being generated has different props (uncommon I think)
      worker.terminate();
      worker = new WorkerFactory(generateCanvases);
      worker.onmessage = msaBlocksUpdatedFromWebworker;
    }
    jobBeingExecutedPropsKey = propsKey;
    worker.postMessage(props);
    return;
  }

  //listen for updated canvases
  worker.onmessage = msaBlocksUpdatedFromWebworker;

  //return an observable 
  return {
    updateMSA: submitMSAUpdateRequest,
    updateObserver: sharedObservable
  }
};*/

