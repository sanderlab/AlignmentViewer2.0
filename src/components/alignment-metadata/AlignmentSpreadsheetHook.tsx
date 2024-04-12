/**
 * Base hook for a spreadsheet to show annotations.
 */
import "./AlignmentSpreadsheet.scss";
import React, { useCallback, useMemo, useRef, useState } from "react";

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

export type IAlignmentSpreadsheetProps = {
  alignmentUUID: string;
  rowHeight: number;
  fontSize: number;
  //reorderable: boolean;
  maxPossibleVisibleWidth: number;
  widthRequirementsUpdated: (
    minVisibleWidthPx: number,
    actualVisibleWidthPx: number
  ) => void;

  columns: {[key: string]: ISpreadsheetColumn};
  verticalVirtualization?: {
    virtualization: IControllerRole | IResponderRole;
    scrollbar?: ScrollbarOptions;
  }
} & Partial<Readonly<typeof defaultProps>>;

const defaultProps = {
  columnWidthParams: {
    type: "adjustable-width",
    startingWidth: 75,
    minWidth: 30,
    maxWidth: 400
  } as IAdjustableWidth,
  horizScrollbars: ScrollbarOptions.OnHoverWhenOverflowed
}

export function AlignmentSpreadsheet(
  props: IAlignmentSpreadsheetProps
) {
  //props
  const {
    rowHeight,
    fontSize,
    maxPossibleVisibleWidth,
    widthRequirementsUpdated,
    columnWidthParams,
    horizScrollbars,
  } = {
    ...defaultProps,
    ...props,
  };

  const leftRightMarginInTableCells = Math.ceil(rowHeight / 3);
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
  const containerId = useMemo(generateUUIDv4, []); //unique id for virtualization
  const [hovered, setHovered] = useState(false); //unique id for virtualization

  const [alignmentUUID, setAlignmentUUID] = useState("");
  const [columns, setColumns] = useState<{[key: string]: ISpreadsheetColumn}>({});
  const [columnNames, setColumnNames] = useState<{[colKey: string]: string}>({});
  const [columnResizing, setColumnResizing] = useState<boolean>(false);

  const [desiredPinnedColumnKeys, setDesiredPinnedColumnKeys] = useState<string[]>([]);
  const [desiredUnpinnedColumnKeys, setDesiredUnpinnedColumnKeys] = useState<string[]>([]);
  const [desiredColumnWidths, setDesiredColumnWidths] = useState<{[colKey: string]: number}>({});
  const actualColumnWidths = useRef(desiredColumnWidths);

  const columnResizeChangeFn = useCallback((columnResizing: boolean)=>{
    if(columnResizing){
      setDesiredColumnWidths({...actualColumnWidths.current});
    }
    setColumnResizing(columnResizing);
  }, [
    setDesiredColumnWidths,
    setColumnResizing
  ]);

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

  //deal with column width changes.
  const minUnpinnedSpace = desiredUnpinnedColumnKeys.length > 0 ? 100 : 0;
  const [
    actualPinnedColumnKeys,
    actualUnpinnedColumnKeys
  ] = useMemo(()=>{
    if(!currentGridDimensions) return [
      [] as string[], 
      [] as string[]
    ];
    
    let actualPinnedColumnKeys: string[] = [...desiredPinnedColumnKeys];
    let actualUnpinnedColumnKeys: string[] = [...desiredUnpinnedColumnKeys];
    let minPinnedWidthPx = columnWidthParams.minWidth * desiredPinnedColumnKeys.length;
    let minVisibleWidthPx = minPinnedWidthPx + minUnpinnedSpace;
    
    const maxPinnedWidth = maxPossibleVisibleWidth - minUnpinnedSpace;
    const desiredPinnedWidth = Object.keys(desiredColumnWidths).reduce((acc, colKey: string)=>{
      if(desiredPinnedColumnKeys.includes(colKey)){
        acc +=  desiredColumnWidths[colKey];
      }
      return acc;
    }, 0);

    if(columnResizing){ //is a column being resized
      if(
        currentGridDimensions.width < desiredPinnedWidth + minUnpinnedSpace &&
        desiredPinnedWidth <= maxPinnedWidth
      ){
        //tell the layout to  
        widthRequirementsUpdated(
          minVisibleWidthPx, 
          desiredPinnedWidth + minUnpinnedSpace
        );
      }
    }
    else{
      //popping logic
      if(currentGridDimensions.width < minVisibleWidthPx){
        const numToKeep = (currentGridDimensions.width-minUnpinnedSpace) / columnWidthParams.minWidth;
        const numToRemove = Math.ceil(desiredPinnedColumnKeys.length - numToKeep);
        const poppedKeys = actualPinnedColumnKeys.slice(
          actualPinnedColumnKeys.length-numToRemove, 
          actualPinnedColumnKeys.length
        );
        actualUnpinnedColumnKeys = [...poppedKeys, ...actualUnpinnedColumnKeys];
        actualPinnedColumnKeys = actualPinnedColumnKeys.slice(
          0, actualPinnedColumnKeys.length-numToRemove
        );

        //recalculate the spacing requirements
        minPinnedWidthPx = columnWidthParams.minWidth * actualPinnedColumnKeys.length;
        minVisibleWidthPx = minPinnedWidthPx + minUnpinnedSpace;
      }
    }

    const needToShrink = currentGridDimensions.width < (desiredPinnedWidth + minUnpinnedSpace);
    const amountToRemove = (desiredPinnedWidth + minUnpinnedSpace) - currentGridDimensions.width;
    const maxWidthThatCanBeRemoved = desiredPinnedWidth - minPinnedWidthPx;
    actualColumnWidths.current = Object.keys(desiredColumnWidths).reduce((acc, colKey)=>{
      if(desiredPinnedColumnKeys.includes(colKey) && needToShrink){
        //shrink to meet requirements
        //e.g., 
        //    min width = 100px and need to remove 200px
        //    col1 = 150px and col2 = 270px and col3 = 100px and col4 = 600px
        //    max space that can be removed from each column = 
        //      col1 = 50px and col2 = 170px and col3 = 0px and col4 = 500px
        //    max space that can be removed from all = sum of the above = 720px (maxWidthThatCanBeRemoved)
        //    proportionally: 200px / 720px * amount possible to remove:
        //      col1 = 150 - 50 * 200 / 720 = 
        //      col2 = 270 - 170 * 200 / 720 = 
        //      col3 = 100 - 0 * 200 / 720 = 
        //      col4 = 600 - 500 * 200 / 720 = 
        const desiredColWidth = desiredColumnWidths[colKey];
        const amountToRemoveFromCol = 
          (desiredColWidth - columnWidthParams.minWidth) * 
          (amountToRemove / maxWidthThatCanBeRemoved);
        const proposedSize = desiredColWidth - amountToRemoveFromCol;

        acc[colKey] = proposedSize > columnWidthParams.minWidth
          ? proposedSize : columnWidthParams.minWidth;
      }
      return acc;
    }, {...desiredColumnWidths});

    return [
      actualPinnedColumnKeys,
      actualUnpinnedColumnKeys
    ];
  }, [
    columnResizing,
    columnWidthParams.minWidth,
    desiredColumnWidths,
    currentGridDimensions,
    maxPossibleVisibleWidth,
    minUnpinnedSpace,
    desiredPinnedColumnKeys,
    desiredUnpinnedColumnKeys,
    widthRequirementsUpdated,
  ]);

  //
  // data and dom loading
  //
  const getColumnWidthFromData = useCallback((column: ISpreadsheetColumn, roughly = false)=>{
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
    let stringsToMeasure = column.rawData as string[];
    if (roughly) {
      let longest = "", len = 0;
      for (const item of column.rawData.slice(0, 100)) {
        const stringItem = `${item}`
        if (stringItem.length > len) {
          longest = stringItem;
          len = stringItem.length;
        }
      }
      stringsToMeasure = [longest]
    }

    const maxDataWidth = getMaxStringCanvasWidth({
      fontSize: fontSize, 
      stringsToMeasure,
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
  

  //
  //initialize - new alignment or additional columns added
  //
  if (props.columns !== columns) {
    if (props.alignmentUUID !== alignmentUUID) { // new alignment loaded
      setAlignmentUUID(props.alignmentUUID);

      setColumnNames(
        Object.keys(props.columns).reduce((acc, colKey)=>{
          acc[colKey] = props.columns[colKey].initialColumnName;
          return acc;
        }, {} as {[colKey: string]: string})
      );

      setDesiredColumnWidths(
        Object.keys(props.columns).reduce((acc, colKey)=>{
          acc[colKey] = ((colKey === "rownum") || true)
            ? getColumnWidthFromData(props.columns[colKey], true)
            : startingColumnWidth;
          return acc;
        }, {} as {[colKey: string]: number})
      );
  
      setDesiredPinnedColumnKeys(
        Object.keys(props.columns).reduce((acc, colKey)=>{
          if (props.columns[colKey].initiallyPinned) acc.push(colKey);
          return acc;
        }, [] as string[])
      );

      setDesiredUnpinnedColumnKeys(
        Object.keys(props.columns).reduce((acc, colKey)=>{
          if (!props.columns[colKey].initiallyPinned) acc.push(colKey);
          return acc;
        }, [] as string[])
      );
    } else { // same alignment, new annotation columns added
      setColumnNames(
        Object.keys(props.columns).reduce((acc, colKey)=>{
          acc[colKey] = columnNames[colKey] 
            ? columnNames[colKey] 
            : props.columns[colKey].initialColumnName;
          return acc;
        }, {} as {[colKey: string]: string})
      );

      setDesiredColumnWidths(
        Object.keys(props.columns).reduce((acc, colKey)=>{
          let width = desiredColumnWidths[colKey];
          if(!width){
            width = ((colKey === "rownum") || true)
              ? getColumnWidthFromData(props.columns[colKey], true)
              : startingColumnWidth;
          }
          acc[colKey] = width;
          return acc;
        }, {} as {[colKey: string]: number})
      );
  
      setDesiredPinnedColumnKeys(
        Object.keys(props.columns).reduce((acc, colKey)=>{
          if (!(colKey in columns) && (props.columns[colKey].initiallyPinned)) {
            acc.push(colKey);
          }
          return acc;
        }, [] as string[])
      );

      setDesiredUnpinnedColumnKeys(
        Object.keys(props.columns).reduce((acc, colKey)=>{
          if (!(colKey in columns) && (!props.columns[colKey].initiallyPinned)) {
            acc.push(colKey);
          }
          return acc;
        }, [] as string[])
      );
    }

    setColumns(props.columns);
  }

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
  ) => {
    return colKeys.reduce((acc, key) => {
      const colWidth = actualColumnWidths.current[key]!;
      acc.push(colWidth);
      return acc;
    }, [] as number[]);
  }, []);
  const pinnedColumnWidths = getOrderedWidths(actualPinnedColumnKeys);
  const unpinnedColumnWidths = getOrderedWidths(actualUnpinnedColumnKeys);


  //
  //resizing pinned vs unpinned tables
  //
  const calculateActualAndVisibleTableWidths = useCallback((
    pinned: boolean,
    colWidths: number[],
  )=>{
    const actualWidth = colWidths.reduce((acc, colWidthPx)=>{
      return acc + colWidthPx + resizeBarWidthPx; //TODO this needs to be stolen from colWidth.
    }, 0) + (colWidths.length > 0 && pinned ? (borderWidthPx) * 2 : 0);
    return actualWidth
  }, []);

  const pinnedTableActualWidth  = useMemo(()=>{
    return calculateActualAndVisibleTableWidths(true, pinnedColumnWidths);
  }, [ 
    calculateActualAndVisibleTableWidths,
    pinnedColumnWidths 
  ]);

  const unpinnedTableActualWidth = useMemo(()=>{
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

      setDesiredColumnWidths({
        ...desiredColumnWidths,
        [colKeyToUpdate]: newWidth
      });
    }
    else{ //the column should be resized to the max of the data
      setDesiredColumnWidths({
        ...desiredColumnWidths,
        [colKeyToUpdate]: getColumnWidthFromData(
          columns[colKeyToUpdate]
        )
      });
    }
  }, [
    columns,
    desiredColumnWidths,
    minColumnWidth,
    getColumnWidthFromData
  ]);
  
  const pinnedGridTemplateColumns = pinnedTableActualWidth > 0
    ? `${pinnedTableActualWidth}px`
    : "";
  const unpinnedGridTemplateColumns = unpinnedTableActualWidth > 0
    ? `minmax(${minUnpinnedSpace}px, ${unpinnedTableActualWidth}px)`
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
                  columnSizeChanging={columnResizeChangeFn}
                  columnKeys={actualPinnedColumnKeys}
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
                columnSizeChanging={columnResizeChangeFn}
                columnKeys={actualUnpinnedColumnKeys}
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
