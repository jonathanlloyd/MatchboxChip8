var assert = require('assert');
var rewire = require('rewire');

var MatchboxChip8 = rewire('../src/MatchboxChip8');

describe('interpreter', function() {
    it('00E0 - should clear the display', function() {
        var testProgram = [
            0x00,
            0xe0,
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.setPixel(0, 0, 1)
        interpreter.loadInstructions(testProgram);

        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        for(var x = 0; x < 64; x += 1) {
            for(var y = 0; y < 32; y += 1) {
              var pixel = interpreter.getPixel(x, y);
              assert.equal(pixel, 0);
            }
        }
    });

    it('00EE - should return from subroutine', function() {
        var testReturnAddress = 100;

        var testProgram = [
            0x00,
            0xee,
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.pushStack(testReturnAddress);

        var oldStackTop = interpreter.stack[0];
        var oldSP = interpreter.SP;

        interpreter.loadInstructions(testProgram);
        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        assert.equal(
            interpreter.PC,
            oldStackTop,
            'Program counter should equal old top of stack'
        );
        assert.equal(
            interpreter.SP,
            oldSP - 1,
            'Stack pointer should be decremented by 1'
        );
    });

    it('1nnn - should jump to address', function() {
        var testTargetAddress = 0x123;

        var testProgram = [
            0x11,
            0x23
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.loadInstructions(testProgram);

        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        assert.equal(
            interpreter.PC,
            testTargetAddress,
            'Program counter should equal target address'
        );
    });

    it('2nnn - should call subroutine', function() {
        var testTargetAddress = 0x123;

        var testProgram = [
            0x21,
            0x23
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.loadInstructions(testProgram);

        var oldPC = interpreter.PC;
        var oldSP = interpreter.SP;

        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        assert.equal(
            interpreter.SP,
            oldSP + 1,
            'Stack pointer should increase by 1'
        );
        assert.equal(
            interpreter.stack[0],
            oldPC,
            'Top of stack should equal old program counter value'
        );
        assert.equal(
            interpreter.PC,
            testTargetAddress,
            'Program counter should equal target address'
        );
    });

    it('3xkk - should skip if immediate value equal (equal)', function() {
        var testRegisterNumber = 0xA;
        var testOperand = 0x10;

        var testProgram = [
            0x3a,
            0x10
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        var oldPC = interpreter.PC;
        interpreter.registers[testRegisterNumber] = testOperand;

        interpreter.loadInstructions(testProgram);
        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        assert.equal(
            interpreter.PC,
            oldPC + 4,
            'Program counter should increase by 4'
        );
    });

    it('3xkk - should skip if immediate value equal (not equal)', function() {
        var testRegisterNumber = 0xA;
        var testOperand = 0x10;

        var testProgram = [
            0x3a,
            0x10
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        var oldPC = interpreter.PC;
        interpreter.registers[testRegisterNumber] = testOperand + 1;

        interpreter.loadInstructions(testProgram);
        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        assert.equal(
            interpreter.PC,
            oldPC + 2,
            'Program counter should increase by 2'
        );
    });

    it('4xkk - should skip if immediate value not equal (equal)', function() {
        var testRegisterNumber = 0xA;
        var testOperand = 0x10;

        var testProgram = [
            0x4a,
            0x10
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        var oldPC = interpreter.PC;
        interpreter.registers[testRegisterNumber] = testOperand;

        interpreter.loadInstructions(testProgram);
        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        assert.equal(
            interpreter.PC,
            oldPC + 2,
            'Program counter should increase by 2'
        );
    });

    it('4xkk - should skip if i\' value not equal (not equal)', function() {
        var testRegisterNumber = 0xA;
        var testOperand = 0x10;

        var testProgram = [
            0x4a,
            0x10
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        var oldPC = interpreter.PC;
        interpreter.registers[testRegisterNumber] = testOperand + 1;

        interpreter.loadInstructions(testProgram);
        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        assert.equal(
            interpreter.PC,
            oldPC + 4,
            'Program counter should increase by 4'
        );
    });

    it('5xy0 - should skip if register value equal (equal)', function() {
        var registerXNum = 0xA;
        var registerYNum = 0x1;
        var registerXValue = registerYValue = 0x1;

        var testProgram = [
            0x5a,
            0x10
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        var oldPC = interpreter.PC;
        interpreter.registers[registerXNum] = registerXValue;
        interpreter.registers[registerYNum] = registerYValue;

        interpreter.loadInstructions(testProgram);
        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        assert.equal(
            interpreter.PC,
            oldPC + 4,
            'Program counter should increase by 4'
        );
    });

    it('5xy0 - should skip if register value equal (not equal)', function() {
        var registerXNum = 0xA;
        var registerYNum = 0x1;
        var registerXValue = 0x1;
        var registerYValue = 0x2;

        var testProgram = [
            0x5a,
            0x10
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        var oldPC = interpreter.PC;
        interpreter.registers[registerXNum] = registerXValue;
        interpreter.registers[registerYNum] = registerYValue;

        interpreter.loadInstructions(testProgram);
        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        assert.equal(
            interpreter.PC,
            oldPC + 2,
            'Program counter should increase by 2'
        );
    });

    it('6xkk - should load byte into register', function() {
        var registerXNum = 0x0;
        var byteValue = 0x11;

        var testProgram = [
            0x60,
            0x11
        ];

        var interpreter = new MatchboxChip8.Interpreter();

        interpreter.loadInstructions(testProgram);
        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        assert.equal(
            interpreter.registers[registerXNum],
            byteValue,
            'Register X value should equal byte value'
        );
    });

    it('7xkk - should add byte value to register', function() {
        var registerXNum = 0x0;
        var registerXValue = 0x1;
        var byteValue = 0x11;

        var testProgram = [
            0x70,
            0x11
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.registers[registerXNum] = registerXValue;

        interpreter.loadInstructions(testProgram);
        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        assert.equal(
            interpreter.registers[registerXNum],
            byteValue + registerXValue,
            'Register X value should equal byte value + old value'
        );
    });

    it('8xy0 - should load register y into register x', function() {
        var registerXNum = 0x0;
        var registerYNum = 0x1;
        var registerXValue = 0x0;
        var registerYValue = 0xA;

        var testProgram = [
            0x80,
            0x10
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.registers[registerXNum] = registerXValue;
        interpreter.registers[registerYNum] = registerYValue;

        interpreter.loadInstructions(testProgram);
        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        assert.equal(
            interpreter.registers[registerXNum],
            registerYValue,
            'Register X value should equal register Y value'
        );
    });

    it('8xy1 - should OR register y into register x', function() {
        var registerXNum = 0x0;
        var registerYNum = 0x1;
        var registerXValue = 0xA;
        var registerYValue = 0xB;

        var testProgram = [
            0x80,
            0x11
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.registers[registerXNum] = registerXValue;
        interpreter.registers[registerYNum] = registerYValue;

        interpreter.loadInstructions(testProgram);
        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        assert.equal(
            interpreter.registers[registerXNum],
            registerYValue | registerXValue,
            'Register X value should equal ry OR rx'
        );
    });

    it('8xy2 - should AND register y into register x', function() {
        var registerXNum = 0x0;
        var registerYNum = 0x1;
        var registerXValue = 0xA;
        var registerYValue = 0xB;

        var testProgram = [
            0x80,
            0x12
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.registers[registerXNum] = registerXValue;
        interpreter.registers[registerYNum] = registerYValue;

        interpreter.loadInstructions(testProgram);
        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        assert.equal(
            interpreter.registers[registerXNum],
            registerYValue & registerXValue,
            'Register X value should equal ry AND rx'
        );
    });

    it('8xy3 - should XOR register y into register x', function() {
        var registerXNum = 0x0;
        var registerYNum = 0x1;
        var registerXValue = 0xA;
        var registerYValue = 0xB;

        var testProgram = [
            0x80,
            0x13
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.registers[registerXNum] = registerXValue;
        interpreter.registers[registerYNum] = registerYValue;

        interpreter.loadInstructions(testProgram);
        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        assert.equal(
            interpreter.registers[registerXNum],
            registerYValue ^ registerXValue,
            'Register X value should equal ry XOR rx'
        );
    });

    it('8xy4 - should ADD register y into register x (no carry)', function() {
        var registerXNum = 0x0;
        var registerYNum = 0x1;
        var registerXValue = 0x01;
        var registerYValue = 0x03;

        var testProgram = [
            0x80,
            0x14
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.registers[registerXNum] = registerXValue;
        interpreter.registers[registerYNum] = registerYValue;

        interpreter.loadInstructions(testProgram);
        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        assert.equal(
            interpreter.registers[registerXNum],
            registerYValue + registerXValue,
            'Register X value should equal ry ADD rx'
        );

        assert.equal(
            interpreter.registers[0xF],
            0,
            'Register 0xF value (carry bit) should equal 0'
        );
    });

    it('8xy4 - should ADD register y into register x (carry)', function() {
        var registerXNum = 0x0;
        var registerYNum = 0x1;
        var registerXValue = 0xFF;
        var registerYValue = 0x04;

        var testProgram = [
            0x80,
            0x14
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.registers[registerXNum] = registerXValue;
        interpreter.registers[registerYNum] = registerYValue;

        interpreter.loadInstructions(testProgram);
        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        assert.equal(
            interpreter.registers[registerXNum],
            registerYValue - 1,
            'Register X value should equal ry - 1'
        );

        assert.equal(
            interpreter.registers[0xF],
            1,
            'Register 0xF value (carry bit) should equal 1'
        );
    });

    it('8xy5 - should SUB register y from r\' x (no borrow)', function() {
        var registerXNum = 0x0;
        var registerYNum = 0x1;
        var registerXValue = 0x05;
        var registerYValue = 0x04;

        var testProgram = [
            0x80,
            0x15
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.registers[registerXNum] = registerXValue;
        interpreter.registers[registerYNum] = registerYValue;

        interpreter.loadInstructions(testProgram);
        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        assert.equal(
            interpreter.registers[registerXNum],
            0x01,
            'Register X value should equal rx - ry'
        );

        assert.equal(
            interpreter.registers[0xF],
            0,
            'Register 0xF value (borrow bit) should equal 0'
        );
    });

    it('8xy5 - should SUB register y from r\' x (borrow)', function() {
        var registerXNum = 0x0;
        var registerYNum = 0x1;
        var registerXValue = 0x04;
        var registerYValue = 0x05;

        var testProgram = [
            0x80,
            0x15
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.registers[registerXNum] = registerXValue;
        interpreter.registers[registerYNum] = registerYValue;

        interpreter.loadInstructions(testProgram);
        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        assert.equal(
            interpreter.registers[registerXNum],
            0x01,
            'Register X value should equal abs(rx - ry)'
        );

        assert.equal(
            interpreter.registers[0xF],
            1,
            'Register 0xF value (borrow bit) should equal 1'
        );
    });

    it('8xy6 - should bit shift right register x (no overflow)', function() {
        var registerXNum = 0x0;
        var registerXValue = 0x04;

        var testProgram = [
            0x80,
            0x16
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.registers[registerXNum] = registerXValue;

        interpreter.loadInstructions(testProgram);
        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        assert.equal(
            interpreter.registers[registerXNum],
            0x02,
            'Register X value should equal 2'
        );

        assert.equal(
            interpreter.registers[0xF],
            0,
            'Register 0xF value (overflow bit) should equal 0'
        );
    });

    it('8xy6 - should bit shift right register x (overflow)', function() {
        var registerXNum = 0x0;
        var registerXValue = 0x05;

        var testProgram = [
            0x80,
            0x16
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.registers[registerXNum] = registerXValue;

        interpreter.loadInstructions(testProgram);
        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        assert.equal(
            interpreter.registers[registerXNum],
            0x02,
            'Register X value should equal 2'
        );

        assert.equal(
            interpreter.registers[0xF],
            1,
            'Register 0xF value (overflow bit) should equal 1'
        );
    });

    it('8xy7 - should SUBN register y from r\' x (no borrow)', function() {
        var registerXNum = 0x0;
        var registerYNum = 0x1;
        var registerXValue = 0x05;
        var registerYValue = 0x04;

        var testProgram = [
            0x80,
            0x17
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.registers[registerXNum] = registerXValue;
        interpreter.registers[registerYNum] = registerYValue;

        interpreter.loadInstructions(testProgram);
        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        assert.equal(
            interpreter.registers[registerXNum],
            0x01,
            'Register X value should equal rx - ry'
        );

        assert.equal(
            interpreter.registers[0xF],
            1,
            'Register 0xF value (borrow bit) should equal 1'
        );
    });

    it('8xy7 - should SUBN register y from r\' x (borrow)', function() {
        var registerXNum = 0x0;
        var registerYNum = 0x1;
        var registerXValue = 0x04;
        var registerYValue = 0x05;

        var testProgram = [
            0x80,
            0x17
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.registers[registerXNum] = registerXValue;
        interpreter.registers[registerYNum] = registerYValue;

        interpreter.loadInstructions(testProgram);
        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        assert.equal(
            interpreter.registers[registerXNum],
            0x01,
            'Register X value should equal abs(rx - ry)'
        );

        assert.equal(
            interpreter.registers[0xF],
            0,
            'Register 0xF value (borrow bit) should equal 0'
        );
    });

    it('8xyE - should bit shift left register x (no overflow)', function() {
        var registerXNum = 0x0;
        var registerXValue = 0x7f;

        var testProgram = [
            0x80,
            0x1e
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.registers[registerXNum] = registerXValue;

        interpreter.loadInstructions(testProgram);
        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        assert.equal(
            interpreter.registers[registerXNum],
            0xfe,
            'Register X value should equal 0x3f'
        );

        assert.equal(
            interpreter.registers[0xF],
            0,
            'Register 0xF value (overflow bit) should equal 0'
        );
    });

    it('8xyE - should bit shift left register x (overflow)', function() {
        var registerXNum = 0x0;
        var registerXValue = 0x80;

        var testProgram = [
            0x80,
            0x1e
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.registers[registerXNum] = registerXValue;

        interpreter.loadInstructions(testProgram);
        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        assert.equal(
            interpreter.registers[registerXNum],
            0x00,
            'Register X value should equal 0x40'
        );

        assert.equal(
            interpreter.registers[0xF],
            1,
            'Register 0xF value (overflow bit) should equal 1'
        );
    });

    it('9xy0 - should skip if r\'x != r\'y (equal)', function() {
        var registerXNum = 0xA;
        var registerYNum = 0x1;
        var registerXValue = 0x1;
        var registerYValue = 0x1;

        var testProgram = [
            0x9a,
            0x10
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        var oldPC = interpreter.PC;
        interpreter.registers[registerXNum] = registerXValue;
        interpreter.registers[registerYNum] = registerYValue;

        interpreter.loadInstructions(testProgram);
        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        assert.equal(
            interpreter.PC,
            oldPC + 2,
            'Program counter should increase by 2'
        );
    });

    it('9xy0 - should skip if r\'x != r\'y (not equal)', function() {
        var registerXNum = 0xA;
        var registerYNum = 0x1;
        var registerXValue = 0x2;
        var registerYValue = 0x1;

        var testProgram = [
            0x9a,
            0x10
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        var oldPC = interpreter.PC;
        interpreter.registers[registerXNum] = registerXValue;
        interpreter.registers[registerYNum] = registerYValue;

        interpreter.loadInstructions(testProgram);
        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        assert.equal(
            interpreter.PC,
            oldPC + 4,
            'Program counter should increase by 4'
        );
    });

    it('Annn - should set ri to nnn', function() {
        var value = 0x123;

        var testProgram = [
            0xa1,
            0x23
        ];

        var interpreter = new MatchboxChip8.Interpreter();

        interpreter.loadInstructions(testProgram);
        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        assert.equal(
            interpreter.I,
            value,
            'Register I should equal value'
        );
    });

    it('Bnnn - should jump to r\'0 + nnn', function() {
        var value = 0x123;
        var register0Value = 0x2;

        var testProgram = [
            0xb1,
            0x23
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.registers[0] = register0Value;

        interpreter.loadInstructions(testProgram);
        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        assert.equal(
            interpreter.PC,
            register0Value + value,
            'PC should equal register 0 value + nnn value'
        );
    });

    it('Cxkk - should set r\'x to rand(0-255) AND kk', function() {
        var testRandNum = 0x02;

        MatchboxChip8.__with__({
            randRange: function(min, max) {
                return testRandNum;
            }
        })(function () {

            var registerXNum = 0x0;
            var value = 0x0F;

            var testProgram = [
                0xc0,
                0x0f
            ];

            var interpreter = new MatchboxChip8.Interpreter();

            interpreter.loadInstructions(testProgram);
            for(var i = 0; i < testProgram.length / 2; i += 1) {
                interpreter.step();
            };

            assert.equal(
                interpreter.registers[registerXNum],
                0x02,
                'r\'0 should equal 0x02'
            );

        });
    });

    it('Dxyn - should draw n byte sprite from I at x y', function() {
        var I = 0x0;
        var registerXNum = 0x0;
        var registerXValue = 0x1;
        var registerYNum = 0x1;
        var registerYValue = 0x2;
        var n = 0x8;

        var testProgram = [
            0xd0,
            0x15
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.loadInstructions(testProgram);

        interpreter.registers[registerXNum] = registerXValue;
        interpreter.registers[registerYNum] = registerYValue;
        interpreter.I = I;

        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        var expectedPixels = [
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 1, 1, 1, 1, 0, 0, 0],
            [0, 1, 0, 0, 1, 0, 0, 0],
            [0, 1, 0, 0, 1, 0, 0, 0],
            [0, 1, 0, 0, 1, 0, 0, 0],
            [0, 1, 1, 1, 1, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0]
        ];

        var resultPixels = [];
        for (var xCoord = 0; xCoord < expectedPixels[0].length; xCoord += 1) {
            var row = [];
            for(var yCoord = 0; yCoord < expectedPixels.length; yCoord += 1) {
                row.push(interpreter.getPixel(yCoord, xCoord));
            }
            resultPixels.push(row);
        }

        var expectedPixelsStr = JSON.stringify(expectedPixels);
        var resultPixelsStr = JSON.stringify(resultPixels);

        assert.equal(
            expectedPixelsStr,
            resultPixelsStr,
            '0 sprite should be drawn'
        );
    });

    it('Dxyn - should draw n byte sprite from I at x y (wrap)', function() {
        var I = 0x0;
        var registerXNum = 0x0;
        var registerXValue = 0x3e;
        var registerYNum = 0x1;
        var registerYValue = 0x2;
        var n = 0x8;

        var testProgram = [
            0xd0,
            0x15
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.loadInstructions(testProgram);

        interpreter.registers[registerXNum] = registerXValue;
        interpreter.registers[registerYNum] = registerYValue;
        interpreter.I = I;

        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        var expectedPixels = [
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [1, 1, 0, 0, 0, 0, 0, 0],
            [0, 1, 0, 0, 0, 0, 0, 0],
            [0, 1, 0, 0, 0, 0, 0, 0],
            [0, 1, 0, 0, 0, 0, 0, 0],
            [1, 1, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0]
        ];

        var resultPixels = [];
        for (var xCoord = 0; xCoord < expectedPixels[0].length; xCoord += 1) {
            var row = [];
            for(var yCoord = 0; yCoord < expectedPixels.length; yCoord += 1) {
                row.push(interpreter.getPixel(yCoord, xCoord));
            }
            resultPixels.push(row);
        }

        var expectedPixelsStr = JSON.stringify(expectedPixels);
        var resultPixelsStr = JSON.stringify(resultPixels);

        assert.equal(
            expectedPixelsStr,
            resultPixelsStr,
            'Wrapped 0 sprite should be drawn'
        );
    });

    it('Dxyn - should draw sprites with collision', function() {
        var testProgram = [
            0xD0,
            0x15,
            0x60,
            0x02,
            0xD0,
            0x15
        ];

        var interpreter = new MatchboxChip8.Interpreter();

        interpreter.loadInstructions(testProgram);
        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        var expectedPixels = [
            [1, 1, 0, 0, 1, 1, 0, 0],
            [1, 0, 1, 1, 0, 1, 0, 0],
            [1, 0, 1, 1, 0, 1, 0, 0],
            [1, 0, 1, 1, 0, 1, 0, 0],
            [1, 1, 0, 0, 1, 1, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0]
        ];

        var resultPixels = [];
        for (var xCoord = 0; xCoord < expectedPixels[0].length; xCoord += 1) {
            var row = [];
            for(var yCoord = 0; yCoord < expectedPixels.length; yCoord += 1) {
                row.push(interpreter.getPixel(yCoord, xCoord));
            }
            resultPixels.push(row);
        }

        var expectedPixelsStr = JSON.stringify(expectedPixels);
        var resultPixelsStr = JSON.stringify(resultPixels);

        assert.equal(
            expectedPixelsStr,
            resultPixelsStr,
            'XORed sprite should be drawn'
        )

        assert.equal(
            interpreter.registers[0xF],
            1,
            'Collision bit should be set'
        );
;
    });

    it('Ex9E - should skip if key is pressed (pressed)', function() {
        var registerXNum = 5;
        var registerXValue = 1;
        var testProgram = [
            0xe5,
            0x9e
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.loadInstructions(testProgram);

        interpreter.registers[registerXNum] = registerXValue;
        interpreter.keyDown(registerXValue);
        var oldPC = interpreter.PC;

        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        assert.equal(
            interpreter.PC,
            oldPC + 4,
            'PC should equal old value + 4'
        );
    });

    it('Ex9E - should skip if key is pressed (not pressed)', function() {
        var registerXNum = 5;
        var registerXValue = 1;
        var testProgram = [
            0xe0,
            0x9e
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.loadInstructions(testProgram);

        interpreter.registers[registerXNum] = registerXValue;
        var oldPC = interpreter.PC;

        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        assert.equal(
            interpreter.PC,
            oldPC + 2,
            'PC should equal old value + 2'
        );
    });

    it('ExA1 - should skip if key is not pressed (pressed)', function() {
        var registerXNum = 5;
        var registerXValue = 1;
        var testProgram = [
            0xe5,
            0xa1
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.loadInstructions(testProgram);

        interpreter.registers[registerXNum] = registerXValue;
        interpreter.keyDown(registerXValue);
        var oldPC = interpreter.PC;

        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        assert.equal(
            interpreter.PC,
            oldPC + 2,
            'PC should equal old value + 2'
        );
    });

    it('ExA1 - should skip if key is not pressed (not pressed)', function() {
        var registerXNum = 5;
        var registerXValue = 1;
        var testProgram = [
            0xe5,
            0xa1
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.loadInstructions(testProgram);

        interpreter.registers[registerXNum] = registerXValue;
        interpreter.keyDown(registerXValue);
        interpreter.keyUp(registerXValue);
        var oldPC = interpreter.PC;

        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        assert.equal(
            interpreter.PC,
            oldPC + 4,
            'PC should equal old value + 4'
        );
    });

});

