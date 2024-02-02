import {
  configureStore,
  ThunkAction,
  Action
} from "@reduxjs/toolkit";

import {
  useSelector as useReduxSelector,
  useDispatch as useReduxDispatch,
  type TypedUseSelectorHook,
 } from "react-redux";

/*
 *
 *
 * main store
 *
 *
 */
import { alignmentVirtualizationsSlice } from './VirtualizationReducers'
export const reduxStore = configureStore({
  reducer: {
    virtualizations: alignmentVirtualizationsSlice.reducer,
  }
});

export const useAppDispatch = () => useReduxDispatch<ReduxDispatch>()
export const useAppSelector: TypedUseSelectorHook<ReduxState> = useReduxSelector

/* Types */
export type ReduxStore = typeof reduxStore
export type ReduxState = ReturnType<typeof reduxStore.getState>
export type ReduxDispatch = typeof reduxStore.dispatch
export type ReduxThunkAction<ReturnType = void> = ThunkAction<
  ReturnType,
  ReduxState,
  unknown,
  Action
>