/**
 * Base hook for a spreadsheet to show annotations.
 */
import "./AlignmentSpreadsheet.scss";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import { 
  generateUUIDv4
} from "../../common/Utils";
import { 
  IControllerRole, 
  IResponderRole,
  ScrollbarOptions, 
  VirtualizationRole,
} from "../virtualization/VirtualizationTypes";
import { IAdjustableWidth } from "../layout/AlignmentViewerLayoutHook";
import { AlignmentSpreadsheetTable } from "./AlignmentSpreadsheetTableHook"
import { 
  IBounds, 
  ReactResizeSensor 
} from "../ResizeSensorHook";
import { getMaxStringCanvasWidth } from "../../common/FontUtils";

export interface ISpreadsheetColumn{
  key: string;
  initiallyPinned?: boolean;
  initialColumnName: string;
  rawData: string[] | number[] | boolean[] | any[];
  rendering?: {type: "Automatic"}; //| 
   // {type: "Heatmap", color: "red"} |
   // {
   //   type: "Custom", 
   //   fn: (startIdx: number, 
   //        endIdx: number, 
   //        col: ISpreadsheetColumn) => React.ReactNode[], 
   // }
  //sorter: {type: "Automatic"};
}

export interface IAlignmentSpreadsheetProps {
  alignmentUUID: string;
  rowHeight: number;
  fontSize: number;
  //reorderable: boolean;

  columns: {[key: string]: ISpreadsheetColumn};
  maxPinnedTableWidth?: number;
  maxUnpinnedTableWidth?: number;
  columnWidthParams?: IAdjustableWidth;
  verticalVirtualization?: {
    virtualization: IControllerRole | IResponderRole;
    scrollbar?: ScrollbarOptions;
  }
  horizScrollbars?: ScrollbarOptions
}

const DEFAULTS = {
  defaultColumnWidth: {
    type: "adjustable-width",
    startingWidth: 75,
    minWidth: 30,
    maxWidth: 400
  } as IAdjustableWidth,
  maxPinnedTableWidth: 700,
  maxUnpinnedTableWidth: 700,
  horizScrollbars: ScrollbarOptions.OnHoverWhenOverflowed
}

