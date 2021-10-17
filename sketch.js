let C_W = 300;
let C_H = 300;

let PIXEL_SIZE = 10;
let ZEROS_COUNT = 3;

let X_AXIS = 2;
let Y_AXIS = 2;

let samples = [];
let targets = [];
let moused_point = null;

Polynomial.setField("C");

let POLY = Polynomial();

let DEPTH = 0;
let CACHE_INDEX = 0;

let ID = 0;
let button1;
let button2;
let button3;
let button_in;
let button_out;
let slider;

class Point{
    constructor(x=random(-C_W/2,C_W/2), y=random(-C_H/2,C_H/2), my_color="white") {
        this.position = createVector(x, y);
        this.z = Complex(x * X_AXIS / C_W, y * Y_AXIS / C_H);
        this.velocity = createVector(0, 0);
        this.acceleration = createVector(0, 0);
        this.my_color = my_color;
        this.size = PIXEL_SIZE;
        this.z_cache = [this.z];
        // this.ID = ID;
        // ID += 1;
    }


    next_position() {
        // Newton's Method Happens In This Function

        let z = this.z_cache[this.z_cache.length-1];

        let numer = POLY.eval(z);
        let denom = (POLY.derive(1)).eval(z);

        // d_1 = f(x_1) / f'(x_1)
        let step = (numer.div(denom));

        // x_2 = x_1 - d_1
        let next_z = z.sub(step);

        this.z_cache.push(next_z);
    }

    update_position() {
        if(mouseIsPressed){
            this.position=complex_to_position(this.z_cache[CACHE_INDEX]);
        }

        else{
            // "Physics"
            this.acceleration = p5.Vector.sub(
                complex_to_position(this.z_cache[CACHE_INDEX]),
                this.position
                );

            this.velocity.add(this.acceleration.mult(0.2)).mult(0.4);
            this.position.add(this.velocity);
        }

        this.z = this.z_cache[CACHE_INDEX];
    }

    update_color() {
        let closest = targets[0];
        let my_z = this.z_cache[this.z_cache.length - 1].clone();
        let radius = (my_z.sub(closest.z).pow(0.5)).abs();

        for(let target of targets){
            let new_radius = (my_z.sub(target.z).pow(0.5)).abs();

            if(new_radius < radius)
            {
                radius = new_radius;
                closest = target;
            }
        }
        this.my_color=closest.my_color;
    }

   show() {
        fill(this.my_color);
        ellipse(this.position.x, this.position.y, this.size/2);
    }
}

function setup_samples() {

    samples = [];
    ID = 5;

    let temp_arr = [];

    for (let i =0; i<C_W/PIXEL_SIZE; i++){
        temp_arr = []
        for(let j=0; j < C_H/PIXEL_SIZE; j++){
            let newp = new Point(-C_W/2+i*PIXEL_SIZE, -C_H/2+j*PIXEL_SIZE);
            for(k=0; k<DEPTH; k++){
                newp.next_position();
            }
            temp_arr.push(newp);
        }
        samples.push(temp_arr)
    }
}

function setup() {
    translate(C_W/2, C_H/2);
    // rotate(-HALF_PI);
    applyMatrix(1,0,0,-1,0,0);
    createCanvas(C_W, C_H);
    strokeWeight(3);
    textSize(13);

    let div = createDiv(`
        Use mouse to move control points (these represent zeroes for the complex polynomial).<br>
      Iterate through Newton's method with keys 'f' (forward) and 'b' (backward).<br>
      Zoom in and out with mouse wheel.<br>
      Press number keys to change the number of control points.<br>
      Inspired by <a href="https://www.youtube.com/watch?v=-RdOwhmqP5s">Grant Sanderson's video on Newton Fractals.</a>`);
    div.style('font-size', '12px');
    div.position(5, C_H+70);

    // select('canvas').position(10, 30);

    button1 = createButton('forward');
    button1.position(0, C_H+20);
    button1.mousePressed(forward);

    button2 = createButton('backward');
    button2.position(100, C_H+20);
    button2.mousePressed(backward);

    button3 = createButton('refresh');
    button3.position(200, C_H+50);
    button3.mousePressed(update_zeroes);

    button_in = createButton('zoom in');
    button_in.position(0, C_H+50);
    button_in.mousePressed(zoom_in);

    button_out = createButton('zoom out');
    button_out.position(100, C_H+50);
    button_out.mousePressed(zoom_out);


    slider = createSlider(1, 12, ZEROS_COUNT);
    slider.position(200, C_H+20);
    slider.style('width', '80px');

    targets = []
    DEPTH = 0;
    CACHE_INDEX = 0;

    for(let i=0; i < ZEROS_COUNT; i++){
        targets.push(new Point());
        targets[i].my_color = `hsb(${int(40+(i)*240/(ZEROS_COUNT))}, ${int(60+i*100/(ZEROS_COUNT+1))}%, ${int(30+i*100/(ZEROS_COUNT+1))}%)`;
        // console.log(`hsb(${int(120+(i)*200/(ZEROS_COUNT))}, ${int(50+i*50/(ZEROS_COUNT+1))}%, ${int(50+i*50/(ZEROS_COUNT+1))}%)`);
        targets[i].size *= 3;
    }

    update_POLY();

    setup_samples();

}

