import { useCallback, useEffect, useMemo, useState } from "react";
import * as PIXI from "pixi.js";

import {
  PositionsToStyle,
  AlignmentTypes,
  IColorScheme,
  ResidueColoring,
} from "../common/MolecularStyles";
import { Alignment } from "../common/Alignment";
import { ISearchMatchDetails } from "./search/SequenceSearchHook";
import { ICanvasAlignmentTiledProps, generateCanvases } from "../webworkers/CanvasAlignmentWorker";
import { WorkerFactory } from "../webworkers/WebWorkerFactory";
import { Observable } from "../common/Observable";
import { SequenceSorter } from "../common/AlignmentSorter";
import { AlignmentViewerType } from "./AlignmentViewerHook";

interface ITiledImages {
  targetTileWidth: number;
  targetTileHeight: number;
  lastTileWidth: number;
  lastTileHeight: number;
  numXTiles: number;
  numYTiles: number;
  tiles: {
    tileX: number;
    tileY: number;
    pixelX: number;
    pixelY: number;
    width: number;
    height: number;
    image: ImageBitmap;
  }[];
}

export interface IAlignmentCanvasHook {
  viewerType: AlignmentViewerType,
  alignment: Alignment;
  sortBy: SequenceSorter;
  alignmentType: AlignmentTypes;
  positionsToStyle: PositionsToStyle;
  highlightPositionalMatches?: ISearchMatchDetails;
  colorScheme: IColorScheme;
  loadingStateChanged?: (loading: boolean) => void;
}

const createWebglViewerStore = (storeName: string) => {

  //
  //Create a webgl canvas
  //
  const createWebGlContext = () => {
    const app = new PIXI.Application<HTMLCanvasElement>({
      antialias: false,
      resolution: window.devicePixelRatio,
      autoDensity: true,
      backgroundAlpha: 0,
      view: document.createElement("canvas")
    });
    app.ticker.autoStart = false;
    app.ticker['stop']();
    return app;
  }
  const mainviewportWebglContext = createWebGlContext();
  const minimapWebglContext = createWebGlContext();

  //the web worker code
  //goals: 
  //  (1) cache the canvas used by webgl (with the same params)
  //  (2) only run one job at a time
  //  (2) cancel any existing job if it isn't the same params and start new job
  let cache = undefined as undefined | ITiledImages;
  let cachePropsKey = undefined as undefined | string;
  let jobBeingExecutedPropsKey = undefined as undefined | string;

  let worker = new WorkerFactory(generateCanvases);
  const sharedObservable = new Observable({
    loaded: false as boolean,
    mainviewportWebglContext: mainviewportWebglContext,
    minimapWebglContext: minimapWebglContext,
  });

  const canvasUpdated = (data: ITiledImages, updatingFromCache: boolean) => {
    //console.log('canvas updated (fromCache? '+updatingFromCache+')', data);
    cache = data;
    if(!updatingFromCache){
      cachePropsKey = jobBeingExecutedPropsKey;
      jobBeingExecutedPropsKey = undefined;
    }
    //console.log(`${storeName}: canvasUpdated:`);

    const sprites = data.tiles.map((tile)=>{
      const mainviewportSprite = PIXI.Sprite.from(tile.image, { scaleMode: PIXI.SCALE_MODES.NEAREST });
      mainviewportSprite.interactiveChildren = false;
      mainviewportSprite.x = tile.pixelX;
      mainviewportSprite.y = tile.pixelY;
      mainviewportSprite.scale = {x: 1, y: 1};
      //mainviewportSprite.cacheAsBitmap = true;
      //mainviewportSprite.roundPixels = true;

      //How to copy a sprite..
      const minimapSprite = new PIXI.Sprite(mainviewportSprite.texture.clone())
      minimapSprite.x = tile.pixelX;
      minimapSprite.interactiveChildren = false;
      minimapSprite.y = tile.pixelY;
      minimapSprite.scale = {x: 1, y: 1};
      //minimapSprite.cacheAsBitmap = true;
      //minimapSprite.roundPixels = true;

      return [mainviewportSprite, minimapSprite]
    });

    mainviewportWebglContext.stage.removeChildren();
    mainviewportWebglContext.stage.position.set(0, 0);
    mainviewportWebglContext.stage.scale.set(1, 1);
    minimapWebglContext.stage.removeChildren();
    minimapWebglContext.stage.position.set(0, 0);
    minimapWebglContext.stage.scale.set(1, 1);

    sprites.forEach((s)=>{
      mainviewportWebglContext.stage.addChild(s[0]);
      minimapWebglContext.stage.addChild(s[1]);
    });

    //inform everyone
    sharedObservable.set({
      loaded: true,
      mainviewportWebglContext: mainviewportWebglContext,
      minimapWebglContext: minimapWebglContext,
    })
  };


  //handle web worker responses, placing the canvases into
  //the webgl context and trigger an observable event
  const canvasUpdatedFromWebworker = (message: {data: ITiledImages}) => {
    canvasUpdated(message.data, false);
  }

  /**
   * Kickoff a generate canvas web worker job. If the canvas is already
   * available it will return immediately with the resulting canvas message,
   * , otherwise 
   * @param props 
   * @returns 
   */
  const updateCanvasFn = (
    props: ICanvasAlignmentTiledProps,
    propsKey: string
  ) => {
    //console.log(
    //  `${storeName}: updateCanvasFn called. cachePropsKey:${cachePropsKey}, cache is undef:${cache===undefined}`
    //);

    //was the canvas in cache generated with these props? (common)
    //inform callers to make sure everyone is up to date
    if(propsKey === cachePropsKey){
      //console.log(`${storeName}: 1 IS cached`);

      canvasUpdated(cache!, true); 
      return;
    }
    //console.log(`${storeName}: 2 NOT cached`);

    //is there already a canvas being generated with these props? (common)
    if(propsKey === jobBeingExecutedPropsKey) {
      //console.log(`${storeName}: 3. IS already being generated`);
      return;
    }
    //console.log(`${storeName}: 4. NOT already being generated`);

    if(jobBeingExecutedPropsKey){
      //the canvas being generated has different props (uncommon I think)
      //console.log('4. another canvas with different props being generated! killing it');
      worker.terminate();
      worker = new WorkerFactory(generateCanvases);
      worker.onmessage = canvasUpdatedFromWebworker;
    }
    //console.log(`${storeName}: 5.  kicking off new canvas generation request`);
    //console.log(`${storeName}: 5.  new props:', ${propsKey}`);
    //console.log(`${storeName}: 5.  cached props:', ${cachePropsKey}`);
    //console.log(`${storeName}: 5.  jobBeingExecutedPropsKey props:', ${jobBeingExecutedPropsKey}`);

    jobBeingExecutedPropsKey = propsKey;
    worker.postMessage(props);
    return;
  }

  //listen for updated canvases
  worker.onmessage = canvasUpdatedFromWebworker;

  //return an observable 
  return {
    updateCanvasFn: updateCanvasFn,
    sharedObservable: sharedObservable
  }
};


