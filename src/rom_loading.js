"use strict";

/**
 * ROM Loading
 * Load binary rom file and decode it into an array of integer opcode values
 * @module rom_loading
 */

var jBinary = require("jbinary");

var TYPESET = {
  "jBinary.all": ['array', 'uint16'],
};


/**
 * Load and decode the given ROM binary and return a list of numeric
 * instructions
 * @param {File || string} rom - A File Object containing the ROM data or
 *     a URL to such a file.
 * @param {function} callback - Callback which will be called with the
 *     disassembled data
 */
function load_rom(rom, callback) {
    jBinary.load(rom, TYPESET, function (err, binary) {
        var instructions = binary.readAll();
        if(err) {
            callback(null);
        } else {
            callback(instructions);
        }
    });
}

module.exports = {
    load_rom: load_rom
};
