"use strict";

/**
 * Disassembly
 * Disassemble binary ROM files into an array of numeric instructions
 * @module disassembly
 */

var jBinary = require("jbinary");

var TYPESET = {
  "jBinary.all": ['array', 'uint16'],
}


/**
 * Disassemble the given ROM binary and return a list of numeric instructions
 * @param {File || string} rom - A File Object containing the ROM data or
 *     a URL to such a file.
 * @param {function} callback - Callback which will be called with the
 *     disassembled data
 */
function disassemble(rom, callback) {
    jBinary.load(rom, TYPESET, function (err, binary) {
        var instructions = binary.readAll();
        if(err) {
            callback(null);
        } else {
            callback(instructions);
        }
    });
}


function instructionToHexString(instruction) {
    var hexString = instruction.toString(16);
    var numberMissingChars = 4 - hexString.length;
    for(var i = 0; i < numberMissingChars; i += 1) {
        hexString = "0" + hexString;
    }
    return hexString;
}


module.exports = {
    disassemble: disassemble,
    instructionToHexString: instructionToHexString
}
