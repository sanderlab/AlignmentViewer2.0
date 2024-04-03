/**
 * A base class for generating global objects that are passed as 
 * props and are serializable to the url and local storage, e.g.,
 * implementing classes include ResidueColoring, PositionsToStyle, etc.
 */


export interface IPropObjectInstanceInList{
  key: string;
  description: string;
}

//
// the standard property list object
//
export function IListOfPropObjects<T extends IPropObjectInstanceInList>(
  allProps: T[]
){
  return {
    list: allProps,
    //serial an object using the key property - must exist in all props 
    //or returns null
    serialize: (obj: T) => {
      return allProps.find(s => s === obj)?.key;
    },
    deserialize: (key: string) => {
      return allProps.find(s => s.key === key);
    }
  }
}



/* first try:
//typescript definitions - confusing way of forcing 
interface IPropObjectInstance {
  key: string;
  description: string;
}

// original implementation had this confusing typescript definitions to
// for the static implementation in the derived class, but in the end
// we are able to do a simple abstract base class.
//
type StaticImplements<S, C extends S> = any;
interface IPropObjectStaticMethods {
  list: () => IPropObjectInstance[];
  serialize: (instance: IPropObjectInstance) => string;
  deserialize: (key: string) => IPropObjectInstance | undefined;
}

//export abstract class BaseGlobalObject implements IPropObjectInstance{
export abstract class BaseGlobalObject implements StaticImplements<
  IPropObjectStaticMethods, typeof BaseGlobalObject
>{

  constructor(
    public readonly key: string,
    public readonly description: string,
    excludeFromList?: boolean
  ){
    if(!excludeFromList){
      BaseGlobalObject._INSTANCES.push(this);
    }
  }

  static serialize(instance: BaseGlobalObject){
    return instance.key;
  };
  static deserialize(key: string){
    return BaseGlobalObject.list().find(o => o.key === key);
  }

  private static _INSTANCES: BaseGlobalObject[] = [];
  static list = () => {
    return this._INSTANCES;
  };
}*/