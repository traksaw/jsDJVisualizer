// EQ Puzzle Piece Visualization
// Each frequency band (bass/mid/high) contributes to a unified visual composition

// Puzzle piece visualization mode
function drawEQPuzzleMode() {
  p.background(0, 30);
  
  const bounds = p.getVisBounds();
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  
  // Only run visualization when audio is active
  if (!isAudioActive) {
    // Clear all sparkle particles when audio stops
    for (let i = particles.length - 1; i >= 0; i--) {
      if (particles[i] instanceof SparkleParticle) {
        particles.splice(i, 1);
      }
    }
    return;
  }
  
  // Clear particles array to avoid conflicts with other modes
  particles = particles.filter(particle => particle instanceof SparkleParticle);
  
  // Only draw if we have audio data and music is playing
  if (rms > 0.01) {
    // Bass creates the foundation - geometric base shapes
    drawBassPuzzlePiece(centerX, centerY, bounds);
    
    // Mid creates the connecting elements - flowing connections
    drawMidPuzzlePiece(centerX, centerY, bounds);
    
    // High creates the detail layer - sparkling accents
    drawHighPuzzlePiece(centerX, centerY, bounds);
  }
}

// Bass EQ - Foundation layer (geometric shapes at bottom)
function drawBassPuzzlePiece(centerX, centerY, bounds) {
  const bassIntensity = bass * sensitivity;
  const bassColor = EQ_COLORS.bass;
  
  p.push();
  p.colorMode(p.HSB, 360, 100, 100, 1);
  p.fill(bassColor.hue, bassColor.sat, bassColor.bright, 0.8);
  p.stroke(bassColor.hue, bassColor.sat, 100, 0.9);
  p.strokeWeight(2);
  
  // Create foundation rectangles that grow with bass
  const numRects = Math.floor(bassIntensity * 8) + 3;
  const baseY = bounds.y + bounds.height * 0.8;
  const pulse = p.sin(p.millis() * 0.005) * 5; // Subtle pulsing effect

  for (let i = 0; i < numRects; i++) {
    const rectWidth = (bounds.width / numRects) * 0.8;
    const rectHeight = bassIntensity * 100 + 20 + pulse;
    const x = bounds.x + (i * bounds.width / numRects) + rectWidth * 0.1;
    const y = baseY - rectHeight;

    // Slight rotation for organic feel
    p.push();
    p.translate(x + rectWidth / 2, y + rectHeight / 2);
    p.rotate(p.sin(p.millis() * 0.001 + i) * 0.1);
    p.rect(-rectWidth / 2, -rectHeight / 2, rectWidth, rectHeight, 5);
    p.pop();
  }
  
  p.pop();
}

// Mid EQ - Connection layer (flowing curves between elements)
function drawMidPuzzlePiece(centerX, centerY, bounds) {
  const midIntensity = mid * sensitivity;
  const midColor = EQ_COLORS.mid;
  
  if (midIntensity > 0.1) {
    p.push();
    p.colorMode(p.HSB, 360, 100, 100, 1);
    p.stroke(midColor.hue, midColor.sat, midColor.bright, 0.7);
    p.strokeWeight(3 + midIntensity * 5);
    p.noFill();
    
    // Create flowing connection lines that originate from the bass area
    const numCurves = Math.floor(midIntensity * 6) + 2;
    const startY = bounds.y + bounds.height * 0.75; // Start near the bass foundation

    for (let i = 0; i < numCurves; i++) {
      const startX = bounds.x + p.random(bounds.width);
      const endX = centerX + p.random(-bounds.width * 0.4, bounds.width * 0.4);
      const endY = bounds.y + bounds.height * 0.2; // Reach towards the top

      // Control points for organic bezier curves
      const cp1X = startX + p.sin(p.millis() * 0.002 + i) * 80;
      const cp1Y = startY - midIntensity * 120;
      const cp2X = endX + p.cos(p.millis() * 0.003 + i) * 60;
      const cp2Y = endY + midIntensity * 100;

      p.bezier(startX, startY, cp1X, cp1Y, cp2X, cp2Y, endX, endY);
    }
    
    p.pop();
  }
}

// High EQ - Detail layer (sparkling particles and accents)
function drawHighPuzzlePiece(centerX, centerY, bounds) {
  const highIntensity = treble * sensitivity;
  const highColor = EQ_COLORS.high;
  
  // Update and draw existing sparkle particles first
  for (let i = particles.length - 1; i >= 0; i--) {
    const particle = particles[i];
    if (particle instanceof SparkleParticle) {
      particle.update();
      particle.draw();
      if (particle.isDead()) {
        particles.splice(i, 1);
      }
    }
  }
  
  if (highIntensity > 0.05) {
    const burstY = bounds.y + bounds.height * 0.25; // Origin point of the burst

    // Generate sparkle particles that burst from where the mid curves end
    const numSparkles = Math.floor(highIntensity * 15);

    for (let i = 0; i < numSparkles; i++) {
      const x = centerX + p.random(-bounds.width * 0.4, bounds.width * 0.4);
      particles.push(new SparkleParticle(x, burstY, highIntensity, highColor));
    }
    
    // Add accent lines that radiate from the burst area
    p.push();
    p.colorMode(p.HSB, 360, 100, 100, 1);
    p.stroke(highColor.hue, highColor.sat, highColor.bright, 0.6);
    p.strokeWeight(1.5);

    const numLines = Math.floor(highIntensity * 12) + 4;

    for (let i = 0; i < numLines; i++) {
      const angle = p.random(p.PI, p.TWO_PI); // Radiate upwards
      const lineLength = highIntensity * 50 + 15;
      const startX = centerX + p.random(-bounds.width * 0.4, bounds.width * 0.4);
      const endX = startX + p.cos(angle) * lineLength;
      const endY = burstY + p.sin(angle) * lineLength;
      p.line(startX, burstY, endX, endY);
    }

    p.pop();
  }
}

// Sparkle particle class for high frequencies
class SparkleParticle {
  constructor(x, y, intensity, color) {
    this.x = x;
    this.y = y;
    const angle = p.random(p.PI, p.TWO_PI) * -1; // Burst upwards
    const speed = p.random(1, 4) * (1 + intensity * 0.5);
    this.vx = p.cos(angle) * speed;
    this.vy = p.sin(angle) * speed;
    this.life = 255;
    this.maxLife = 60 + intensity * 50;
    this.size = intensity * 8 + 2;
    this.color = color;
    this.twinkle = p.random(p.TWO_PI);
  }
  
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.05; // slight gravity
    this.life -= 255 / this.maxLife;
    this.twinkle += 0.2;
  }
  
  draw() {
    p.push();
    p.colorMode(p.HSB, 360, 100, 100, 1);
    
    const alpha = this.life / 255;
    const twinkleSize = this.size * (1 + p.sin(this.twinkle) * 0.3);
    
    p.fill(this.color.hue, this.color.sat, this.color.bright, alpha);
    p.noStroke();
    
    // Draw sparkle as a star shape
    p.push();
    p.translate(this.x, this.y);
    p.rotate(this.twinkle);
    
    // Main sparkle
    p.ellipse(0, 0, twinkleSize);
    
    // Cross sparkle effect
    p.stroke(this.color.hue, this.color.sat, 100, alpha * 0.8);
    p.strokeWeight(1);
    p.line(-twinkleSize, 0, twinkleSize, 0);
    p.line(0, -twinkleSize, 0, twinkleSize);
    
    p.pop();
    p.pop();
  }
  
  isDead() {
    return this.life <= 0;
  }
}
