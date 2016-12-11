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
              assert.strictEqual(pixel, 0);
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

        assert.strictEqual(
            interpreter.PC,
            oldStackTop,
            'Program counter should equal old top of stack'
        );
        assert.strictEqual(
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

        assert.strictEqual(
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

        assert.strictEqual(
            interpreter.SP,
            oldSP + 1,
            'Stack pointer should increase by 1'
        );
        assert.strictEqual(
            interpreter.stack[0],
            oldPC + 2,
            'Top of stack should equal old program counter value plus 2'
        );
        assert.strictEqual(
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

        assert.strictEqual(
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

        assert.strictEqual(
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

        assert.strictEqual(
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

        assert.strictEqual(
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

        assert.strictEqual(
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

        assert.strictEqual(
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

        assert.strictEqual(
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

        assert.strictEqual(
            interpreter.registers[registerXNum],
            byteValue + registerXValue,
            'Register X value should equal byte value + old value'
        );
    });

    it('7xkk - should add byte value to register (overflow)', function() {
        var registerXNum = 0x0;
        var registerXValue = 0x2;
        var byteValue = 0xFF;

        var testProgram = [
            0x70,
            0xff
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.registers[registerXNum] = registerXValue;

        interpreter.loadInstructions(testProgram);
        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        assert.strictEqual(
            interpreter.registers[registerXNum],
            0x1,
            'Register X value should equal byte value + old value (wrapped)'
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

        assert.strictEqual(
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

        assert.strictEqual(
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

        assert.strictEqual(
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

        assert.strictEqual(
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

        assert.strictEqual(
            interpreter.registers[registerXNum],
            registerYValue + registerXValue,
            'Register X value should equal ry ADD rx'
        );

        assert.strictEqual(
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

        assert.strictEqual(
            interpreter.registers[registerXNum],
            registerYValue - 1,
            'Register X value should equal ry - 1'
        );

        assert.strictEqual(
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

        assert.strictEqual(
            interpreter.registers[registerXNum],
            0x01,
            'Register X value should equal rx - ry'
        );

        assert.strictEqual(
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

        assert.strictEqual(
            interpreter.registers[registerXNum],
            0x01,
            'Register X value should equal abs(rx - ry)'
        );

        assert.strictEqual(
            interpreter.registers[0xF],
            1,
            'Register 0xF value (borrow bit) should equal 1'
        );
    });

    it('8xy6 - should bit shift right register x (no overflow)', function() {
        var registerXNum = 0x0;
        var registerYNum = 0x1;
        var registerYValue = 0x04;

        var testProgram = [
            0x80,
            0x16
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.registers[registerYNum] = registerYValue;

        interpreter.loadInstructions(testProgram);
        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        assert.strictEqual(
            interpreter.registers[registerXNum],
            0x02,
            'Register X value should equal 2'
        );

        assert.strictEqual(
            interpreter.registers[registerYNum],
            0x04,
            'Register Y value should equal 4'
        );

        assert.strictEqual(
            interpreter.registers[0xF],
            0,
            'Register 0xF value (overflow bit) should equal 0'
        );
    });

    it('8xy6 - should bit shift right register x (overflow)', function() {
        var registerXNum = 0x0;
        var registerYNum = 0x1;
        var registerYValue = 0x05;

        var testProgram = [
            0x80,
            0x16
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.registers[registerYNum] = registerYValue;

        interpreter.loadInstructions(testProgram);
        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        assert.strictEqual(
            interpreter.registers[registerXNum],
            0x02,
            'Register X value should equal 2'
        );

        assert.strictEqual(
            interpreter.registers[registerYNum],
            0x05,
            'Register Y value should equal 5'
        );

        assert.strictEqual(
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

        assert.strictEqual(
            interpreter.registers[registerXNum],
            0x01,
            'Register X value should equal rx - ry'
        );

        assert.strictEqual(
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

        assert.strictEqual(
            interpreter.registers[registerXNum],
            0x01,
            'Register X value should equal abs(rx - ry)'
        );

        assert.strictEqual(
            interpreter.registers[0xF],
            0,
            'Register 0xF value (borrow bit) should equal 0'
        );
    });

    it('8xyE - should bit shift left register x (no overflow)', function() {
        var registerXNum = 0x0;
        var registerYNum = 0x1;
        var registerYValue = 0x7f;

        var testProgram = [
            0x80,
            0x1e
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.registers[registerYNum] = registerYValue;

        interpreter.loadInstructions(testProgram);
        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        assert.strictEqual(
            interpreter.registers[registerXNum],
            0xfe,
            'Register X value should equal 0xfe'
        );

        assert.strictEqual(
            interpreter.registers[registerYNum],
            0x7f,
            'Register Y value should equal 0x7f'
        );

        assert.strictEqual(
            interpreter.registers[0xF],
            0,
            'Register 0xF value (overflow bit) should equal 0'
        );
    });

    it('8xyE - should bit shift left register x (overflow)', function() {
        var registerXNum = 0x0;
        var registerYNum = 0x1;
        var registerYValue = 0x80;

        var testProgram = [
            0x80,
            0x1e
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.registers[registerYNum] = registerYValue;

        interpreter.loadInstructions(testProgram);
        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        assert.strictEqual(
            interpreter.registers[registerXNum],
            0x00,
            'Register X value should equal 0x00'
        );

        assert.strictEqual(
            interpreter.registers[registerYNum],
            0x80,
            'Register Y value should equal 0x80'
        );

        assert.strictEqual(
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

        assert.strictEqual(
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

        assert.strictEqual(
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

        assert.strictEqual(
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

        assert.strictEqual(
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

            assert.strictEqual(
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

        //Set an overlapping but not colliding bit
        interpreter.setPixel(2, 4, 1);

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
            [0, 1, 1, 0, 1, 0, 0, 0],
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

        assert.strictEqual(
            expectedPixelsStr,
            resultPixelsStr,
            '0 sprite should be drawn'
        );

        assert.strictEqual(
            interpreter.registers[0xF],
            0,
            'Collision bit should not be set'
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

        assert.strictEqual(
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

        assert.strictEqual(
            expectedPixelsStr,
            resultPixelsStr,
            'XORed sprite should be drawn'
        )

        assert.strictEqual(
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

        assert.strictEqual(
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

        assert.strictEqual(
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

        assert.strictEqual(
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

        assert.strictEqual(
            interpreter.PC,
            oldPC + 4,
            'PC should equal old value + 4'
        );
    });

    it('Fx07 - should put delay timer value into r\'x', function() {
        var registerXNum = 5;
        var delayTimerValue = 10;
        var testProgram = [
            0xf5,
            0x07
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.loadInstructions(testProgram);

        interpreter.DT = delayTimerValue;

        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        assert.strictEqual(
            interpreter.registers[registerXNum],
            delayTimerValue,
            'Register x should equal delay timer value'
        );
    });

    it('Fx0A - should wait for keypress and store value in r\'x', function() {
        var testRegisterNum = 0;
        var registerXNum = 1;
        var keyCode = 0x5;
        var testProgram = [
            0xf1,
            0x0a,
            0x60,
            0xff
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.loadInstructions(testProgram);

        interpreter.step();
        interpreter.step();

        var testRegisterValueAfterWait = interpreter.registers[
            testRegisterNum
        ];
        interpreter.keyDown(keyCode);

        interpreter.step();

        assert.strictEqual(
            interpreter.registers[registerXNum],
            keyCode,
            'Register x should equal keycode'
        );

        assert.strictEqual(
            interpreter.registers[
                testRegisterNum
            ],
            0,
            'Test register should equal 0'
        );
    });

    it('should decrement timer registers at 60hz', function() {
        var dt = 120;
        var st = 50;

        var startTime = 1000;
        var secondsPassed = 1;

        var testProgram = [
            0x00,
            0xe0,
            0x00,
            0xe0
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.loadInstructions(testProgram);

        MatchboxChip8.__with__({
            currentTime: function() {
                return startTime;
            }
        })(function () {
            interpreter.step();
        });

        interpreter.DT = dt;
        interpreter.ST = st;

        MatchboxChip8.__with__({
            currentTime: function() {
                return startTime + secondsPassed;
            }
        })(function () {
            interpreter.step();
        });

        assert.strictEqual(
            interpreter.DT,
            60,
            'Delay timer should decrease by 60'
        );

        assert.strictEqual(
            interpreter.ST,
            0,
            'Sound time should cap at 0'
        );
    });

    it('Fx15 - should set delay timer to register x', function() {
        var registerXNum = 1;
        var registerXValue = 10;

        var testProgram = [
            0xf1,
            0x15
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.loadInstructions(testProgram);

        interpreter.registers[registerXNum] = registerXValue;

        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        assert.strictEqual(
            interpreter.DT,
            registerXValue,
            'Delay timer should equal register x value'
        );
    });

    it('Fx18 - should set sound timer to register x', function() {
        var registerXNum = 1;
        var registerXValue = 10;

        var testProgram = [
            0xf1,
            0x18
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.loadInstructions(testProgram);

        interpreter.registers[registerXNum] = registerXValue;

        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        assert.strictEqual(
            interpreter.ST,
            registerXValue,
            'Sound timer should equal register x value'
        );
    });

    it('Fx1E - should add register x into I', function() {
        var registerXNum = 1;
        var registerXValue = 0x1;
        var I = 0x1;

        var testProgram = [
            0xf1,
            0x1e
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.loadInstructions(testProgram);

        interpreter.registers[registerXNum] = registerXValue;
        interpreter.I = I;

        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        assert.strictEqual(
            interpreter.I,
            0x2,
            'Register I should equal 2'
        );
    });

    it('Fx29 - should load the address of bitmap char into r\'i', function() {
        var registerXNum = 1;
        var registerXValue = 0xf;

        var testProgram = [
            0xf1,
            0x29
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.loadInstructions(testProgram);

        interpreter.registers[registerXNum] = registerXValue;

        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        assert.strictEqual(
            interpreter.I,
            0xf * 5,
            'Register I should equal 0xf * 5'
        );
    });

    it('Fx33 - should store BCD of r\'x in r\'i...', function() {
        var registerXNum = 0x1;
        var registerXValue = 0xFF;

        var testProgram = [
            0xf1,
            0x33
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.loadInstructions(testProgram);

        interpreter.registers[registerXNum] = registerXValue;

        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        var I = interpreter.I;

        assert.strictEqual(
            interpreter.RAM[I],
            0x2,
            'RAM[i] should equal BCD of 2'
        );

        assert.strictEqual(
            interpreter.RAM[I + 1],
            0x5,
            'RAM[i + 1] should equal BCD of 5'
        );

        assert.strictEqual(
            interpreter.RAM[I + 2],
            0x5,
            'RAM[i + 2] should equal BCD of 5'
        );
    });

    it('Fx55 - should dump r\' values 0-x into memory at r\'i', function() {
        var I = 0x210;

        var registerXNum = 0x3;

        var register0Value = 0x0;
        var register1Value = 0x1;
        var register2Value = 0x2;
        var register3Value = 0x3;

        var testProgram = [
            0xf3,
            0x55
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.loadInstructions(testProgram);

        interpreter.registers[0x0] = register0Value;
        interpreter.registers[0x1] = register1Value;
        interpreter.registers[0x2] = register2Value;
        interpreter.registers[0x3] = register3Value;

        interpreter.I = I;

        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        var expectedArray = [
            0x0,
            0x1,
            0x2,
            0x3
        ];

        var resultArray = [
            interpreter.RAM[I],
            interpreter.RAM[I + 1],
            interpreter.RAM[I + 2],
            interpreter.RAM[I + 3]
        ];

        assert.strictEqual(
            JSON.stringify(expectedArray),
            JSON.stringify(resultArray)
        );

        assert.strictEqual(
            interpreter.I,
            I + registerXNum + 1,
            'Register I should equal I + Vx + 1'
        );
    });

    it('Fx65 - Should load registers from RAM from r\'i', function() {
        var I = 0x210;

        var registerXNum = 0x3;

        var IValue = 0x0;
        var I1Value = 0x1;
        var I2Value = 0x2;
        var I3Value = 0x3;

        var testProgram = [
            0xf3,
            0x65
        ];

        var interpreter = new MatchboxChip8.Interpreter();
        interpreter.loadInstructions(testProgram);

        interpreter.RAM[I] = IValue;
        interpreter.RAM[I + 1] = I1Value;
        interpreter.RAM[I + 2] = I2Value;
        interpreter.RAM[I + 3] = I3Value;

        interpreter.I = I;

        for(var i = 0; i < testProgram.length / 2; i += 1) {
            interpreter.step();
        };

        assert.strictEqual(
            IValue,
            interpreter.registers[0x0],
            'Register 0 value should equal value at I'
        );

        assert.strictEqual(
            I1Value,
            interpreter.registers[0x1],
            'Register 1 value should equal value at I + 1'
        );

        assert.strictEqual(
            I2Value,
            interpreter.registers[0x2],
            'Register 2 value should equal value at I + 2'
        );

        assert.strictEqual(
            I3Value,
            interpreter.registers[0x3],
            'Register 3 value should equal value at I + 3'
        );

        assert.strictEqual(
            interpreter.I,
            I + registerXNum + 1,
            'Register I should equal I + Vx + 1'
        );
    });

});

