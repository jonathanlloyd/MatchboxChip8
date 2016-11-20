"use strict";

/**
 * Disassembly
 * Disassemble numeric opcode values
 * @module disassembly
 */

var INSTRUCTION_MAP = {
    "^00e0$": function (interpreter) {
        return function () {
            interpreter.clearDisplay();
        };
    },
    "^00ee$": function (interpreter) {
        return function () {
            interpreter.subroutineReturn();
        };
    },
    "^1(...)$": function (interpreter, matchResult) {
        var jumpAddress = parseInt(matchResult[1], 16);

        return function () {
            interpreter.jump(jumpAddress);
        };
    },
    "^2(...)$": function (interpreter, matchResult) {
        var callAddress = parseInt(matchResult[1], 16);

        return function () {
            interpreter.call(callAddress);
        };
    },
    "^3(.)(..)$": function (interpreter, matchResult) {
        var registerNumber = parseInt(matchResult[1], 16),
            immediateValue = parseInt(matchResult[2], 16);

        return function () {
            interpreter.skipEqualImmediate(registerNumber, immediateValue);
        };
    },
    "^4(.)(..)$": function (interpreter, matchResult) {
        var registerNumber = parseInt(matchResult[1], 16),
            immediateValue = parseInt(matchResult[2], 16);

        return function () {
            interpreter.skipNotEqualImmediate(registerNumber, immediateValue);
        };
    },
    "^5(.)(.)0$": function (interpreter, matchResult) {
        var registerNumberX = parseInt(matchResult[1], 16),
            registerNumberY = parseInt(matchResult[2], 16);

        return function () {
            interpreter.skipEqual(
                registerNumberX,
                registerNumberY
            );
        };
    },
    "^6(.)(..)$": function (interpreter, matchResult) {
        var registerNumber = parseInt(matchResult[1], 16),
            immediateValue = parseInt(matchResult[2], 16);

        return function () {
            interpreter.loadRegisterImmediate(
                registerNumber,
                immediateValue
            );
        };
    },
    "^7(.)(..)$": function (interpreter, matchResult) {
        var registerNumber = parseInt(matchResult[1], 16),
            immediateValue = parseInt(matchResult[2], 16);

        return function () {
            interpreter.addRegisterImmediate(
                registerNumber,
                immediateValue
            );
        };
    },
    "^8(.)(.)0$": function (interpreter, matchResult) {
        var registerNumberX = parseInt(matchResult[1], 16),
            registerNumberY = parseInt(matchResult[2], 16);

        return function () {
            interpreter.loadRegister(
                registerNumberX,
                registerNumberY
            );
        };
    },
    "^8(.)(.)1$": function (interpreter, matchResult) {
        var registerNumberX = parseInt(matchResult[1], 16),
            registerNumberY = parseInt(matchResult[2], 16);

        return function () {
            interpreter.orRegister(
                registerNumberX,
                registerNumberY
            );
        };
    },
    "^8(.)(.)2$": function (interpreter, matchResult) {
        var registerNumberX = parseInt(matchResult[1], 16),
            registerNumberY = parseInt(matchResult[2], 16);

        return function () {
            interpreter.andRegister(
                registerNumberX,
                registerNumberY
            );
        };
    },
    "^8(.)(.)3$": function (interpreter, matchResult) {
        var registerNumberX = parseInt(matchResult[1], 16),
            registerNumberY = parseInt(matchResult[2], 16);

        return function () {
            interpreter.xorRegister(
                registerNumberX,
                registerNumberY
            );
        };
    },
    "^8(.)(.)4$": function (interpreter, matchResult) {
        var registerNumberX = parseInt(matchResult[1], 16),
            registerNumberY = parseInt(matchResult[2], 16);

        return function () {
            interpreter.addRegister(
                registerNumberX,
                registerNumberY
            );
        };
    },
    "^8(.)(.)5$": function (interpreter, matchResult) {
        var registerNumberX = parseInt(matchResult[1], 16),
            registerNumberY = parseInt(matchResult[2], 16);

        return function () {
            interpreter.subRegister(
                registerNumberX,
                registerNumberY
            );
        };
    },
    "^8(.)(.)6$": function (interpreter, matchResult) {
        var registerNumberX = parseInt(matchResult[1], 16);

        return function () {
            interpreter.shrRegister(
                registerNumberX
            );
        };
    },
    "^8(.)(.)7$": function (interpreter, matchResult) {
        var registerNumberX = parseInt(matchResult[1], 16),
            registerNumberY = parseInt(matchResult[2], 16);

        return function () {
            interpreter.subnRegister(
                registerNumberX,
                registerNumberY
            );
        };
    },
    "^8(.)(.)e$": function (interpreter, matchResult) {
        var registerNumberX = parseInt(matchResult[1], 16);

        return function () {
            interpreter.shlRegister(
                registerNumberX
            );
        };
    },
    "^9(.)(.)0$": function (interpreter, matchResult) {
        var registerNumberX = parseInt(matchResult[1], 16),
            registerNumberY = parseInt(matchResult[2], 16);

        return function () {
            interpreter.skipNotEqual(
                registerNumberX,
                registerNumberY
            );
        };
    },
    "^a(...)$": function (interpreter, matchResult) {
        var value = parseInt(matchResult[1], 16);

        return function () {
            interpreter.setI(value);
        };
    },
    "^b(...)$": function (interpreter, matchResult) {
        var value = parseInt(matchResult[1], 16);

        return function () {
            interpreter.jumpPlus(value);
        };
    },
    "^c(.)(..)$": function (interpreter, matchResult) {
        var registerNumberX = parseInt(matchResult[1], 16),
            value = parseInt(matchResult[2], 16);

        return function () {
            interpreter.loadRand(registerNumberX, value);
        };
    },
    "^d(.)(.)(.)$": function (interpreter, matchResult) {
        var registerNumberX = parseInt(matchResult[1], 16),
            registerNumberY = parseInt(matchResult[2], 16),
            spriteHeight = parseInt(matchResult[3], 16);

        return function () {
            interpreter.drawSprite(
                registerNumberX,
                registerNumberY,
                spriteHeight
            );
        };
    },
    "^e(.)9e$": function (interpreter, matchResult) {
        var registerXNum = parseInt(matchResult[1], 16);

        return function () {
            interpreter.skipKeyPressed(registerXNum);
        };
    },
    "^e(.)a1$": function (interpreter, matchResult) {
        var registerXNum = parseInt(matchResult[1], 16);

        return function () {
            interpreter.skipKeyNotPressed(registerXNum);
        };
    },
    "^f(.)07$": function (interpreter, matchResult) {
        var registerXNum = parseInt(matchResult[1], 16);

        return function () {
            interpreter.setRegisterDT(registerXNum);
        };
    }
};


/**
 * Transform integer opcodes into zero-padded 4 character hex strings
 * @param {number} instruction - Numeric opcode value
 */
function instructionToHexString(instruction) {
    var hexString = instruction.toString(16),
        numberMissingChars = 4 - hexString.length;
    for (var i = 0; i < numberMissingChars; i += 1) {
        hexString = "0" + hexString;
    }
    return hexString;
}


module.exports = {
    INSTRUCTION_MAP: INSTRUCTION_MAP,
    instructionToHexString: instructionToHexString
};