function draw() {
  translate(C_W/2, C_H/2);
  applyMatrix(1,0,0,-1,0,0);
  m_x = mouseX-C_W/2;
  m_y = -1*mouseY+C_H/2

  ZEROS_COUNT = slider.value();

  background(0);

  if(moused_point){
    moused_point.position.x = m_x;
    moused_point.position.y = m_y;
    moused_point.z = Complex(m_x * X_AXIS / C_W, m_y * Y_AXIS / C_H);
    update_POLY();
    setup_samples();
  }

  for(i=0; i < samples.length; i++){
    for(j=0; j < samples[i].length; j++){
        samples[i][j].update_position();
        samples[i][j].update_color();
        samples[i][j].show();
    }
  }
  for (let target of targets){
    // target.update_color();
    stroke("white");
    target.show();
    noStroke();
  }

  resetMatrix();
  stroke("white");
  fill("black");
  text(`Total Iterations: ${DEPTH}`, 0,20);
  text(`Current Iteration: ${CACHE_INDEX}`, 120, 20);
  noStroke();
}

function mousePressed() {
    translate(C_W/2, C_H/2);
    applyMatrix(1,0,0,-1,0,0);
    m_x = mouseX-C_W/2;
    m_y = -1*mouseY+C_H/2
    // setup_samples()
    // rotate(-HALF_PI);
    let possible = []
    for (let target of targets){
        if(dist(target.position.x, target.position.y, m_x, m_y) < target.size/3) {
            possible.push(target);
        }
    }
    for (let target of targets.reverse()){
        if(possible.includes(target)){
            moused_point = target;
            return;
        }
    }

}

function mouseReleased() {
    moused_point = null;
    // setup_samples();
}

function keyPressed() {
    //Pressed 'b'
    console.log(keyCode);
    if(keyCode > 48 && keyCode < 58){
        targets = [];
        ZEROS_COUNT = keyCode - 48;
        setup();
    }
    if(keyCode == 66){
        backward();
    }

    //Pressed 'f'
    if(keyCode == 70){
        forward();
    }
}

function update_zeroes(){
    ZEROS_COUNT = slider.value();
    setup();
}

function forward() {
    if(DEPTH == CACHE_INDEX){

        for(let i=0; i < samples.length; i++){
          for(let j=0; j < samples[i].length; j++){
                    // samples[i][j].position = samples[i][j].cache[CACHE_INDEX];
                samples[i][j].next_position();
            }
        }
        DEPTH += 1;

        // setup_samples();
    }
    CACHE_INDEX += 1;
}

function backward() {
    if(CACHE_INDEX > 0){
        CACHE_INDEX -= 1;
    }
}

function zoom_in() {
    PIXEL_SIZE += 1;
    setup_samples();
}

function zoom_out(){
    PIXEL_SIZE -= 1;
    setup_samples();
}

function mouseWheel(event) {
    if(event.delta < 0) {
        PIXEL_SIZE += 1;
    } else {
        PIXEL_SIZE -= 1;
    }
    setup_samples();
}

function update_POLY() {
    let base_poly = Polynomial([1]);

    for(target of targets){
        base_poly = base_poly.mul(Polynomial([target.z.mul(-1),1]));
    }

    POLY = base_poly;

    // POLY = Polynomial([targets[0].z.mul(-1),1]).mul(
    //     Polynomial([targets[1].z.mul(-1),1])).mul(
    //     Polynomial([targets[2].z.mul(-1),1])).mul(
    //     Polynomial([targets[3].z.mul(-1),1])).mul(
    //     Polynomial([targets[4].z.mul(-1),1]));

    // console.log("1", POLY.toString(), "2", POLY2.toString());
}

function position_to_complex(pos){
    return Complex(pos.x * X_AXIS / C_W, pos.y * Y_AXIS / C_H);
}

function complex_to_position(z) {
    return createVector(z.re * C_W / X_AXIS, z.im * C_H / Y_AXIS);
}

// let button;
// function setup() {
//   createCanvas(100, 100);
//   background(0);
//
// }

function changeBG() {
  let val = random(255);
  background(val);
}
