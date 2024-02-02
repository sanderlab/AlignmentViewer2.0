import React, { useEffect, useMemo, useState } from "react";

import {
  AminoacidColorSchemeInstance,
  NucleotideColorSchemeInstance,
  ResidueColoring,
  PositionsToStyleInstance,
  ResidueColoringInstance,
  AminoAcidAlignmentTypeInstance,
  NucleotideAlignmentTypeInstance,
  AminoAcidColorSchemes,
  NucleotideColorSchemes,
  AlignmentTypes,
} from "../../common/MolecularStyles";
import { Alignment } from "../../common/Alignment";
import { ICanvasAlignmentTiledProps } from "../../webworkers/MSAGenerationWorker";
import { ISearchMatchDetails } from "./../search/SequenceSearchHook";
import { MSABlocksAndLettersProps } from "./MSABlocksAndLetters"
import { 
  IExposedStandaloneWebglFunctions, 
  IExposedPairedWebglFunctions,
  IExposedCanvasFunctions
} from "./MSABlockGenerator";

export interface MSABlocksProps {
  //which sequence(s) will be displayed?
  canvasGenerator: IExposedStandaloneWebglFunctions |
                   IExposedPairedWebglFunctions |
                   IExposedCanvasFunctions; //acquire from MSABlockGenerator.ts
  sequenceSet: MSABlocksAndLettersProps["sequenceSet"];
  isMinimap?: boolean; //hack that makes this hook use minimap webgl canvas.
  showLoadingIndicator?: boolean;

  sequences: string[];
  consensusSequence: string;
  querySequence: string;
  allCharsInAlignment: string[];

  //needed to force reinitialization
  sortByKey: string;

  //visualization options
  alignmentType: AminoAcidAlignmentTypeInstance | NucleotideAlignmentTypeInstance;
  aaColorScheme?: AminoacidColorSchemeInstance;
  ntColorScheme?: NucleotideColorSchemeInstance;
  positionsToStyle: PositionsToStyleInstance;
  highlightPositionalMatches?: ISearchMatchDetails;
  residueColoring: ResidueColoringInstance;

  //passed through from virtualized matrix or minimap
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  positionX: number;
  positionY: number;
}

