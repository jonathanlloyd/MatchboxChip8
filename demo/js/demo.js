var demo = (function () {
var canvas = document.getElementById("demo-canvas");
var ctx = canvas.getContext("2d");

var KEYCODE_KEY = {
    88: 0x0,
    49: 0x1,
    50: 0x2,
    51: 0x3,
    81: 0x4,
    87: 0x5,
    69: 0x6,
    65: 0x7,
    83: 0x8,
    68: 0x9,
    90: 0xa,
    67: 0xb,
    52: 0xc,
    82: 0xd,
    70: 0xe,
    86: 0xf
}

var KEY_DOMKEY = {
    0x0: $("#demoKey0"),
    0x1: $("#demoKey1"),
    0x2: $("#demoKey2"),
    0x3: $("#demoKey3"),
    0x4: $("#demoKey4"),
    0x5: $("#demoKey5"),
    0x6: $("#demoKey6"),
    0x7: $("#demoKey7"),
    0x8: $("#demoKey8"),
    0x9: $("#demoKey9"),
    0xa: $("#demoKeyA"),
    0xb: $("#demoKeyB"),
    0xc: $("#demoKeyC"),
    0xd: $("#demoKeyD"),
    0xe: $("#demoKeyE"),
    0xf: $("#demoKeyF")
}

var romURL = "ROMS/PONG";

var backgroundColor = '#112d00';
var foregroundColor = '#81ce00';

var DEBUG = false;
var RUNNING = false;

interpreter = new MatchboxChip8.Interpreter(DEBUG);


function renderScreen(interpreter) {
    for(var x = 0; x < 64; x += 1) {
        for(var y = 0; y < 32; y += 1) {
            var pixelValue = interpreter.getPixel(x, y);
            if(pixelValue === 1) {
                ctx.fillStyle = foregroundColor;
            } else {
                ctx.fillStyle = backgroundColor;
            }
            ctx.fillRect(10*x, 10*y, 10, 10);
        }
    }
}

function renderLoop() {
    if(!DEBUG) {
        for(var frame = 0; frame < 7; frame += 1) {
            interpreter.step();
        }
        renderScreen(interpreter);
        requestAnimationFrame(renderLoop);
    }
}

window.onkeydown = function(e) {
    if(DEBUG) {
        if(e.keyCode === 13) {
            interpreter.step();
            renderScreen(interpreter);
        }
    } else {
        if(e.keyCode in KEYCODE_KEY) {
            var key = KEYCODE_KEY[e.keyCode];
            var domKey = KEY_DOMKEY[key];
            domKey.addClass("demo-key-active");
            interpreter.keyDown(key);
        }
    }
}

window.onkeyup = function(e) {
    if(e.keyCode in KEYCODE_KEY) {
        var key = KEYCODE_KEY[e.keyCode];
        var domKey = KEY_DOMKEY[key];
        domKey.removeClass("demo-key-active");
        interpreter.keyUp(key);
    }
}


function loadRomFromURL(URL) {
    interpreter.insertRom(URL, function () {
        if(!RUNNING) {
            RUNNING = true;
            renderLoop();
        }
    });
}


return {
    "loadRomFromURL": loadRomFromURL,
}
})();
