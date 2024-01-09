/**
 * This class will handle all webgl context instances to make sure we do not
 * exceed the maximum.
 */

import { Application } from "pixi.js";


export enum WebGlContexts {
  PrimaryQuerySeq,
  PrimaryConsensusSeq,
  PrimaryViewport,
  PrimaryMinimap,

  SearchQuerySeq,
  SearchConsensusSeq,
  SearchViewport,
  SearchMinimap
}

const createWebGlContext = (props: {
  inlineStyles?: React.CSSProperties;
}) => {
  const {
    inlineStyles,
  } = props;
  
  const app = new Application<HTMLCanvasElement>({
    antialias: false,
    resolution: window.devicePixelRatio,
    autoDensity: true,
    backgroundAlpha: 0
  });
  //app.view.className = id.toString();
  app.ticker.autoStart = false;
  app.ticker['stop']();

  if(inlineStyles){
    const newStyles = Object.entries(inlineStyles).reduce((acc, [key, value]) => {
      return `${acc}${key}: ${value};`
    }, "");
    app.view.style.cssText = newStyles;
  }
  return app;
}

const createdContexts = new Map<WebGlContexts, Application<HTMLCanvasElement>>();
export const getWebGlContext = (context: WebGlContexts) => {
  if(!createdContexts.has(context)){
    const app = createWebGlContext({});
    createdContexts.set(context, app);
  }
  return createdContexts.get(context)!;
}