export const MSABlocks = (props: MSABlocksProps) => {
  const {
    canvasGenerator,
    sequenceSet,
    isMinimap = false,
    showLoadingIndicator = false,

    sequences,
    consensusSequence,
    querySequence,
    allCharsInAlignment,

    sortByKey,

    alignmentType,
    positionsToStyle,
    highlightPositionalMatches,
    aaColorScheme = AminoAcidColorSchemes.list[0],
    ntColorScheme = NucleotideColorSchemes.list[0],
    residueColoring,

    width,
    height,
    scaleX,
    scaleY,
    positionX,
    positionY,
  } = props;


  const residueColoringToDraw = residueColoring;///ResidueColoring.DARK; //maybe not for search? red highlight is washed out.

  const [loading, setLoading] = useState<boolean>(true);

  const [canvasHolderRef, setCanvasHolderRef] = useState<HTMLDivElement>();
  const handleCanvasHolderRef = (ref: HTMLDivElement) => {
    setCanvasHolderRef(ref);
  }

  //only for the non-webgl canvas
  const [canvasRef, setCanvasRef] = useState<HTMLCanvasElement>();
  const handleCanvasRef = (ref: HTMLCanvasElement) => {
    setCanvasRef(ref);
  }

  //create a unique key to decide whether to reload 1:1 image
  const canvasUniqueKey = useMemo(()=>{
    return [
      //uuid for alignemnt??
      sequences.length,
      sequences.length > 0 ? sequences[0].length : 0,

      //may add change query in the future.
      querySequence,
      //may add remove or append funcitonality in the future. 
      consensusSequence,
  
      alignmentType.key,
      positionsToStyle.key,
      residueColoringToDraw.key,
      alignmentType === AlignmentTypes.AMINOACID 
        ? aaColorScheme.commonName 
        : ntColorScheme.commonName,
      sortByKey,
      
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
    alignmentType,
    consensusSequence,
    highlightPositionalMatches?.searchString,
    highlightPositionalMatches?.highlightColor.red,
    highlightPositionalMatches?.highlightColor.green,
    highlightPositionalMatches?.highlightColor.blue,
    positionsToStyle.key,
    querySequence,
    residueColoringToDraw.key,
    sortByKey,
    sequences,
    aaColorScheme.commonName,
    ntColorScheme.commonName
  ]);

  //
  // global state using the observable pattern. this is done because, e.g.,
  //    (1) we need to limit tne number of webgl contexts avaialble
  //    (2) we want to react to take advantage of alignment and other changes
  //        provided by react hooks
  //    (2) redux can't hold a webgl context
  //
  const [
    webglOrCanvas, setWebglOrCanvas
  ] = useState(canvasGenerator.updateObserver.get());

  useEffect(() => {
    return canvasGenerator.updateObserver.subscribe(setWebglOrCanvas);
  }, [canvasGenerator]);

  const webglApp = webglOrCanvas.datatype==="synced-webgl" && isMinimap
    ? webglOrCanvas.getMinimapBlocksWebglApp()
    : webglOrCanvas.datatype==="webgl" || webglOrCanvas.datatype==="synced-webgl"
      ? webglOrCanvas.getMSABlocksWebglApp()
      : undefined;
      
  const canvasImages = webglOrCanvas.datatype==="canvas"
    ? webglOrCanvas.getCanvasImageData()
    : undefined;
  
  //on initial full load add canvas to the view
  useEffect(()=>{
    if(webglOrCanvas.loaded && canvasHolderRef){ //should only happen once I think
      if(webglApp){
        canvasHolderRef.appendChild(webglApp.view);
        webglApp.resizeTo = canvasHolderRef;
      }
      //canvas initialization occurrs in the dom
    }
  }, [
    webglApp,
    webglOrCanvas.loaded, 
    canvasHolderRef
  ]);


  //
  //memoized functions
  //

  //all sequences that will appear in the canvas

  //colors for the current alignment
  const positionalLetterColors = useMemo(()=>{
    const toreturn = Alignment.getPositionalLetterColors({
      allPossibleChars: allCharsInAlignment,
      sequences: sequences,
      querySequence: querySequence,
      consensusSequence: consensusSequence,
      alignmentType: alignmentType,
      positionsToStyle: positionsToStyle,
      residueColoring: residueColoringToDraw,
      aaColorScheme: aaColorScheme,
      ntColorScheme: ntColorScheme
    });
    return toreturn;
  }, [
    allCharsInAlignment,
    alignmentType,
    consensusSequence,
    aaColorScheme,
    ntColorScheme,
    positionsToStyle,
    querySequence,
    residueColoringToDraw,
    sequences,
  ]);

  //
  // web workers
  //
  useEffect(()=>{
    const messageProps: ICanvasAlignmentTiledProps = {
      //add an extra position and sequence for rounding errors
      extraPosSeqCount: 1, //webglOrCanvas.datatype === "canvas" ? 1 : 1,
      tileSize: webglOrCanvas.datatype === "canvas"
        ? 1000000 //only load one image for canvas - could tile later, but I think it does work.
        : 1024,
      positionalLetterColors: positionalLetterColors,
      sequences: sequences,
      highlightPositionalMatches: highlightPositionalMatches
    };
    setLoading(true);
    if(webglApp){ //canvas gets hidden when loading is true
      webglApp.stage.removeChildren();
      webglApp.render();
    }
    canvasGenerator.updateMSA(
      messageProps,
      canvasUniqueKey
    );
  }, [
    canvasGenerator,
    canvasGenerator.updateMSA,
    canvasRef,
    canvasHolderRef,
    canvasUniqueKey,
    highlightPositionalMatches,
    positionalLetterColors,
    sequenceSet,
    sequences,
    webglApp,
    webglOrCanvas.datatype,
  ]);

  //data changed / loaded
  useEffect(()=>{
    if(
      webglApp &&
      webglOrCanvas.loaded && 
      canvasHolderRef
    ){
      webglApp.resizeTo = canvasHolderRef;
      webglApp.stage.scale.set(scaleX, scaleY);
      webglApp.stage.position.set(positionX, positionY);
      webglApp.render();
      if(webglOrCanvas.cachePropsKey === canvasUniqueKey){
        //otherwise once any initial alignment has loaded this effect
        //is called frequently, overriding the loading indicator
        //.. that said, i think this might be fragile :-(
        setLoading(false);
      }
    }
    else if(
      canvasImages &&
      webglOrCanvas.loaded && 
      canvasHolderRef &&
      canvasRef
    ){
      //only 1 tile for the canvas
      const image = canvasImages.tiles[0].image;
      //need to use holder as the canvas is hidden on first render so has no boudns
      const bb = canvasHolderRef.getBoundingClientRect(); 
      const context = canvasRef.getContext("2d");
      if(context){
        //position is in pixels, so need to compute offset
        context.imageSmoothingEnabled = false;
        context.clearRect(
          0, 0, bb.width, bb.height
        );
        //index into the 1:1 returned canvas (params 2,3,4,5, i.e., source position)
        //and then draw into the fixed canvas. 
        //full size = (image.width * scaleX)  x (image.height * scaleY)
        //positioning is done off the full size. 
        context.drawImage(
          image,

          //source position and width/height
          -positionX/scaleX, -positionY/scaleY, bb.width/scaleX, bb.height/scaleY,

          //target position and width/height - if we do this, it rasterizes
          0, 0, bb.width, bb.height
        )

        //ALTERNATE_A option - draw the entire canvas and just shift with css (see the jsx below)
        //this is simplier, but there are canvas size limits that come into play
        //COULD TRY: tile the images visibly to get around canvas limits
        //context.clearRect(
        //  0, 0, bb.width, bb.height
        //);
        //context.imageSmoothingEnabled = false;
        //context.drawImage(
        //  image,
        //  //source position and width/height
        //  0, 0, image.width, image.height,
        //  //target position and width/height - if we do this, it rasterizes
        //  0, 0, image.width * scaleX, image.height * scaleY
        //);
      }
      if(webglOrCanvas.cachePropsKey === canvasUniqueKey){
        //otherwise once any initial alignment has loaded this effect
        //is called frequently, overriding the loading indicator
        //.. that said, i think this is fragile :-(
        setLoading(false);
      }
    }
  }, [
    canvasImages,
    canvasGenerator,
    canvasHolderRef,
    canvasRef,
    canvasUniqueKey,
    positionX, 
    positionY,
    scaleX,
    scaleY,
    webglApp,

    width,     //needed just to trigger rerender - otherwise unused
    height,    //needed just to trigger rerender - otherwise unused

    //DO NOT CHANGE TO PROP OR THIS WONT RUN ON ALL UPDATES 
    //AS THE WEBGL APP DOESNT CHANGE
    webglOrCanvas, 
  ]);


  //
  // primary action function exposed to caller
  //
  /*const drawIntoCanvas = useCallback((props: {
    sequenceSet: "query" | "consensus" | "alignment";
    width: number;
    height: number;
    scaleX?: number;
    scaleY?: number;
    positionX?: number;
    positionY?: number;
  })=>{
    const {
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

    if(loaded && canvasRef.current){ 
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
  
        canvasRef.current.setAttribute("width", ''+width);
        canvasRef.current.setAttribute("height", ''+height);
  
        //FINE ON MOST BROWSERS, BUT DOES HELP SAFARI, but not much
        const imageData = new ImageData(width, height, {});
        const mydata = webGlContext.renderer.extract.pixels();
        for(var i = 0; i < mydata.length; i++){
          imageData.data[i] = mydata[i];
        }
        canvasRef.current.getContext("2d")?.putImageData(
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
        const contextCanvasContext = canvasRef.current.getContext("2d");
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
          canvasRef.current.setAttribute("width", ''+width);
          canvasRef.current.setAttribute("height", ''+height);
          contextCanvasContext.clearRect(0, 0, width, height);
          contextCanvasContext.drawImage(
            image,
            //source position and width/height
            sX, sY, sWidth, sHeight,
            //target position and width/height
            0, 0, tWidth, tHeight
          );
        }
      }
      
    }
  }, [
    canvasData
  ]);*/


  //
  // setup and return
  //
  const classNames = ["av2-blocks", "canvas-holder"];
  if(residueColoring === ResidueColoring.NO_BACKGROUND) classNames.push("hidden");
  if(residueColoring === ResidueColoring.LIGHT) classNames.push("light");
  classNames.push(residueColoring.key);
  
  return (
    <div 
      className={classNames.join(" ")}
      ref={handleCanvasHolderRef} 
      //style={{
      //  opacity: residueColoring === ResidueColoring.LIGHT 
      //    ? colorScheme.backgroundAlpha
      //    : 1
      //}}
    >
      {
        !showLoadingIndicator || !loading ? undefined :
        <div className="loader-holder">
          <div className="loader"/>
        </div>
      }
      {!canvasImages ? undefined : (
        <canvas 
          ref={handleCanvasRef}
          //width={canvasImages.tiles[0].image.width * scaleX}
          //height={canvasImages.tiles[0].image.height * scaleY}
          width={canvasHolderRef?.getBoundingClientRect().width}
          height={canvasHolderRef?.getBoundingClientRect().height}
          style={{
            display: loading ? "none" : "block",
            position: "absolute",

            //ALTERNATE_A option: if the entire canvas is drawn and we are just 
            //shifting - see the "ALTERNATE_A" above.
            //left: `${positionX}px`,
            //top: `${positionY}px`,
            //width: `${canvasImages.tiles[0].image.width * scaleX}px`,
            //height: `${canvasImages.tiles[0].image.height * scaleY}px`,
          }}
        />
      )}
    </div>
  );
}