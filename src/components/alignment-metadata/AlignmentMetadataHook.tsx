/**
 * Base hook for pure webgl alignment details.
 */
import React, { useEffect, useRef, useState } from "react";

import * as PIXI from "pixi.js";
import { Provider, useDispatch, useSelector } from "react-redux";

import {
  AminoAcidAlignmentStyle,
  NucleotideAlignmentStyle,
} from "../../common/MolecularStyles";
import {
  store,
  setMatrixSize,
  setMatrixDimensions,
  setViewportDimensions,
  RootState,
  IVirtualizedMatrixState,
  setWorldTopOffset,
} from "../../common/ReduxStore";
import { stopSafariFromBlockingWindowWheel } from "../../common/Utils";

export interface IAlignmentMetadataProps {
  id: string;
  sequences: string[];
  residueHeight: number;
  residueWidth: number;
  fontSize: number;
}

export function AlignmentMetadata(props: IAlignmentMetadataProps) {
  //props
  const { id, sequences, residueHeight, residueWidth, fontSize } = props;

  /**
   *
   *
   *
   * Render
   *
   *
   *
   */
  return (
    <Provider store={store}>
      <div></div>
    </Provider>
  );
}
