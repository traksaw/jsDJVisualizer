var img;
var xPos = new Array();
var yPos = new Array();
var sampleRate = 8; // between 1 & 8
var shapePoints = 3; // between 3 & 5?
var frames = 0;

function preload() {
    img = loadImage("https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Ascanius_Shooting_the_Stag_of_Sylvia_1682_Claude_Lorrain.jpg/966px-Ascanius_Shooting_the_Stag_of_Sylvia_1682_Claude_Lorrain.jpg");
}

function setup() {
    createCanvas(800, 600);
    smooth();
    noStroke();
    background(0);
}

function draw() {
    
    frames++;
    if (frames >= sampleRate) {
        // reset
        frames = 0;
        // sample point
        if ((mouseX > 0) && (mouseY > 0)) {
            xPos = append(xPos, mouseX);
            yPos = append(yPos, mouseY);
        }

        //draw shape
        if (xPos.length >= shapePoints) {
            var pxlA = img.get(xPos[xPos.length-1], yPos[yPos.length-1]);
            var pxlB = img.get(xPos[xPos.length-2], yPos[yPos.length-2]);
            var tweenCol = lerpColor(pxlA, pxlB, .5);
            fill(tweenCol);

            beginShape();            
            for(var v=0; v<shapePoints; v++) {
              var arrayPos = xPos.length-1 - v;
              vertex(xPos[arrayPos],yPos[arrayPos]);
            }
            endShape(CLOSE);
           
        }

    }
}