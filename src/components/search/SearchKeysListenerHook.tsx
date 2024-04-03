/**
 * Hook for listening for search key presses
 */

import { useCallback, useEffect, useState } from "react";

export function useListenForSearchKeypresses(props: {
  searchDialogRequested: () => void;
  disableSearch: boolean;
}) {
  const {
    disableSearch,
    searchDialogRequested
  } = props;

  const [cmdPressed, setCmdPressed] = useState<boolean>(false);

  const keyDownFn = useCallback((e: KeyboardEvent)=>{
    if(e){
      if ((e.ctrlKey || cmdPressed) && e.key === "f") {
        e.preventDefault();
        searchDialogRequested();
        setCmdPressed(false);
      }
      if(e.key === "Meta"){
        e.preventDefault();
        setCmdPressed(true);
      }
    }
  }, [
    cmdPressed,
    searchDialogRequested
  ]);

  const keyUpFn = useCallback((e: KeyboardEvent)=>{
    if (e && (e.key === "Meta")) {
      e.preventDefault();
      setCmdPressed(false);
    }
  }, []);

  useEffect(()=>{
    window.removeEventListener("keydown", keyDownFn);
    window.removeEventListener("keyup", keyUpFn);

    if(!disableSearch){
      window.addEventListener("keydown", keyDownFn);
      window.addEventListener("keyup", keyUpFn);
    }

    return () => {
      window.removeEventListener("keydown", keyDownFn);
      window.removeEventListener("keyup", keyUpFn);
    }
  }, [
    disableSearch, 
    keyDownFn,
    keyUpFn
  ]);
}
