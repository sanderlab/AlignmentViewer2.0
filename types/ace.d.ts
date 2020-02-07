import * as Ace from "ace-builds";
import { EventEmitter } from "events";

declare module "ace-builds" {
  namespace Ace {
    interface Editor extends OptionsProvider, EventEmitter {
      on(name: "mousemove", callback: (e: AceEvent) => void): Function;
      on(name: "mousedown", callback: (e: AceEvent) => void): Function;
    }

    interface VirtualRenderer extends Ace.OptionsProvider, EventEmitter {
      $cursorLayer: any;
      $padding: number;
      $size: {
        scrollerWidth: number;
      };
      characterWidth: number;
      characterHeight: number;
      $getLongestLine(): number;
    }
  }
}
