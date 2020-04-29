/**
 * AceAlignmentMode.js
 * This file defines an alignment highlight mode form ace editor documents.
 */

import { default as ace } from "ace-builds";
import { Alignment } from "./Alignment";
import { getLetterClassNames } from "./MolecularStyles";

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
       * to each character. Note that characters will be grouped together
       * if they match the same rule and are side by side.
       */
      var AlignmentHighlightRules = function (this: any) {
        //We define an alignment-specific set of rules that will
        //add classes including whether a character matches the
        //consensus sequence, matches the query etc.
        let rules: {
          [key: string]: {
            token: (letter: string) => void;
            regex: RegExp;
            next: string;
          }[];
        } = {};

        //note: this is by far the thing that kills performance the most
        //      I'm not sure whether it is due to how it parses (state machine)
        //      slowing things down, or whether it is an issue with attaching
        //      ~4 classes to every single residue -- either way, removing parsing
        //      all together makes it much more snappy and also decreases the
        //      memory footprint drastically.
        const re = /./;
        const statePrefix = "p";
        for (let i = 0; i < alignment.getMaxSequenceLength(); i++) {
          const stateName = i === 0 ? "start" : statePrefix + i;
          const nextStateName =
            i === alignment.getMaxSequenceLength() - 1
              ? "start"
              : statePrefix + (i + 1);

          rules[stateName] = [
            {
              token: function (letter: string) {
                const toreturn = getLetterClassNames(
                  letter,
                  letter === alignment.getConsensus()[i].letter,
                  letter === alignment.getTargetSequence().sequence[i],
                  true
                );
                return toreturn;
              },
              regex: re,
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
