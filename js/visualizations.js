// Visualization modes for DJ Visualizer

// Global visualization state
let particles = [];
let flockingBoids = [];
let connectedParticles = [];
let waveformHistory = [];

// Visualization mode functions
function drawSmokeMode() {
  p.background(0, 20);
  
  const bounds = p.getVisBounds();
  
  // Only generate particles when audio is actively playing
  if (isAudioActive && rms > 0.01) {
    // Bass particles (red) - left side
    let bassCount = Math.floor(bass * sensitivity * 5);
    for (let i = 0; i < bassCount; i++) {
      let x = bounds.x + bounds.width/4 + p.random(-bounds.width/12, bounds.width/12);
      let y = bounds.y + bounds.height - p.random(0, 30);
      particles.push(new SmokeParticle(x, y, bass, 'bass'));
    }
    
    // Mid particles (green) - center
    let midCount = Math.floor(mid * sensitivity * 5);
    for (let i = 0; i < midCount; i++) {
      let x = bounds.x + bounds.width/2 + p.random(-bounds.width/12, bounds.width/12);
      let y = bounds.y + bounds.height - p.random(0, 30);
      particles.push(new SmokeParticle(x, y, mid, 'mid'));
    }
    
    // High particles (blue) - right side
    let highCount = Math.floor(treble * sensitivity * 5);
    for (let i = 0; i < highCount; i++) {
      let x = bounds.x + 3*bounds.width/4 + p.random(-bounds.width/12, bounds.width/12);
      let y = bounds.y + bounds.height - p.random(0, 30);
      particles.push(new SmokeParticle(x, y, treble, 'high'));
    }
  }
  
  // Limit particles for performance
  if (particles.length > 200) {
    particles.splice(0, particles.length - 200);
  }
  
  // Update and draw particles
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].draw();
    if (particles[i].isDead()) {
      particles.splice(i, 1);
    }
  }
  
  // EQ band labels
  p.colorMode(p.HSB);
  p.fill(EQ_COLORS.bass.hue, EQ_COLORS.bass.sat, EQ_COLORS.bass.bright);
  p.textAlign(p.CENTER);
  p.textSize(14);
  p.text('BASS', bounds.x + bounds.width/4, bounds.y + bounds.height - 10);
  p.text('MID', bounds.x + bounds.width/2, bounds.y + bounds.height - 10);
  p.text('HIGH', bounds.x + 3*bounds.width/4, bounds.y + bounds.height - 10);
}

function drawFlockingMode() {
  p.background(0, 20);
  
  let bounds = p.getVisBounds();
  
  // Initialize boids with EQ types if needed
  if (isAudioActive && rms > 0.02 && flockingBoids.length < 60) {
    for (let i = flockingBoids.length; i < 60; i++) {
      let eqType = i < 20 ? 'bass' : (i < 40 ? 'mid' : 'high');
      let x = bounds.x + p.random(bounds.width);
      let y = bounds.y + p.random(bounds.height);
      flockingBoids.push(new Boid(x, y, eqType));
    }
  }
  
  // Update boid energy based on EQ bands
  for (let i = 0; i < flockingBoids.length; i++) {
    let boid = flockingBoids[i];
    if (boid.eqType === 'bass') boid.energy = bass * sensitivity;
    else if (boid.eqType === 'mid') boid.energy = mid * sensitivity;
    else if (boid.eqType === 'high') boid.energy = treble * sensitivity;
  }
  
  // Update and draw boids
  for (let boid of flockingBoids) {
    boid.flock(flockingBoids);
    boid.update();
    boid.draw(p);
  }
  
  // EQ legend - positioned within bounds
  bounds = p.getVisBounds();
  p.fill(EQ_COLORS.bass.hue, EQ_COLORS.bass.sat, EQ_COLORS.bass.bright);
  p.textAlign(p.LEFT);
  p.textSize(12);
  p.text('● BASS', bounds.x + 10, bounds.y + bounds.height - 60);
  
  p.fill(EQ_COLORS.mid.hue, EQ_COLORS.mid.sat, EQ_COLORS.mid.bright);
  p.text('● MID', bounds.x + 10, bounds.y + bounds.height - 40);
  
  p.fill(EQ_COLORS.high.hue, EQ_COLORS.high.sat, EQ_COLORS.high.bright);
  p.text('● HIGH', bounds.x + 10, bounds.y + bounds.height - 20);
}

