/**
 * Disassembly
 * Disassemble binary ROM files into an array of numerical data
 * @module disassembly
 */

var jBinary = require("jbinary");

var TYPESET = {
  "jBinary.all": ['array', 'uint16'],
}


/**
 * Disassemble the given ROM binary and return a list of numeric opcodes
 * @param {File || string} rom - A File Object containing the ROM data or
 *     a URL to such a file.
 * @param {function} callback - Callback which will be called with the
 *     disassembled data
 */
function disassemble(rom, callback) {
    jBinary.load(rom, TYPESET, function (err, binary) {
        var romData = binary.readAll();
        if(err) {
            callback(null);
        } else {
            callback(romData);
        }
    });
}

module.exports = {
    disassemble: disassemble
}