const createViewerStore = (storeName: string) => {

  //
  //Create a non-webgl canvas
  //

  //the web worker code
  //goals: 
  //  (1) cache the canvas used by webgl (with the same params)
  //  (2) only run one job at a time
  //  (2) cancel any existing job if it isn't the same params and start new job
  let cache = undefined as undefined | ITiledImages;
  let cachePropsKey = undefined as undefined | string;
  let jobBeingExecutedPropsKey = undefined as undefined | string;

  let worker = new WorkerFactory(generateCanvases);
  const sharedObservable = new Observable({
    loaded: false as boolean,
    tiledImages: undefined as undefined | ITiledImages
  });

  const canvasUpdated = (data: ITiledImages, updatingFromCache: boolean) => {
    cache = data;
    if(!updatingFromCache){
      cachePropsKey = jobBeingExecutedPropsKey;
      jobBeingExecutedPropsKey = undefined;
    }
    //console.log(`${storeName}: canvasUpdated:`);
    //inform everyone
    sharedObservable.set({
      loaded: true,
      tiledImages: data
    })
  };


  //handle web worker responses, placing the canvases into
  //the webgl context and trigger an observable event
  const canvasUpdatedFromWebworker = (message: {data: ITiledImages}) => {
    canvasUpdated(message.data, false);
  }

  /**
   * Kickoff a generate canvas web worker job. If the canvas is already
   * available it will return immediately with the resulting canvas message,
   * , otherwise 
   * @param props 
   * @returns 
   */
  const updateCanvasFn = (
    props: ICanvasAlignmentTiledProps,
    propsKey: string
  ) => {
    //console.log(
    //  `${storeName}: updateCanvasFn called. cachePropsKey:${cachePropsKey}, cache is undef:${cache===undefined}`
    //);

    //was the canvas in cache generated with these props? (common)
    //inform callers to make sure everyone is up to date
    if(propsKey === cachePropsKey){
      canvasUpdated(cache!, true); 
      return;
    }

    //is there already a canvas being generated with these props? (common)
    if(propsKey === jobBeingExecutedPropsKey) {
      return;
    }

    if(jobBeingExecutedPropsKey){
      //the canvas being generated has different props (uncommon I think)
      //console.log('4. another canvas with different props being generated! killing it');
      worker.terminate();
      worker = new WorkerFactory(generateCanvases);
      worker.onmessage = canvasUpdatedFromWebworker;
    }
    jobBeingExecutedPropsKey = propsKey;
    worker.postMessage(props);
    return;
  }

  //listen for updated canvases
  worker.onmessage = canvasUpdatedFromWebworker;

  //return an observable 
  return {
    updateCanvasFn: updateCanvasFn,
    sharedObservable: sharedObservable
  }
}

