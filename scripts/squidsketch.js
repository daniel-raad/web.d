let mic;
let radius = 0
let myLine = 800 
let height = 800 
let width = 800 
let centre = 0 
let treeLines = [[0, 400, 0, 350]]
let branchLen = 70 
var frameRateMinString = document.getElementById('helper').getAttribute('rate'); 
var frameRateMin = parseInt(frameRateMinString); 

let shapeOptions = 1 
let doBranch = false 
let doBackground = false 
let shapeRarity = [50, 30, 20]
let branchingRarity = 10 
let backgroundRarity = [25, 25, 25, 25]
let colBackgroundRarity = 30 
let blend 


function setup() {
  let cnv = createCanvas(width, height);
  cnv.mousePressed(userStartAudio);
  mic = new p5.AudioIn();
  mic.start();
  setRarities()
}


function setRarities(){
  randomValue = random(100)
  if(randomValue < backgroundRarity[0]){
    blend = HARD_LIGHT
  } else if (randomValue < backgroundRarity[0] + backgroundRarity[1]){
    blend = BLEND
  } else if (randomValue < backgroundRarity[0] + backgroundRarity[1] + backgroundRarity[2]) {
    blend = REPLACE
  } else {
    blend = DIFFERENCE 
  }
  print(blend)
  randomValue = random(100)
  if(randomValue < shapeRarity[0]){
    shapeOptions = 1
  } else if (randomValue < shapeRarity[0] + shapeRarity[1]){
    shapeOptions = 2 
  } else {
    shapeOptions = 3 
  }
  print(shapeOptions)

  randomValue = random(100)
  if(randomValue < branchingRarity){
    doBranch = true 
  }
  print(doBranch)
  randomValue = random(100)
  if(randomValue < colBackgroundRarity){
    doBackground = true
  }
  print(doBackground)
}


const drawTriple = (x,y) => { 
  var ellipseSquare = Math.random() < 0.5 ? ellipse(x, y, 80 * (1 + (random(10)*micLevel)), 80 * (1 + (random(10)*micLevel))) : square(x, y, 80 * (1 + (random(10)*micLevel)));
  var triangleChance = Math.random() < 0.5 ? triangle(x, y, random(-400,400),random(-400,400),random(-400,400),random(-400,400)) : ellipse(x, y, 80 * (1 + (random(10)*micLevel)), 80 * (1 + (random(10)*micLevel)));
}

const drawDouble = (x,y)  => { 
  var chosenValue = Math.random() < 0.5 ? ellipse(x, y, 80 * (1 + (random(10)*micLevel)), 80 * (1 + (random(10)*micLevel))) : square(x, y, 80 * (1 + (random(10)*micLevel)));
} 

const drawSingle = (x,y) => { 
  x = random(-400, 400)
  y = random(-400, 400)
  if(micLevel > 0.4){
    fill(random(255),0,0)
  }
  ellipse(x, y, 80 * (1 + (random(radius)*micLevel)), 80 * (1 + (random(radius)*micLevel)));
  ellipse(x,y, radius, radius)
  radius = radius + 1 
  if(radius == height/2){
    radius = 0
  }
}



function branch(len){
  line(0,0,0,-len)
  translate(0,-len)
  len*=0.70
  if(len > 2){

    push()
    theta = random(PI/2, -PI/2)
    rotate(theta)
    branch(len)
    pop()

    push()
    theta = random(PI/2, -PI/2)
    rotate(theta)
    branch(len)
    pop()
  }
}

function centralSquare() { 
  rectMode(CENTER)
  translate(width / 2, height / 2);
  micLevel = mic.getLevel();
  noFill() 
  stroke(random(255), random(204), random(0))
  rect(0, 0, myLine+10, myLine+10, 32)
  square(0, 0, myLine * (1+micLevel))
  centre = centre + 0.5
  myLine = myLine - 1 
  if(myLine == 0){
    myLine = 800
    centre = 0 
  }
}

function randomLines(){ 
  for(let i = 0; i < treeLines.length; i++){
    lineCoords = treeLines[i]
    line(lineCoords[0], lineCoords[1], lineCoords[2], lineCoords[3])
  }
}

function blendingModes(blend){
  blendMode(blend)
}

function draw() {
  if(doBackground){
    background('blue')
  }
  blendingModes(blend)
  centralSquare()
  randomLines()
  if(true){
    branch(branchLen)
  }
  frameRate(random(frameRateMin,60))
  fill(random(255), random(255), random(255))
  stroke(random(255), random(204), random(0));
  strokeWeight(random(10));
  
  
  x = random(-400, 400)
  y = random(-400, 400)

  if(shapeOptions == 2){ 
     drawDouble(x,y)
  } else if(shapeOptions == 3){ 
  	 drawTriple(x,y)  
  } else { 
  	drawSingle(x,y)  
  }
}