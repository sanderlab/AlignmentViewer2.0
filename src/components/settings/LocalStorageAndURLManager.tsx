import "./Settings.scss";
import { IPropObjectInstanceInList } from "../../common/GlobalEnumObject";
import React, { useCallback, useMemo, useRef } from "react";

import Select, { MultiValue } from 'react-select'

export const globalSettingsUrlLocalStorageManager = (() =>{
  let initialized = false;
  const LOCALSTORAGE_KEY = "AV2_UI_SETTINGS_CACHE";
  const ALIGNMENT_URL_KEY = "alignment-url";
  let VALID_SAVE_PROP_KEYS: string[] | undefined = undefined;

  const writeParamsToUrlAndLocalstorage = (params: URLSearchParams) => {
    if(VALID_SAVE_PROP_KEYS !== undefined){
      const urlParams =  new URLSearchParams( window.location.search );
      const localStorageParams = new URLSearchParams();
      //merge the new parameters, but don't touch those that aren't valid
      for(var i = 0; i < VALID_SAVE_PROP_KEYS.length; i++){
        const key = VALID_SAVE_PROP_KEYS[i];
        const newValue = params.get(key);
        if(newValue !== null){
          urlParams.set(key, newValue);
          localStorageParams.set(key, newValue);
        }
        else{
          urlParams.delete(key);
        }
      }

      //write the complete parameter list to both the url and local storage
      window.history.replaceState(null, "", `?${urlParams.toString()}`);
      params.delete(ALIGNMENT_URL_KEY); //don't save to local storage
      localStorage.setItem( LOCALSTORAGE_KEY, localStorageParams.toString() );
    }
  }

  const getCurrentParams = (dontInitialize?: boolean) => {
    const urlSearchParams = new URLSearchParams( window.location.search )
    const localStorageParams = new URLSearchParams(
      localStorage.getItem(LOCALSTORAGE_KEY)
        ? localStorage.getItem(LOCALSTORAGE_KEY)!
        : undefined
    );
    for (const [key, value] of urlSearchParams) { // URL trumps local storage
      localStorageParams.set(key, value);
    }
    if(!initialized && !dontInitialize){
      //we don't want to write to the URL / local storage if the
      //caller isn't using URL/local storage, so do not write on the
      //initial call.
      initialized = true;
      writeParamsToUrlAndLocalstorage(localStorageParams);
    }
    return localStorageParams;
  }
  //set the startup parameter set, but don't sync the url/local storage
  //until a real caller requests these data.
  const parametersOnLoad = getCurrentParams(true);

  return {
    setValidSavePropKeys: (keys: string[]) => {
      //required before any writing occurs
      VALID_SAVE_PROP_KEYS = keys;
      writeParamsToUrlAndLocalstorage(getCurrentParams());
    },
    getAlignmentUrlParam: () => { //special case
      return parametersOnLoad.get(ALIGNMENT_URL_KEY)
    },
    getCurrentValue: (propName: string) => {
      return getCurrentParams().get(propName);
    },
    getCurrentDeserializedValue: <T,> (propName: string, deserializer: (s: string)=>T) => {
      const val = getCurrentParams().get(propName);
      return val === null ? undefined : deserializer(val);
    },
    updateValue: (propName: string, value: string | undefined) => {
      const newParams = getCurrentParams();
      if(value === undefined){
        newParams.delete(propName);
      }
      else{
        newParams.set(propName, value);
      }
      writeParamsToUrlAndLocalstorage(newParams);
    }
  };
})();



/**
 * This hook acts as middleware for the global settings state, helping to
 * initialize individual state as well as updating the url and local storage
 * to state changes.
 * @param props 
 * @returns 
 */
export function useGlobalSettingsMiddleware<T>(props: {
  propKey: string;
  currentValue: T;
  defaultValue: T;
  serialize: (obj: T) => string | undefined;
  useUrlAndLocalstorage: boolean;
}){
  const {
    propKey,
    currentValue,
    defaultValue,
    useUrlAndLocalstorage,
    serialize
  } = props;

  const currentValueStr = serialize(currentValue);
  const lastValue = useRef<string>();

  if(useUrlAndLocalstorage && currentValueStr !== lastValue.current){
    const defaultValueStr = serialize(defaultValue);
    globalSettingsUrlLocalStorageManager.updateValue(
      propKey, 
      currentValueStr !== defaultValueStr
        ? currentValueStr
        : undefined //remove if default
    );
  }
  lastValue.current = currentValueStr;
};


/**
 * Generate a select box for a list of "IListOfPropObjects" (e.g., ResidueColoring, 
 * LogoType, etc). It is up to the caller to process the property changes from 
 * the "onChange" callback, pass them back through the "currentVal" prop. Also,
 * to use "useUrlAndLocalstorage", the initial call should set currentVal to 
 * undefined - and the url / local storage manager will initialze the current
 * value.
 * 
 * @param props 
 * @returns 
 */