// create exactly two stores for each viewer
//const primaryViewerStore = createViewerStore("primary");
//const searchViewerStore = createViewerStore("search");

/*************************************************
 * ***********************************************
 * ***********************************************
 * ***********************************************
 * ***********************************************
 * ***********************************************
 *                  THOUGHTS
 * ***********************************************
 * ***********************************************
 * ***********************************************
 * ***********************************************
 * ***********************************************
 * ***********************************************
 * 
 * 8 viewports:
 *  (1-4 primary) viewport, minimap, query, consensus
 *  (4-8 search) viewport, minimap, query, consensus
 * 
 * We want to use as few webgl contexts as possible - browsers
 * kill them if too many are used, and I think most have a
 * cutoff of 8 or 16 contexts.
 * 
 * Some options:
 *  (1) Control all 8 viewports with webgl / pixijs 
 *      Pro: fast. should work well with all browsers. 
 *      Cons: large memory footprint? (2x the full canvas image)
 *  (2) 2 hidden pixi webgl contexts - move stage and draw image
 *      into visible canvases.
 *      Pros: Pretty fast. only 2 webgl contexts!
 *      Cons: safari slows to a DEAD halt with drawImage from the pixi view
 *  (3) Draw hidden canvas images directly into visible canvases,
 *      they are already BitmapImages.
 *      Pro: ZERO webgl contexts! Safari plays well with drawImage doing
 *           this - no idea why. low memory footprint
 *      Cons: very fast with chrome (good with firefox?). safari slower
 *            than even with ace. complicated if we want to generate multiple
 *            tiles in the web worker.
 *  (4) Webgl for main viewports and minimaps (4 webgl contexts total) and
 *      draw image into query/consensus once and just move x position
 *      Pro: probably as fast as it can get.
 *      Cons: complex codebase to handle multiple rendering cases. 
 *  (5) try out the putImageData code like https://stackoverflow.com/questions/76560551
 * 
 * 
 * Sniff for safari and/or firefox. Use webgl for those browsers
 * Use no webgl with chrome?
 * Or just 4 webgl canvases (main viewport and minimap for primary / search)
 * 
 * speed decrease is incredible with the draw image with safari. 
 * 
 * 
 * 
 */
const drawingType = "canvas" as "canvas" | "webgl";
const [
  primaryViewerStore, searchViewerStore
] = drawingType === "canvas"
  ? [createViewerStore("primary"), createViewerStore("search")]
  : [createWebglViewerStore("primary"), createWebglViewerStore("search")]