function drawConnectedMode() {
  p.background(0, 20);
  
  let bounds = p.getVisBounds();
  
  // Generate connected particles based on audio
  if (isAudioActive && rms > 0.01) {
    // Bass particles (red)
    let bassCount = Math.floor(bass * sensitivity * 10);
    for (let i = 0; i < bassCount; i++) {
      let x = bounds.x + p.random(bounds.width);
      let y = bounds.y + p.random(bounds.height);
      connectedParticles.push(new ConnectedParticle(x, y, bass, 'bass'));
    }
    
    // Mid particles (green)
    let midCount = Math.floor(mid * sensitivity * 10);
    for (let i = 0; i < midCount; i++) {
      let x = bounds.x + p.random(bounds.width);
      let y = bounds.y + p.random(bounds.height);
      connectedParticles.push(new ConnectedParticle(x, y, mid, 'mid'));
    }
    
    // High particles (blue)
    let highCount = Math.floor(treble * sensitivity * 10);
    for (let i = 0; i < highCount; i++) {
      let x = bounds.x + p.random(bounds.width);
      let y = bounds.y + p.random(bounds.height);
      connectedParticles.push(new ConnectedParticle(x, y, treble, 'high'));
    }
  }
  
  // Limit total particles for performance
  if (connectedParticles.length > 100) {
    connectedParticles.splice(0, connectedParticles.length - 100);
  }
  
  // Find connections between particles
  for (let particle of connectedParticles) {
    particle.findConnections(connectedParticles);
  }
  
  // Update and draw connected particles
  for (let i = connectedParticles.length - 1; i >= 0; i--) {
    connectedParticles[i].update();
    connectedParticles[i].draw(p);
    if (connectedParticles[i].isDead()) {
      connectedParticles.splice(i, 1);
    }
  }
  
  // EQ legend - positioned within bounds
  bounds = p.getVisBounds();
  p.colorMode(p.HSB);
  p.fill(EQ_COLORS.bass.hue, EQ_COLORS.bass.sat, EQ_COLORS.bass.bright);
  p.textAlign(p.LEFT);
  p.textSize(12);
  p.text('● BASS', bounds.x + 10, bounds.y + bounds.height - 60);
  
  p.fill(EQ_COLORS.mid.hue, EQ_COLORS.mid.sat, EQ_COLORS.mid.bright);
  p.text('● MID', bounds.x + 10, bounds.y + bounds.height - 40);
  
  p.fill(EQ_COLORS.high.hue, EQ_COLORS.high.sat, EQ_COLORS.high.bright);
  p.text('● HIGH', bounds.x + 10, bounds.y + bounds.height - 20);
}

function drawEQMode() {
  p.background(0);
  
  const bounds = p.getVisBounds();
  const barWidth = bounds.width / 5;
  
  // Only show EQ bars when audio is active
  if (isAudioActive) {
    // Draw EQ bars for 5-band analysis
    const bands = [
      { value: subBass, label: 'SUB', x: bounds.x },
      { value: bass, label: 'BASS', x: bounds.x + barWidth },
      { value: lowMid, label: 'LOW MID', x: bounds.x + barWidth * 2 },
      { value: highMid, label: 'HIGH MID', x: bounds.x + barWidth * 3 },
      { value: presence, label: 'PRESENCE', x: bounds.x + barWidth * 4 }
    ];
  
  p.colorMode(p.HSB);
  
  bands.forEach((band, i) => {
    const barHeight = band.value * sensitivity * bounds.height * 0.5;
    const hue = (i * 72 + colorHue) % 360; // Spread colors across spectrum
    
    p.fill(hue, 80, 100);
    p.noStroke();
    p.rect(band.x + 10, bounds.y + bounds.height - barHeight, barWidth - 20, barHeight);
    
    // Band labels
    p.fill(255);
    p.textAlign(p.CENTER);
    p.textSize(10);
    p.text(band.label, band.x + barWidth/2, bounds.y + bounds.height + 15);
  });
  }
}

function drawSeparatedMode() {
  p.background(0);
  
  const bounds = p.getVisBounds();
  
  // Only update waveform when audio is active
  if (isAudioActive) {
    // Store waveform data for scrolling effect
    waveformHistory.push({
      subBass: subBass * sensitivity,
      bass: bass * sensitivity,
      lowMid: lowMid * sensitivity,
      mid: mid * sensitivity,
      highMid: highMid * sensitivity,
      presence: presence * sensitivity,
      treble: treble * sensitivity
    });
  }
  if (waveformHistory.length > bounds.width/3) {
    waveformHistory.shift();
  }
  
  p.colorMode(p.HSB);
  p.strokeWeight(2);
  p.noFill();
  
  // Draw separated EQ waveforms
  const bands = [
    {data: 'subBass', hue: 0, yOffset: bounds.y + bounds.height * 0.1},
    {data: 'bass', hue: 30, yOffset: bounds.y + bounds.height * 0.25},
    {data: 'lowMid', hue: 60, yOffset: bounds.y + bounds.height * 0.4},
    {data: 'highMid', hue: 120, yOffset: bounds.y + bounds.height * 0.55},
    {data: 'presence', hue: 240, yOffset: bounds.y + bounds.height * 0.7}
  ];
  
  bands.forEach((band, bandIndex) => {
    p.stroke(band.hue, 80, 100);
    p.beginShape();
    
    for (let i = 0; i < waveformHistory.length; i++) {
      const x = p.map(i, 0, waveformHistory.length - 1, bounds.x, bounds.x + bounds.width);
      const amplitude = waveformHistory[i][band.data] || 0;
      const y = band.yOffset - amplitude * 80;
      p.vertex(x, y);
    }
    p.endShape();
    
    // Band labels
    p.fill(band.hue, 80, 100);
    p.textAlign(p.LEFT);
    p.textSize(12);
    p.text(band.data.toUpperCase(), bounds.x + 10, band.yOffset - 10);
  });
  
  // Center lines for reference
  p.stroke(0, 0, 30);
  p.strokeWeight(1);
  bands.forEach(band => {
    p.line(bounds.x, band.yOffset, bounds.x + bounds.width, band.yOffset);
  });
}
