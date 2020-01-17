/** 
 * AceAlignmentMode.js
 * This file defines an alignment highlight mode form ace editor documents.
 */
import ace from 'ace-builds'
ace.define('ace/mode/alignment_highlight_rules', function(require, exports, module) {
  "use strict";
  
    var oop = require("../lib/oop");
    var TextHighlightRules = require("./text_highlight_rules").TextHighlightRules;
  
    var AlignmentHighlightRules = function() {
  
      // regexp must not have capturing parentheses. Use (?:) instead.
      // regexps are ordered -> the first match is used
  
      this.$rules = {
          "start" : [
              {
                  token: "Unaligned",
                  regex: "\\."
              },
              {
                  token: "Gap",
                  regex: "-"
              },
              {
                  token: "Alanine",
                  regex: "a|A"
              },
              {
                  token: "Arginine",
                  regex: "r|R"
              },
              {
                  token: "Asparagine",
                  regex: "n|N"
              },
              {
                  token: "AsparticAcid",
                  regex: "d|D"
              },
              {
                  token: "Cysteine",
                  regex: "c|C"
              },
              {
                  token: "Glutamine",
                  regex: "q|Q"
              },
              {
                  token: "GlutamicAcid",
                  regex: "e|E"
              },
              {
                  token: "Glycine",
                  regex: "g|G"
              },
              {
                  token: "Histidine",
                  regex: "h|H"
              },
              {
                  token: "Isoleucine",
                  regex: "i|I"
              },
              {
                  token: "Leucine",
                  regex: "l|L"
              },
              {
                  token: "Lysine",
                  regex: "k|K"
              },
              {
                  token: "Methionine",
                  regex: "m|M"
              },
              {
                  token: "Phenylalanine",
                  regex: "f|F"
              },
              {
                  token: "Proline",
                  regex: "p|P"
              },
              {
                  token: "Serine",
                  regex: "s|S"
              },
              {
                  token: "Threonine",
                  regex: "t|T"
              },
              {
                  token: "Tryptophan",
                  regex: "w|W"
              },
              {
                  token: "Tyrosine",
                  regex: "y|Y"
              },
              {
                  token: "Valine",
                  regex: "v|V"
              },
          ],
       };
    };
  
    oop.inherits(AlignmentHighlightRules, TextHighlightRules);
  
    exports.AlignmentHighlightRules = AlignmentHighlightRules;
  });
  
  
  
  ace.define('ace/mode/alignment', function(require, exports, module) {
    var oop = require("../lib/oop");
    var TextMode = require("../mode/text").Mode;
    var Tokenizer = require("../tokenizer").Tokenizer;
    var AlignmentHighlightRules = require("ace/mode/alignment_highlight_rules").AlignmentHighlightRules;
  
    var Mode = function() {
      this.$tokenizer = new Tokenizer(new AlignmentHighlightRules().getRules());
    };
    oop.inherits(Mode, TextMode);
  
    (function() {
      // Extra logic goes here. (see below)
    }).call(Mode.prototype);
  
    exports.Mode = Mode;
  });
  
  