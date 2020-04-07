/**
 * AceAlignmentMode.js
 * This file defines an alignment highlight mode form ace editor documents.
 */

import { default as ace } from "ace-builds";
import Alignment from "./Alignment";
import { getClassNamesForAce } from "./MolecularStyles";

interface IAceType {
  [key: string]: any;
}

export function defineNewAlignmentMode(mode: string, alignment: Alignment) {
  const modeSplit = mode.split("/");
  if (
    modeSplit.length !== 3 ||
    modeSplit[0] !== "ace" ||
    modeSplit[1] !== "mode"
  ) {
    throw Error("ace mode name must be of the form '/ace/mode/MODENAME'");
  }
  const modeName = mode.split("/")[2];

  (ace as IAceType).define(
    "ace/mode/" + modeName + "_highlight_rules",
    function (require: Function, exports: any, module: any) {
      var oop = require("../lib/oop");
      var TextHighlightRules = require("./text_highlight_rules")
        .TextHighlightRules;

      /**
       * Rules parse individual characters in the editor and assign classes
       * to each character. Note that characters may be grouped together
       * if they match the same rule and are side by side.
       */
      var AlignmentHighlightRules = function (this: any) {
        //We define an alignment-specific set of rules that will
        //add other tags such as whether a character matches the
        //consensus sequence.
        let rules: {
          [key: string]: {
            token: (letter: string) => void;
            regex: string;
            next: string;
          }[];
        } = {};

        for (let i = 0; i < alignment.getMaxSequenceLength(); i++) {
          const stateName = i === 0 ? "start" : "pos" + i;
          const nextStateName =
            i === alignment.getMaxSequenceLength() - 1
              ? "start"
              : "pos" + (i + 1);

          rules[stateName] = [
            {
              token: function (letter: string) {
                return getClassNamesForAce(
                  letter,
                  letter === alignment.getConsensus()[i].letter,
                  letter === alignment.getTargetSequence().sequence[i]
                );
              },
              regex: ".",
              next: nextStateName,
            },
          ];
        }
        this.$rules = rules;
      };

      oop.inherits(AlignmentHighlightRules, TextHighlightRules);

      exports.AlignmentHighlightRules = AlignmentHighlightRules;
    }
  );

  (ace as IAceType).define("ace/mode/" + modeName, function (
    require: Function,
    exports: any,
    module: any
  ) {
    var oop = require("../lib/oop");
    var TextMode = require("../mode/text").Mode;
    var Tokenizer = require("../tokenizer").Tokenizer;
    var AlignmentHighlightRules = require("ace/mode/" +
      modeName +
      "_highlight_rules").AlignmentHighlightRules;

    const Mode = function (this: any) {
      this.$tokenizer = new Tokenizer(new AlignmentHighlightRules().getRules());
    };

    oop.inherits(Mode, TextMode);

    (function () {
      // Extra logic goes here. (see below)
    }.call(Mode.prototype));

    exports.Mode = Mode;
  });
}