//
//Canvas generation, drawing, caching. The cache contains the the webgl context
//with the as tiled sprites that is loaded from a webworker. The fullCanvasCache
//contains a canvas of height (alignment.length + 2) like:
//    row 1       : consensus sequence
//    row 2       : query sequence
//    row 3 to end: the alignment
//
export const useAlignmentCanvas = (props: IAlignmentCanvasHook) => {

  const {
    viewerType, 
    alignment,
    sortBy,
    alignmentType,
    positionsToStyle,
    highlightPositionalMatches,
    colorScheme,
    loadingStateChanged
  } = props;

  const residueColoring = ResidueColoring.DARK;
  const canvasUniqueKey = useMemo(()=>{
    return [
      alignment.getUUID(),
  
      //may add change query in the future.
      alignment.getQuery().sequence,
      //may add remove or append funcitonality in the future. 
      alignment.getConsensus().sequence,
  
      alignmentType.key,
      positionsToStyle.key,
      residueColoring.key,
      sortBy.key,
      colorScheme.commonName,
      
      !highlightPositionalMatches?.searchString
        ? ""
        : [
          highlightPositionalMatches.searchString,
          highlightPositionalMatches.highlightColor.red,
          highlightPositionalMatches.highlightColor.green,
          highlightPositionalMatches.highlightColor.blue
        ].join("")
    ].join("");

  }, [
    alignment,
    alignmentType.key,
    highlightPositionalMatches?.searchString,
    highlightPositionalMatches?.highlightColor.red,
    highlightPositionalMatches?.highlightColor.green,
    highlightPositionalMatches?.highlightColor.blue,
    positionsToStyle.key,
    residueColoring.key,
    sortBy.key,
    colorScheme.commonName,
  ]);


  //
  // global state using the observable pattern. this is done because, e.g.,
  //    (1) we need to limit tne number of webgl contexts avaialble
  //    (2) we want to react to take advantage of alignment and other changes
  //        provided by react hooks
  //    (2) redux can't hold a webgl context
  //
  const {
    updateCanvasFn, 
    sharedObservable: store
  } = viewerType === AlignmentViewerType.PrimaryViewer 
    ? primaryViewerStore 
    : searchViewerStore;
  
  const [canvasData, setCanvasData] = useState(store.get());
  useEffect(() => {
    return store.subscribe(setCanvasData);
  }, [store]);

  //
  //memoized functions
  //

  //all sequences that will appear in the canvas
  const allSequences = useMemo(()=>{
    return [
      alignment.getConsensus().sequence,
      alignment.getQuery().sequence,
      ...alignment.getSequences(sortBy).map(s=>s.sequence)
    ];
  }, [
    alignment,
    sortBy
  ]);

  //colors for the current alignment
  const positionalLetterColors = useMemo(()=>{
    const toreturn = Alignment.getPositionalLetterColors(
      alignment.getAllRepresentedCharacters(),
      allSequences,
      alignment.getQuery().sequence,
      alignment.getConsensus().sequence,
      alignmentType,
      positionsToStyle,
      residueColoring,
      colorScheme
    );
    return toreturn;
  }, [
    allSequences,
    alignment,
    alignmentType,
    positionsToStyle,
    residueColoring,
    colorScheme
  ]);

  //
  // web workers
  //
  useEffect(()=>{
    if(loadingStateChanged) loadingStateChanged(!canvasData.loaded);
  }, [
    loadingStateChanged, 
    canvasData.loaded
  ]);

  useEffect(()=>{
    const messageProps: ICanvasAlignmentTiledProps = {
      extraPosSeqCount: 1,
      tileSize:  drawingType === "canvas" ? 1000000 : 2048, // should be huge (like 1,000,000) if no webgl
      positionalLetterColors: positionalLetterColors,
      sequences: allSequences,
      highlightPositionalMatches: highlightPositionalMatches
    };
    updateCanvasFn(
      messageProps,
      canvasUniqueKey
    );
  }, [
    allSequences,
    canvasUniqueKey,
    highlightPositionalMatches,
    positionalLetterColors,
    store,
    updateCanvasFn,
    viewerType,
  ]);


  //
  // primary action function exposed to caller
  //
  const drawIntoCanvas = useCallback((props: {
    visibleCanvas: HTMLCanvasElement,
    sequenceSet: "query" | "consensus" | "alignment";
    width: number;
    height: number;
    scaleX?: number;
    scaleY?: number;
    positionX?: number;
    positionY?: number;
  })=>{
    const {
      visibleCanvas,
      sequenceSet,
      width,
      height,
      scaleX = 1,
      scaleY = 1,
      positionX = 0,
      positionY = 0
    } = props;

    const {
      loaded
    } = canvasData;

    if(loaded){ 
      //
      // option 1: use webgl - there are some serious performance issues wth safari,
      //           particularly at drawImage. I think maybe the view from pixi is
      //           parsed completely or something rather than just containing the
      //           pieces taht need to be rendered.
      //  leaving this code for an option in the future if safari(?) fixes the issue.
      //
      if ("mainviewportWebglContext" in canvasData){
        console.log('webgl draw');
        const webGlContext = canvasData.mainviewportWebglContext;

        //scale to devicePixelRatio
        const acutalScaleX =  scaleX / webGlContext.renderer.resolution;
        const acutalScaleY =  scaleY / webGlContext.renderer.resolution;
        webGlContext.stage.scale.set(acutalScaleX, acutalScaleY);
  
        //canvas has (1) consensus (2) query (3) the rest of the alignment 
        const additionalYOffset = sequenceSet === "alignment"
          ? acutalScaleY * 2
          : sequenceSet === "query"
            ? acutalScaleY
            : 0;
        
        webGlContext.stage.position.set(
          positionX / webGlContext.renderer.resolution, 
          (
            positionY / webGlContext.renderer.resolution
          ) 
          - additionalYOffset
        );
        webGlContext.view.width = width;
        webGlContext.view.height = height;
        webGlContext.render();
  
        visibleCanvas.setAttribute("width", ''+width);
        visibleCanvas.setAttribute("height", ''+height);
  
        //FINE ON MOST BROWSERS, BUT DOES HELP SAFARI, but not much
        const imageData = new ImageData(width, height, {});
        const mydata = webGlContext.renderer.extract.pixels();
        for(var i = 0; i < mydata.length; i++){
          imageData.data[i] = mydata[i];
        }
        visibleCanvas.getContext("2d")?.putImageData(
          imageData, 0, 0
        )
  
        //really slow on safari. basically freezes the browser. doesn't work with safari
        //visibleCanvas.getContext("2d")?.clearRect(0, 0, width, height);
        //visibleCanvas.getContext("2d")?.drawImage(
        //  webGlContext.view, 
        //  0, 0, width, height,
        //  0, 0, width, height,
        //);  
      }
      
      //
      // option 2: No webgl - Seems pretty performant across browsers. Drawback
      //           is that it is pretty complicated if we need to use multiple
      //           tiles. We could just balk if the size of the alignment is
      //           too big?
      //
      else if("tiledImages" in canvasData){
        console.log('canvas draw');
        const contextCanvasContext = visibleCanvas.getContext("2d");
        const image = canvasData.tiledImages?.tiles[0].image;
        
        if(image && contextCanvasContext){
          //don't use webgl. overhead too high!
          const additionalYOffset = sequenceSet === "alignment"
            ? scaleY * 2
            : sequenceSet === "query"
              ? scaleY
              : 0;
          contextCanvasContext.imageSmoothingEnabled = false;
          
          //safari is unable to handle out of bounds, so the actual source 
          //image is one pixel larger on both x and y (pos and seq)
          let sX = -positionX/scaleX;
          let sY = -(positionY - additionalYOffset)/scaleY;
          let sWidth = width/scaleX;
          let sHeight = height/scaleY;
          let tHeight = height;
          let tWidth = width;
          if(image.width < sX + sWidth) {
            const updatedScale = sWidth / (image.width - sX);
            sWidth = image.width - sX;
            tWidth = tWidth / updatedScale;
          };
          if(image.height < sY + sHeight) {
            const updatedScale = sHeight / (image.height - sY);
            sHeight = image.height - sY; // target height should be adjusted proportionally though
            tHeight = tHeight / updatedScale;
          };
          //console.log("canvasData:", canvasData);
          //console.log("image:", image);
          //console.log(`params: ${sX}:${sY} / ${sWidth}:${sHeight}  --- ${width}:${height}`);

          visibleCanvas.setAttribute("width", ''+width);
          visibleCanvas.setAttribute("height", ''+height);
          contextCanvasContext.clearRect(0, 0, width, height);
          contextCanvasContext.drawImage(
            image,
            
            //source position and width/height
            sX, sY, sWidth, sHeight,
            
            //target position and width/height
            0, 0, tWidth, tHeight
          );
        }
        console.log('WIDTH 2: '+(width));
      }
      
    }
  }, [
    canvasData
  ]);

  const action = useMemo(()=>{
    if(!canvasData.loaded){
      return undefined;
    }
    return {
      drawIntoCanvas: drawIntoCanvas
    };
  }, [
    drawIntoCanvas,
    canvasData.loaded
  ]);

  //
  // return useful functions for to the caller
  //
  return action;
}