export function AlignmentSpreadsheet(
  props: IAlignmentSpreadsheetProps
) {
  //props
  const {
    alignmentUUID,
    rowHeight,
    fontSize,
    columns,
    columnWidthParams = DEFAULTS.defaultColumnWidth,
    maxPinnedTableWidth = DEFAULTS.maxPinnedTableWidth,
    maxUnpinnedTableWidth = DEFAULTS.maxUnpinnedTableWidth,
    horizScrollbars = DEFAULTS.horizScrollbars,
  } = props;

  const leftRightMarginInTableCells = 2;
  const resizeBarWidthPx = 1;
  const borderWidthPx = 1;

  const {
    maxWidth: maxColumnWidth,
    minWidth: minColumnWidth,
    startingWidth: startingColumnWidth
  } = columnWidthParams;

  //
  //state
  //
  const [currentGridDimensions, setCurrentGridDimensions] = useState<IBounds>();
  const containerId = useState<string>(generateUUIDv4()); //unique id for virtualization
  const [hovered, setHovered] = useState(false); //unique id for virtualization
  const [columnNames, setColumnNames] = useState<{[colKey: string]: string}>({});
  const [columnWidths, setColumnWidths] = useState<{[colKey: string]: number}>({});
  const [pinnedColumnKeys, setPinnedColumnKeys] = useState<string[]>(
    Object.keys(columns).reduce((acc, colKey)=>{
      if(columns[colKey].initiallyPinned) acc.push(colKey);
      return acc;
    }, [] as string[])
  );
  const [unpinnedColumnKeys, setUnpinnedColumnKeys] = useState<string[]>(
    Object.keys(columns).reduce((acc, colKey)=>{
      if(!columns[colKey].initiallyPinned) acc.push(colKey);
      return acc;
    }, [] as string[])
  );

  //
  // callbacks
  //
  const mouseEntered = useCallback(()=>{
    setHovered(true);
  }, []);
  const mouseExited = useCallback(()=>{
    setHovered(false);
  }, []);

  const resizeSensor = useCallback((bounds: IBounds)=>{
    setCurrentGridDimensions(bounds);
  }, []);
  

  //
  // data and dom loading
  //
  const getColumnWidthFromData = useCallback((column: ISpreadsheetColumn)=>{
    const fudgeFactorAddedWidth = 5;
    const headerName = columnNames[column.key] 
      ? columnNames[column.key] 
      : column.initialColumnName;
    const headerWidth = getMaxStringCanvasWidth({
      fontSize: fontSize, 
      fontWeight: "bold",
      stringsToMeasure: [headerName],
      maxWidthAllowed: maxColumnWidth,
    }) + (leftRightMarginInTableCells*2) + fudgeFactorAddedWidth;
    if(headerWidth >= maxColumnWidth) return maxColumnWidth; //header too big shortcut

    const maxDataWidth = getMaxStringCanvasWidth({
      fontSize: fontSize, 
      stringsToMeasure: column.rawData as string[],
      maxWidthAllowed: maxColumnWidth,
    }) + (leftRightMarginInTableCells*2) + fudgeFactorAddedWidth;

    return headerWidth > maxDataWidth 
      ? headerWidth > maxColumnWidth
        ? maxColumnWidth
        : headerWidth
      : maxDataWidth > maxColumnWidth
        ? maxColumnWidth
        : maxDataWidth;
  }, [
    leftRightMarginInTableCells,
    columnNames,
    maxColumnWidth,
    fontSize,
  ]);


  //adjust column width and adjust pined columns if data changes
  useEffect(()=>{
    setColumnNames((prevColumnNames: {[colKey: string]: string})=>{
      return Object.keys(columns).reduce((acc, colKey)=>{
        acc[colKey] = prevColumnNames[colKey] 
          ? prevColumnNames[colKey] 
          : columns[colKey].initialColumnName;
        return acc;
      }, {} as {[colKey: string]: string})
    });

    //setPinnedColumnKeys((prevPinnedColKeys: string[])=>{
    //  return Object.keys(columns).reduce((acc, colKey)=>{
    //    if(prevPinnedColKeys.includes(colKey) || columns){
//
    //    }
    //    acc[colKey] = prevPinnedColKeys.includes(colKey)
    //      ? prevColumnNames[colKey] 
    //      : columns[colKey].initialColumnName;
    //    return acc;
    //  }, [] as string[])
    //});
  }, [columns]);

  //adjust column width if data changes
  useEffect(()=>{
    if(Object.keys(columns).length < 1){ return; }

    //START of subsampling code if data are too big.
    //const oneCol = columns[Object.keys(columns)[0]]
    //const numSequences = oneCol.rawData.length;
    //const NUM_RANDOM_WIDTH_CHECK = numSequences < 1000 
    //  ? numSequences 
    //  : 1000;
    //const randomIndicies: number[] = [];
    //for(var i = 0; i < NUM_RANDOM_WIDTH_CHECK; i++){
    //  randomIndicies.push(
    //    Math.floor(Math.random() * numSequences)
    //  );
    //}

    setColumnWidths((prevColumnWidths: {[colKey: string]: number})=>{
      return Object.keys(columns).reduce((acc, colKey)=>{
        let width = prevColumnWidths[colKey];
        if(!width){
          width = colKey === "rownum"
            ? getColumnWidthFromData(columns[colKey])
            : startingColumnWidth;
        }
        acc[colKey] = width;
        return acc;
      }, {} as {[colKey: string]: number})
    });
  }, [
    columns,
    startingColumnWidth,
    getColumnWidthFromData
  ]);

  //
  //load vertical virtualizations - either from props or auto generate. or don't virtualize
  // IMPORTANT: if there is any CONTROLLER virtualizations, make sure they are set to
  //            the unpinned table as this table is always output even if width is 0.
  //
  const [
    verticalScrollbar, 
    pinnedVerticalVirtualization, 
    unpinnedVerticalVirtualization
  ] = useMemo(()=>{
    const defaultScrollbar = ScrollbarOptions.OnHoverWhenOverflowed;
    const propsVirtualization = props.verticalVirtualization?.virtualization;
    const scrollbar = props.verticalVirtualization?.scrollbar
      ? props.verticalVirtualization.scrollbar
      : defaultScrollbar;

    if (propsVirtualization !== undefined){ //parent passed virtualization
      return propsVirtualization.role === VirtualizationRole.Responder
        ? [ scrollbar, propsVirtualization, propsVirtualization ]
        : [ scrollbar, 
          { //set pinned to be responder
            virtualizationId: propsVirtualization.virtualizationId,
            role: VirtualizationRole.Responder
          } as IResponderRole,
          //set unpinned to be controller as it is always output regardless
          //of having any data (2nd in grid easier to account for)
          propsVirtualization 
        ];
    }

    //doesn't really matter which is responder / controller as either
    //contain the same / correct sizing (cellCount is derived from the
    //first entry rather than the first pinned/unpinned entry).
    const automaticId = `y_auto_generated_metadata_virtualization_${alignmentUUID}_${containerId}`;
    return [
      scrollbar,
      { //set pinned to be the responder
        virtualizationId: automaticId,
        role: VirtualizationRole.Responder
      } as IResponderRole,
      
      { //set unpinned to be controller as it is always output regardless
        //of having any data (2nd in grid easier to account for)
        virtualizationId: automaticId,
        role: VirtualizationRole.Controller,
        cellCount: Object.keys(columns).length < 1 
          ? 0 
          : columns[Object.keys(columns)[0]].rawData.length,
        cellSizePx: rowHeight,
      } as IControllerRole,
    ];
  }, [
    alignmentUUID, 
    containerId,
    props.verticalVirtualization,
    columns,
    rowHeight
  ]);


  //
  //
  //
  //
  // Render
  //
  //
  //
  //
  const getOrderedWidths = useCallback((
    colKeys: string[],
    columnWidths: { [colKey: string]: number; }
  ) => {
    return colKeys.reduce((acc, key) => {
      const colWidth = columnWidths[key];
      acc.push(colWidth);
      return acc;
    }, [] as number[]);
  }, []);

  const [pinnedColumnWidths, unpinnedColumnWidths] = useMemo(()=>{
    return [
      getOrderedWidths(pinnedColumnKeys, columnWidths),
      getOrderedWidths(unpinnedColumnKeys, columnWidths)
    ];
  }, [
    getOrderedWidths,
    pinnedColumnKeys,
    unpinnedColumnKeys,
    columnWidths
  ]);

  //
  //resizing pinned vs unpinned tables
  //
  const calculateActualAndVisibleTableWidths = useCallback((
    pinned: boolean,
    colWidths: number[],
  )=>{
    const maxWidth = pinned ? maxPinnedTableWidth : maxUnpinnedTableWidth;
    const actualWidth = colWidths.reduce((acc, colWidthPx)=>{
      return acc + colWidthPx + resizeBarWidthPx + (borderWidthPx);
    }, 0);
    return [
      actualWidth,
      actualWidth < maxWidth
        ? actualWidth
        : maxWidth
    ]
  }, [
    maxPinnedTableWidth,
    maxUnpinnedTableWidth
  ]);

  const [
    pinnedTableActualWidth,
    pinnedTableVisibleWidth
  ] = useMemo(()=>{
    return calculateActualAndVisibleTableWidths(true, pinnedColumnWidths);
  }, [ 
    calculateActualAndVisibleTableWidths,
    pinnedColumnWidths 
  ]);

  const [
    unpinnedTableActualWidth,
    unpinnedTableVisibleWidth
  ] = useMemo(()=>{
    return calculateActualAndVisibleTableWidths(false, unpinnedColumnWidths);
  }, [ 
    calculateActualAndVisibleTableWidths,
    unpinnedColumnWidths
  ]);
  
  const updateColumnWidths = useCallback((
    colKeyToUpdate: string, newProposedWidth?: number
  )=>{
    if(newProposedWidth){
      const newWidth = newProposedWidth > minColumnWidth
        ? newProposedWidth
        : minColumnWidth;

      setColumnWidths({
        ...columnWidths,
        [colKeyToUpdate]: newWidth
      });
    }
    else{ //the column should be resized to the max of the data
      setColumnWidths({
        ...columnWidths,
        [colKeyToUpdate]: getColumnWidthFromData(
          columns[colKeyToUpdate]
        )
      });
    }
  }, [
    columns,
    columnWidths,
    minColumnWidth,
    getColumnWidthFromData
  ]);

  const pinnedGridTemplateColumns = pinnedTableActualWidth > 0
    ? `minmax(100px, ${pinnedTableActualWidth}px)`
    : "";
  const unpinnedGridTemplateColumns = unpinnedTableActualWidth > 0
    ? ` minmax(100px, ${unpinnedTableActualWidth}px)`
    : " 0px";
  const gridTemplateAreas = `"${pinnedTableActualWidth > 0 ? "pinned-table " : "" }unpinned-table"`;

  return (
    <>
      <ReactResizeSensor onSizeChanged={resizeSensor} logId="alignment-viewer-layout">
        <div className="av2-spreadsheet"
          onMouseEnter={mouseEntered}
          onMouseLeave={mouseExited}
          style={{
            overflowX: "clip",
            fontSize: fontSize,
            gridTemplateAreas: gridTemplateAreas,
            gridTemplateColumns: 
              //"auto minmax(100px, ${unpinnedTableActualWidth}px)"
              `${pinnedGridTemplateColumns} ${unpinnedGridTemplateColumns}`//`auto minmax(100px, 1fr)`
          }}
        >
          { //this needs correction - will mess up virtualization if one disappears and 
            //automatic generated virtualization (i.e., controller not passed from parent)
            pinnedTableActualWidth <= 0 ? undefined : (
              <div className="pinned-table-holder">
                <AlignmentSpreadsheetTable 
                  alignmentUUID={alignmentUUID}
                  columns={columns}
                  columnKeys={pinnedColumnKeys}
                  columnWidths={pinnedColumnWidths}
                  fullActualWidth={pinnedTableActualWidth}
                  rowHeight={rowHeight}
                  className="pinned-table"
                  leftRightMarginInTableCells={leftRightMarginInTableCells}
                  resizeBarSizePx={resizeBarWidthPx}
                  columnWidthUpdateRequested={updateColumnWidths}
                  vertVirtualization={pinnedVerticalVirtualization}
                  vertScrollbar={verticalScrollbar}
                  horizScrollbar={horizScrollbars}
                  showHeader={hovered}
                />
            </div>
            )
          }
          { //this needs correction - will mess up virtualization if one disappears and 
            //automatic generated virtualization (i.e., controller not passed from parent)
            <div className="unpinned-table-holder">
              <AlignmentSpreadsheetTable 
                alignmentUUID={alignmentUUID}
                columns={columns}
                columnKeys={unpinnedColumnKeys}
                columnWidths={unpinnedColumnWidths}
                fullActualWidth={unpinnedTableActualWidth}
                rowHeight={rowHeight}
                className="unpinned-table"
                leftRightMarginInTableCells={leftRightMarginInTableCells}
                resizeBarSizePx={resizeBarWidthPx}
                columnWidthUpdateRequested={updateColumnWidths}
                vertVirtualization={unpinnedVerticalVirtualization}
                vertScrollbar={verticalScrollbar}
                horizScrollbar={horizScrollbars}
                showHeader={hovered}
              />
            </div>
          }
        </div>
      </ReactResizeSensor>
    </>
  );
}