export function InputSelectSetting<
  U extends IPropObjectInstanceInList, 
>(props: {
  propKey: string;
  currentValue: U;
  defaultValue: U;
  allPossibleValues: U[];
  serialize: (obj: U) => string | undefined;
  deserialize: (key: string) => U | undefined;
  onChange: (deserializedValue: U) => void;
  useUrlAndLocalstorage: boolean;
}){
  useGlobalSettingsMiddleware<U>({
    propKey: props.propKey,
    currentValue: props.currentValue,
    defaultValue: props.defaultValue,
    serialize: props.serialize,
    useUrlAndLocalstorage: props.useUrlAndLocalstorage
  })

  const options = useMemo(()=>{
    return props.allPossibleValues.map((v) => {
      return {value: v.key, label: v.description}
    });
  }, [props.allPossibleValues]);

  return (
    <Select
      id={props.propKey}
      options={options}
      onChange={(newVal)=>{
        props.onChange( props.deserialize(newVal!.value)!);
      }}
      value={!props.currentValue
        ? undefined
        : options.find(v => v.value === props.currentValue.key)
      }
      isSearchable={false}
      //to decrease size see: https://stackoverflow.com/questions/54218351
    />
  );
}

export function InputMultiSelectSetting<
  U extends IPropObjectInstanceInList, 
>(props: {
  propKey: string;
  currentValues: U[];
  defaultValues: U[];
  allPossibleValues: U[];
  serialize: (obj: U[]) => string | undefined;
  onChange: (deserializedValues: U[]) => void;
  useUrlAndLocalstorage: boolean;
}){
  useGlobalSettingsMiddleware<U[]>({
    propKey: props.propKey,
    currentValue: props.currentValues,
    defaultValue: props.defaultValues,
    serialize: props.serialize,
    useUrlAndLocalstorage: props.useUrlAndLocalstorage
  })

  const options = useMemo(()=>{
    return props.allPossibleValues.map((v) => {
      return {value: v.key, label: v.description}
    });
  }, [props.allPossibleValues]);

  const optionToU = useCallback((
    vals: MultiValue<{ value: string; label: string;}>
  )=>{
    return vals.map((val) => {
      return props.allPossibleValues.find((v) => v.key === val.value)!
    });
  }, [
    props.allPossibleValues
  ]);

  return (
    <Select
      id={props.propKey}
      options={options}
      onChange={(newVals)=>{
        const uArr = optionToU(newVals);
        props.onChange( uArr );
      }}
      isMulti={true}
      value={!props.currentValues
        ? undefined
        : options.reduce((acc, val) => {
          if(props.currentValues.find(cv => cv.key === val.value)){
            acc.push(val)
          }
          return acc;
        }, [] as typeof options)
      }
      isSearchable={false}
      //to decrease size see: https://stackoverflow.com/questions/54218351
    />
  );
}

export function InputBooleanSetting(props: {
  propKey: string;
  currentValue: boolean;
  defaultValue: boolean;
  onChange: (newVal: boolean) => void;
  useUrlAndLocalstorage: boolean;
}){
  const booleanSerializer = useMemo(()=>{
    return (b: boolean) => {return b ? 'true': 'false'}
  }, []);

  const onChange = props.onChange;
  const checkboxToggled = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked);
  }, [onChange]);

  useGlobalSettingsMiddleware<boolean>({
    propKey: props.propKey,
    currentValue: props.currentValue,
    defaultValue: props.defaultValue,
    serialize: booleanSerializer,
    useUrlAndLocalstorage: props.useUrlAndLocalstorage
  })

  return (
    <input
      id={props.propKey}
      name={props.propKey}
      type="checkbox"
      checked={props.currentValue}
      onChange={checkboxToggled}
    />
  );
}

export function InputNumberSetting(props: {
  propKey: string;
  currentValue: number;
  defaultValue: number;
  minValue: number;
  maxValue: number;
  onChange: (newVal: number) => void;
  useUrlAndLocalstorage: boolean;
}){
  const {
    currentValue,
    minValue,
    maxValue,
    onChange,
  } = props;

  const numberSerializer = useCallback((n: number)=>{
    return n.toString();
  }, []);

  useGlobalSettingsMiddleware<number>({
    propKey: props.propKey,
    currentValue: currentValue,
    defaultValue: props.defaultValue,
    serialize: numberSerializer,
    useUrlAndLocalstorage: props.useUrlAndLocalstorage
  })

  const increment = useCallback(()=>{
    if(currentValue + 1 <= maxValue){ 
      onChange(currentValue + 1); 
    }
  }, [
    currentValue,
    maxValue,
    onChange
  ]);

  const decrement = useCallback(()=>{
    if(currentValue - 1 >= minValue) {
      onChange(currentValue - 1);
    }
  }, [
    currentValue,
    minValue,
    onChange,
  ]);

  return (
    <div className="stepper-holder">
      <div className="stepper">
        <button
          type="button"
          disabled={currentValue <= minValue}
          onClick={decrement}>&#xFF0D;</button>
        <span id={props.propKey}>{currentValue}</span>
        <button
          type="button"
          disabled={currentValue >= maxValue}
          onClick={increment}>&#xFF0B;</button>
      </div>
    </div>
  );
}


