import React from "react";
import * as PIXI from "pixi.js";
import { Viewport } from "pixi-viewport";
import { useState, useEffect } from "react";

export interface IMiniMapViewportProps {
  numColumns: number;
  numRows: number;
  app: PIXI.Application;
  onMouseClick?: (mousePosition: IPosition) => void;
  stageWidth: number;
  stageHeight: number;
  ensureVisible?: {
    y: number;
    height: number;
  };
  children: any;
}

const OVERFLOW_ZOOM_ALLOWED = 0.05; //allow 5% zoom out (both sides = 10% total) past max width / height

export function MiniMapViewport(props: IMiniMapViewportProps) {
  const {
    app,
    ensureVisible,
    numColumns,
    numRows,
    onMouseClick,
    stageWidth,
    stageHeight,
  } = props;

  app.renderer.backgroundColor = 0x000000;

  let [vp] = useState<Viewport>(
    new Viewport({
      //noTicker: true,
      screenWidth: stageWidth,
      //screenHeight: stageHeight, //TODO uncomment?
      worldWidth: numColumns,
      worldHeight: numRows,
      interaction: app.renderer.plugins.interaction,
    })
      .decelerate()
      .clamp({
        direction: "all",
      })
      .bounce({ friction: 0.1, time: 150, underflow: "center" })
      // !IMPORTANT
      // Two-finger drag on trackpad is also enabled by this.
      // Issue currently open: https://github.com/davidfig/pixi-viewport/issues/143
      .drag({
        direction: "all", //this is the line that kills pinch
      })
      .pinch()
      .wheel()
  );

  useEffect(() => {
    vp.off("clicked");
    console.log("off clicked");
    if (onMouseClick) {
      console.log("on clicked");
      vp.on("clicked", (e) => {
        console.log("clicked!", e);

        onMouseClick({ x: e.world.x, y: e.world.y });
      });
    }
  }, [onMouseClick]);

  console.log("MINIMAP VP:", vp);
  console.log("APP:", app);

  const resizedStage =
    vp.screenWidth !== stageWidth || vp.screenHeight !== stageHeight;
  const newAlignment =
    vp.worldWidth !== numColumns || vp.worldHeight !== numRows;

  if (resizedStage || newAlignment) {
    const oldStageWidth = vp.screenWidth;
    const oldStageHeight = vp.screenHeight;

    vp.resize(stageWidth, stageHeight, numColumns, numRows);
    app.render(); //stops flicker on safari.

    //set the clamp based on the current stage height/width
    let clampWidthMax, clampHeightMax;
    let clampMinWidth = ensureVisible ? ensureVisible.height : undefined;

    if (numColumns / stageWidth > numRows / stageHeight) {
      //width is more important
      clampWidthMax = numColumns + OVERFLOW_ZOOM_ALLOWED * numColumns;
      vp = vp.clampZoom({
        maxHeight: undefined,
        maxWidth: clampWidthMax,
        minHeight: clampMinWidth,
      });
    } else {
      //height is more important
      clampHeightMax = numRows + OVERFLOW_ZOOM_ALLOWED * numRows;
      vp = vp.clampZoom({
        maxWidth: undefined,
        maxHeight: clampHeightMax,
        minHeight: clampMinWidth,
      });
    }

    //zoom to appropriate level
    if (newAlignment) {
      //new alignments set zoom clamping and also force the alignment into
      //as much of a view as possible.
      //vp = vp.fitWorld(true); //TODO: fails with hook? I don't get it
      vp = vp.setZoom(stageWidth / numColumns, false);
    } else if (oldStageWidth !== stageWidth) {
      //the viewport is being resized horizontally (likely by user dragging)
      //  1. compress if the resize is making pushing the alignment off the screen
      //  2. scale alignment if the resize is expanding

      if (oldStageWidth > stageWidth) {
        //viewport is shrinking horizontally
        if (vp.scale.x * numColumns > stageWidth) {
          //it is pushing the current alignment off the screen, force
          //the alignment to stay the same size as the viewport
          vp = vp.setZoom(stageWidth / numColumns, false);
        }
      } else {
        //viewport is expanding horizontally

        //detect new zoom level. this is pretty crude. is there a better way?
        let newZoomLevel = vp.scale.x * (stageWidth / oldStageWidth);

        if (
          (clampWidthMax &&
            (newZoomLevel * numColumns < clampWidthMax ||
              numColumns > stageWidth)) ||
          (clampHeightMax &&
            (newZoomLevel * numRows < clampHeightMax || numRows > stageHeight))
        ) {
          vp = vp.setZoom(newZoomLevel, false);
        }
      }
    }
  }

  //once all the zoom etc
  if (ensureVisible) {
    //@ts-ignore
    vp.ensureVisible(
      undefined,
      ensureVisible.y,
      undefined,
      ensureVisible.height
    );
  }

  console.log("props.children:", props.children);
  //vp.addChild(props.children);
  //return <>{props.children}</>;
  return vp;
}
