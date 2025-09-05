// Particle Classes for DJ Visualizer

// Smoke Particle class
class SmokeParticle {
  constructor(x, y, energy, eqType) {
    this.x = x;
    this.y = y;
    this.vx = p.random(-1, 1);
    this.vy = p.random(-3, -1);
    this.life = 255;
    this.size = p.random(5, 15);
    this.energy = energy;
    this.eqType = eqType; // 'bass', 'mid', or 'high'
    this.color = EQ_COLORS[eqType];
  }
  
  update() {
    // Update color reference
    this.color = EQ_COLORS[this.eqType];
    
    this.x += this.vx;
    this.y += this.vy;
    this.vy *= 0.98; // Slow down over time
    this.vx *= 0.99;
    this.life -= 2;
    this.size += 0.1;
  }
  
  draw() {
    p.push();
    p.colorMode(p.HSB);
    p.fill(this.color.hue, this.color.sat, this.color.bright, this.life);
    p.noStroke();
    p.ellipse(this.x, this.y, this.size, this.size);
    p.pop();
  }
  
  isDead() {
    return this.life <= 0;
  }
}

// Boid class for flocking behavior
class Boid {
  constructor(x, y, eqType = 'mid') {
    this.position = p.createVector(x, y);
    this.velocity = p.createVector(p.random(-1, 1), p.random(-1, 1));
    this.acceleration = p.createVector(0, 0);
    this.maxSpeed = 3;
    this.maxForce = 0.03;
    this.energy = 0;
    this.eqType = eqType;
    this.color = EQ_COLORS[eqType];
  }

  update() {
    // Update color reference
    this.color = EQ_COLORS[this.eqType];
    
    this.velocity.add(this.acceleration);
    this.velocity.limit(this.maxSpeed + this.energy * 2);
    this.position.add(this.velocity);
    this.acceleration.mult(0);
    
    // Wrap around edges with bounds
    const bounds = p.getVisBounds();
    if (this.position.x < bounds.x) this.position.x = bounds.x + bounds.width;
    if (this.position.x > bounds.x + bounds.width) this.position.x = bounds.x;
    if (this.position.y < bounds.y) this.position.y = bounds.y + bounds.height;
    if (this.position.y > bounds.y + bounds.height) this.position.y = bounds.y;
  }

  flock(boids) {
    let sep = this.separate(boids);
    let ali = this.align(boids);
    let coh = this.cohesion(boids);
    
    sep.mult(1.5);
    ali.mult(1.0);
    coh.mult(1.0);
    
    this.acceleration.add(sep);
    this.acceleration.add(ali);
    this.acceleration.add(coh);
  }

  separate(boids) {
    let desiredSeparation = 25;
    let steer = p.createVector(0, 0);
    let count = 0;
    
    for (let other of boids) {
      let d = p5.Vector.dist(this.position, other.position);
      if (d > 0 && d < desiredSeparation) {
        let diff = p5.Vector.sub(this.position, other.position);
        diff.normalize();
        diff.div(d);
        steer.add(diff);
        count++;
      }
    }
    
    if (count > 0) {
      steer.div(count);
      steer.normalize();
      steer.mult(this.maxSpeed);
      steer.sub(this.velocity);
      steer.limit(this.maxForce);
    }
    return steer;
  }

  align(boids) {
    let neighborDist = 50;
    let sum = p.createVector(0, 0);
    let count = 0;
    
    for (let other of boids) {
      let d = p5.Vector.dist(this.position, other.position);
      if (d > 0 && d < neighborDist) {
        sum.add(other.velocity);
        count++;
      }
    }
    
    if (count > 0) {
      sum.div(count);
      sum.normalize();
      sum.mult(this.maxSpeed);
      let steer = p5.Vector.sub(sum, this.velocity);
      steer.limit(this.maxForce);
      return steer;
    }
    return p.createVector(0, 0);
  }

  cohesion(boids) {
    let neighborDist = 50;
    let sum = p.createVector(0, 0);
    let count = 0;
    
    for (let other of boids) {
      let d = p5.Vector.dist(this.position, other.position);
      if (d > 0 && d < neighborDist) {
        sum.add(other.position);
        count++;
      }
    }
    
    if (count > 0) {
      sum.div(count);
      return this.seek(sum);
    }
    return p.createVector(0, 0);
  }

  seek(target) {
    let desired = p5.Vector.sub(target, this.position);
    desired.normalize();
    desired.mult(this.maxSpeed);
    
    let steer = p5.Vector.sub(desired, this.velocity);
    steer.limit(this.maxForce);
    return steer;
  }

  draw(p) {
    p.push();
    p.translate(this.position.x, this.position.y);
    p.rotate(this.velocity.heading() + p.PI/2);
    p.colorMode(p.HSB);
    p.fill(this.color.hue, this.color.sat, this.color.bright, 200);
    p.noStroke();
    
    let size = 8 + this.energy * 10;
    p.beginShape();
    p.vertex(0, -size);
    p.vertex(-size/2, size);
    p.vertex(size/2, size);
    p.endShape(p.CLOSE);
    p.pop();
  }
}

// Connected Particle class
class ConnectedParticle {
  constructor(x, y, energy, eqType) {
    this.x = x;
    this.y = y;
    this.vx = p.random(-2, 2);
    this.vy = p.random(-2, 2);
    this.life = 255;
    this.energy = energy;
    this.eqType = eqType; // 'bass', 'mid', or 'high'
    this.color = EQ_COLORS[eqType];
    this.connections = [];
  }
  
  update() {
    // Update color reference
    this.color = EQ_COLORS[this.eqType];
    
    this.x += this.vx;
    this.y += this.vy;
    
    // Bounce off bounds
    const bounds = p.getVisBounds();
    if (this.x < bounds.x || this.x > bounds.x + bounds.width) this.vx *= -1;
    if (this.y < bounds.y || this.y > bounds.y + bounds.height) this.vy *= -1;
    
    this.vx *= 0.99;
    this.vy *= 0.99;
    this.life -= 1;
  }
  
  findConnections(particles) {
    this.connections = [];
    for (let other of particles) {
      if (other !== this) {
        let distance = p.dist(this.x, this.y, other.x, other.y);
        if (distance < 80) {
          this.connections.push(other);
        }
      }
    }
  }
  
  draw(p) {
    // Draw connections
    p.colorMode(p.HSB);
    p.stroke(this.color.hue, this.color.sat, this.color.bright, 100);
    p.strokeWeight(1);
    for (let other of this.connections) {
      p.line(this.x, this.y, other.x, other.y);
    }
    
    // Draw particle
    p.fill(this.color.hue, this.color.sat, this.color.bright, this.life);
    p.noStroke();
    let size = 4 + this.energy * 8;
    p.ellipse(this.x, this.y, size, size);
  }
  
  isDead() {
    return this.life <= 0;
  }
}