//
// generic hook
// input types:
//   select - list of all options or multi-select
//   checkbox - boolean
//   input number with min/max
//
/*export function InputSetting<
  T extends typeof IListOfPropObjects | number | boolean,
  D extends IPropObjectInstanceInList
>(props: {

  defaultOption: T,
  allOptions: T[],      //object only
  multiSelect: boolean, //object only

  minOption: number, //number only
  maxOption: number, //number only

  saveToUrl: boolean,
  saveToLocalstorage: boolean,

  settingName: string;
  setting: T,
  defaultProp: D,
  settingUpdated: (newSetting: T) => void;
}){
  const {
    settingName,
    setting,
    settingUpdated
  } = props;

  if(setting instanceof IListOfPropObjects){

  }

  if(typeof urlManager.currentValue === "boolean"){

  }
  if(typeof urlManager.currentValue === "object"){
    urlManager.currentValue.key
    if(urlManager.currentValue instanceof PositionsToStyle){
      urlManager.currentValue.key
    }
  }
  
  return (
    <>
      <label>{urlManager.propName}</label>
      <select
        value={sortBy.key}
        onChange={(e) =>{
          const sb = SequenceSorter.fromKey(e.target.value)!;
          setState({
            ...state,
            sortBy: sb,
          })
          urlAndLocalStorageInputs.SORT_BY.onChange(sb);
        }}
      >
        {sorters.map((sso) => {
          return (
            <option value={sso.key} key={sso.key}>
              {sso.description}
            </option>
          );
        })}
      </select>
    </>
  );
}*/


//type StaticImplements<S, C extends S> = any;
//interface IPropObjectInstance {
//  key: string;
//  description: string;
//}
//interface IPropObjectStaticMethods {
//  list: IPropObjectInstance[];
//  serialize: (instance: IPropObjectInstance) => string;
//  deserialize: (key: string) => IPropObjectInstance | undefined;
//}
//class ResiToStyle implements StaticImplements<
//  IPropObjectStaticMethods, typeof ResiToStyle
//>{
//  constructor(
//    public readonly key: string,
//    public readonly description: string
//  ){}
//
//  static ALL = new ResiToStyle("all", "Style All Residues");
//  static list = [
//    ResiToStyle.ALL
//  ];
//
//  static serialize(instance: ResiToStyle){
//    return instance.key;
//  };
//  static deserialize(key: string){
//    return ResiToStyle.list.find(o => o.key === key);
//  }
//}


/*
type StaticImplements<S, C extends S> = any;
interface IPropObjectInstance {
  key: string;
  description: string;
}
interface IPropObjectStaticMethods {
  list: () => IPropObjectInstance[];
  serialize: (instance: IPropObjectInstance) => string;
  deserialize: (key: string) => IPropObjectInstance | undefined;
}

type mytype = StaticImplements<
  IPropObjectStaticMethods, typeof BaseGlobalObjectPropClass
>

export abstract class BaseGlobalObjectPropClass implements mytype{
  constructor(
    public readonly key: string,
    public readonly description: string,
    excludeFromList?: boolean
  ){
    if(!excludeFromList){
      BaseGlobalObjectPropClass._INSTANCES.push(this);
    }
  }

  static serialize(instance: BaseGlobalObjectPropClass){
    return instance.key;
  };
  static deserialize(key: string){
    return BaseGlobalObjectPropClass.list().find(o => o.key === key);
  }

  //these will include every single instance of implementing 
  //classes created. What we really want is for instances to
  //be specific for a particular base class.
  private static _INSTANCES: BaseGlobalObjectPropClass[] = [];
  static list = () => {
    return this._INSTANCES;
  };
}

class ImplementedClass extends BaseClass{
  private constructor(
    public readonly key: string,
    public readonly description: string,
    public readonly className: string,
    excludeFromList?: boolean
  ){
    super(key, description, excludeFromList);
  }

  static ALL = new ImplementedClass("all", "desc", "my-classname");
  static ANOTHER = new ImplementedClass("another", "desc2", "my-classname-2");
  static YET_ANOTHER = new ImplementedClass("yet another", "desc3", "my-classname-3", false);
}
const z = ImplementedClass.ALL;
console.log("ImplementedClass.ALL_CREATED:", ImplementedClass.list());
*/
