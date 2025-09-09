// Visualization modes for DJ Visualizer

// Global visualization state
let particles = [];
let flockingBoids = [];
let connectedParticles = [];
let waveformHistory = [];

// Visualization mode functions
function drawSmokeMode() {
  // Dynamic background opacity based on overall energy
  const bgOpacity = 20 + (rms * 30); // More energy = more persistent trails
  p.background(0, bgOpacity);
  
  const bounds = p.getVisBounds();
  
  // Only run visualization when audio is active
  if (!isAudioActive) {
    particles = []; // Clear particles when audio stops
    return;
  }
  
  // EQ-responsive background effects
  if (rms > 0.01) {
    // Bass creates screen shake effect
    if (bass > 0.3) {
      const shakeX = p.random(-bass * 3, bass * 3);
      const shakeY = p.random(-bass * 3, bass * 3);
      p.translate(shakeX, shakeY);
    }
    
    // High frequencies create background sparkles (reduced)
    if (treble > 0.3) { // Higher threshold
      p.push();
      p.colorMode(p.HSB);
      for (let i = 0; i < treble * 8; i++) { // Reduced from 20 to 8
        p.fill(EQ_COLORS.high.hue, EQ_COLORS.high.sat, EQ_COLORS.high.bright, treble * 60); // Reduced opacity
        p.noStroke();
        p.ellipse(p.random(bounds.width), p.random(bounds.height), 1, 1); // Smaller size
      }
      p.pop();
    }
    
    // Bass particles (red) - left side with reduced sensitivity
    let bassCount = Math.floor(bass * sensitivity * 3); // Reduced from 8 to 3
    const bassSpread = bounds.width/12 + (bass * bounds.width/12); // Reduced spread
    for (let i = 0; i < bassCount; i++) {
      let x = bounds.x + bounds.width/4 + p.random(-bassSpread, bassSpread);
      let y = bounds.y + bounds.height - p.random(0, 30 + bass * 25); // Reduced height variation
      particles.push(new SmokeParticle(x, y, bass, 'bass'));
    }
    
    // Mid particles (green) - center with reduced sensitivity
    let midCount = Math.floor(mid * sensitivity * 3); // Reduced from 8 to 3
    const midSpread = bounds.width/12 + (mid * bounds.width/10); // Reduced spread
    for (let i = 0; i < midCount; i++) {
      let x = bounds.x + bounds.width/2 + p.random(-midSpread, midSpread);
      let y = bounds.y + bounds.height - p.random(0, 30 + mid * 20); // Reduced height
      particles.push(new SmokeParticle(x, y, mid, 'mid'));
    }
    
    // High particles (blue) - right side with controlled generation
    let highCount = Math.floor(treble * sensitivity * 4); // Reduced from 12 to 4
    const highSpread = bounds.width/12 + (treble * bounds.width/8); // Reduced spread
    for (let i = 0; i < highCount; i++) {
      let x = bounds.x + 3*bounds.width/4 + p.random(-highSpread, highSpread);
      let y = bounds.y + bounds.height - p.random(0, 30 + treble * 30); // Reduced height
      particles.push(new SmokeParticle(x, y, treble, 'high'));
    }
  }
  
  // Limit particles for performance
  if (particles.length > 200) {
    particles.splice(0, particles.length - 200);
  }
  
  // Update and draw particles with EQ-responsive effects
  for (let i = particles.length - 1; i >= 0; i--) {
    const particle = particles[i];
    if (particle && typeof particle.update === 'function') {
      // Use enhanced EQ update if available, otherwise fallback to regular update
      if (particle.updateWithEQ) {
        particle.updateWithEQ(bass, mid, treble);
      } else {
        particle.update();
      }
      particle.draw();
      if (particle.isDead()) {
        particles.splice(i, 1);
      }
    } else {
      // Remove invalid particles
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
  // EQ-responsive background
  const bgOpacity = 20 + (rms * 25);
  p.background(0, bgOpacity);
  
  let bounds = p.getVisBounds();
  
  // Only run visualization when audio is active
  if (!isAudioActive) {
    flockingBoids = []; // Clear boids when audio stops
    return;
  }
  
  // EQ-responsive background effects
  if (rms > 0.01) {
    // Bass creates subtle screen pulse
    if (bass > 0.4) {
      p.push();
      p.colorMode(p.HSB);
      p.fill(EQ_COLORS.bass.hue, EQ_COLORS.bass.sat, EQ_COLORS.bass.bright, bass * 20);
      p.noStroke();
      const pulseSize = bounds.width * bass * 0.1;
      p.ellipse(bounds.x + bounds.width/2, bounds.y + bounds.height/2, pulseSize, pulseSize);
      p.pop();
    }
  }
  
  // Dynamic boid count based on EQ levels (reduced sensitivity)
  const targetBoidCount = Math.floor(20 + (bass + mid + treble) * sensitivity * 8);
  
  // Initialize boids with EQ types if needed
  if (rms > 0.02 && flockingBoids.length < targetBoidCount) {
    for (let i = flockingBoids.length; i < Math.min(targetBoidCount, 80); i++) {
      // EQ levels determine boid type distribution
      let eqType;
      const totalEQ = bass + mid + treble;
      const bassRatio = bass / totalEQ;
      const midRatio = mid / totalEQ;
      
      const rand = p.random();
      if (rand < bassRatio) eqType = 'bass';
      else if (rand < bassRatio + midRatio) eqType = 'mid';
      else eqType = 'high';
      
      let x = bounds.x + p.random(bounds.width);
      let y = bounds.y + p.random(bounds.height);
      flockingBoids.push(new Boid(x, y, eqType));
    }
  }
  
  // Update boid energy and behavior based on EQ bands
  for (let i = 0; i < flockingBoids.length; i++) {
    let boid = flockingBoids[i];
    if (boid.eqType === 'bass') {
      boid.energy = bass * sensitivity;
      boid.maxSpeed = 2 + bass * 3; // Bass affects speed
    } else if (boid.eqType === 'mid') {
      boid.energy = mid * sensitivity;
      boid.maxSpeed = 3 + mid * 2;
    } else if (boid.eqType === 'high') {
      boid.energy = treble * sensitivity;
      boid.maxSpeed = 4 + treble * 4; // High frequencies are fastest
    }
  }
  
  // Update and draw boids with null checks
  for (let i = flockingBoids.length - 1; i >= 0; i--) {
    const boid = flockingBoids[i];
    if (boid && typeof boid.update === 'function') {
      boid.flock(flockingBoids);
      boid.update();
      boid.draw(p);
    } else {
      // Remove invalid boids
      flockingBoids.splice(i, 1);
    }
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
  // EQ-responsive background with connection grid
  const bgOpacity = 15 + (rms * 35);
  p.background(0, bgOpacity);
  
  let bounds = p.getVisBounds();
  
  // Only run visualization when audio is active
  if (!isAudioActive) {
    connectedParticles = []; // Clear particles when audio stops
    return;
  }
  
  // EQ-responsive background grid
  if (mid > 0.3) {
    p.push();
    p.colorMode(p.HSB);
    p.stroke(EQ_COLORS.mid.hue, EQ_COLORS.mid.sat, EQ_COLORS.mid.bright, mid * 50);
    p.strokeWeight(1);
    
    const gridSize = 50 - (mid * 20); // EQ affects grid density
    for (let x = bounds.x; x < bounds.x + bounds.width; x += gridSize) {
      p.line(x, bounds.y, x, bounds.y + bounds.height);
    }
    for (let y = bounds.y; y < bounds.y + bounds.height; y += gridSize) {
      p.line(bounds.x, y, bounds.x + bounds.width, y);
    }
    p.pop();
  }
  
  // Generate connected particles with EQ-responsive positioning
  if (rms > 0.01) {
    // Bass particles (red) - prefer bottom area (reduced sensitivity)
    let bassCount = Math.floor(bass * sensitivity * 4); // Reduced from 12 to 4
    for (let i = 0; i < bassCount; i++) {
      let x = bounds.x + p.random(bounds.width);
      let y = bounds.y + bounds.height * 0.6 + p.random(bounds.height * 0.4); // Bottom bias
      connectedParticles.push(new ConnectedParticle(x, y, bass, 'bass'));
    }
    
    // Mid particles (green) - center area (reduced sensitivity)
    let midCount = Math.floor(mid * sensitivity * 5); // Reduced from 15 to 5
    for (let i = 0; i < midCount; i++) {
      let x = bounds.x + bounds.width * 0.2 + p.random(bounds.width * 0.6);
      let y = bounds.y + bounds.height * 0.3 + p.random(bounds.height * 0.4); // Center bias
      connectedParticles.push(new ConnectedParticle(x, y, mid, 'mid'));
    }
    
    // High particles (blue) - top area (reduced sensitivity)
    let highCount = Math.floor(treble * sensitivity * 6); // Reduced from 18 to 6
    for (let i = 0; i < highCount; i++) {
      let x = bounds.x + p.random(bounds.width);
      let y = bounds.y + p.random(bounds.height * 0.5); // Top bias
      connectedParticles.push(new ConnectedParticle(x, y, treble, 'high'));
    }
  }
  
  // Limit total particles for performance
  if (connectedParticles.length > 100) {
    connectedParticles.splice(0, connectedParticles.length - 100);
  }
  
  // Find connections between particles with EQ-responsive connection distance
  const baseConnectionDistance = 80;
  const eqBoost = (bass + mid + treble) / 3;
  const connectionDistance = baseConnectionDistance + (eqBoost * 40);
  
  for (let particle of connectedParticles) {
    if (particle && typeof particle.findConnections === 'function') {
      particle.findConnections(connectedParticles, connectionDistance);
    }
  }
  
  // Update and draw connected particles with null checks
  for (let i = connectedParticles.length - 1; i >= 0; i--) {
    const particle = connectedParticles[i];
    if (particle && typeof particle.update === 'function') {
      particle.update();
      particle.draw(p);
      if (particle.isDead()) {
        connectedParticles.splice(i, 1);
      }
    } else {
      // Remove invalid particles
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
  if (!isAudioActive) {
    return;
  }
  
  // Draw enhanced EQ bars with visual effects
  const bands = [
    { value: subBass, label: 'SUB', x: bounds.x },
    { value: bass, label: 'BASS', x: bounds.x + barWidth },
    { value: lowMid, label: 'LOW MID', x: bounds.x + barWidth * 2 },
    { value: highMid, label: 'HIGH MID', x: bounds.x + barWidth * 3 },
    { value: presence, label: 'PRESENCE', x: bounds.x + barWidth * 4 }
  ];

  p.colorMode(p.HSB);
  
  bands.forEach((band, i) => {
    const barHeight = band.value * sensitivity * bounds.height * 0.6;
    const hue = (i * 72 + colorHue) % 360;
    
    // Enhanced visual effects based on EQ level
    const intensity = band.value * sensitivity;
    
    // Glow effect for high energy
    if (intensity > 0.3) {
      p.fill(hue, 60, 80, 0.3);
      p.rect(band.x + 5, bounds.y + bounds.height - barHeight - 10, barWidth - 10, barHeight + 20, 5);
    }
    
    // Main bar with pulsing effect
    const pulse = 1 + (p.sin(p.millis() * 0.01 + i) * intensity * 0.2);
    p.fill(hue, 80, 100);
    p.noStroke();
    
    // Multiple layers for depth
    p.rect(band.x + 10, bounds.y + bounds.height - barHeight, barWidth - 20, barHeight, 3);
    
    // Highlight layer
    if (intensity > 0.2) {
      p.fill(hue, 40, 100, intensity * 200);
      p.rect(band.x + 12, bounds.y + bounds.height - barHeight * 0.8, (barWidth - 24) * pulse, barHeight * 0.6, 2);
    }
    
    // Peak indicators
    if (intensity > 0.7) {
      p.fill(0, 0, 100);
      p.rect(band.x + 10, bounds.y + bounds.height - barHeight - 5, barWidth - 20, 3);
    }
    
    // Band labels with EQ-responsive brightness
    p.fill(0, 0, 100 + intensity * 155);
    p.textAlign(p.CENTER);
    p.textSize(10 + intensity * 2);
    p.text(band.label, band.x + barWidth/2, bounds.y + bounds.height + 15);
    
    // Value display
    p.textSize(8);
    p.text(band.value.toFixed(2), band.x + barWidth/2, bounds.y + bounds.height + 30);
  });
}

function drawSeparatedMode() {
  p.background(0);
  
  const bounds = p.getVisBounds();
  
  // Only run visualization when audio is active
  if (!isAudioActive) {
    waveformHistory = []; // Clear waveform history when audio stops
    return;
  }
  
  // Only update waveform when audio is active
  if (true) {
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
    {data: 'subBass', hue: (0 + colorHue) % 360, yOffset: bounds.y + bounds.height * 0.1},
    {data: 'bass', hue: (30 + colorHue) % 360, yOffset: bounds.y + bounds.height * 0.25},
    {data: 'lowMid', hue: (60 + colorHue) % 360, yOffset: bounds.y + bounds.height * 0.4},
    {data: 'highMid', hue: (120 + colorHue) % 360, yOffset: bounds.y + bounds.height * 0.55},
    {data: 'presence', hue: (240 + colorHue) % 360, yOffset: bounds.y + bounds.height * 0.7}
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

function drawSpectrumMode() {
  p.background(0);
  
  const bounds = p.getVisBounds();
  
  // Check if we have valid spectrum data
  if (!spectrum || spectrum.length === 0) {
    return;
  }
  const spaceBetweenBars = bounds.width / spectrum.length;
  
  p.colorMode(p.HSB, 360, 100, 100);
  p.noStroke();
  
  // Draw frequency spectrum bars
  for (let i = 0; i < spectrum.length; i++) {
    // Map amplitude to bar height
    const amplitude = spectrum[i];
    const barHeight = p.map(amplitude, 0, 255, 0, bounds.height * 0.8);
    
    // Create color based on frequency position and amplitude
    const hue = p.map(i, 0, spectrum.length, 0, 360);
    const saturation = 80 + (amplitude / 255) * 20;
    const brightness = 60 + (amplitude / 255) * 40;
    
    p.fill(hue, saturation, brightness);
    
    // Draw bar from bottom up
    const x = bounds.x + (i * spaceBetweenBars);
    const y = bounds.y + bounds.height - barHeight;
    
    p.rect(x, y, spaceBetweenBars * 0.8, barHeight);
    
    // Add EQ-responsive glow effect for high amplitudes
    if (amplitude > 100) {
      p.fill(hue, saturation * 0.5, brightness, 0.3);
      p.rect(x - 2, y - 2, spaceBetweenBars * 0.8 + 4, barHeight + 4);
    }
  }
  
  // Add symmetric spectrum on top (flipped)
  for (let i = 0; i < spectrum.length; i++) {
    const amplitude = spectrum[i];
    const barHeight = p.map(amplitude, 0, 255, 0, bounds.height * 0.3);
    
    const hue = p.map(i, 0, spectrum.length, 0, 360);
    const saturation = 60 + (amplitude / 255) * 20;
    const brightness = 40 + (amplitude / 255) * 30;
    
    p.fill(hue, saturation, brightness, 0.7);
    
    const x = bounds.x + (i * spaceBetweenBars);
    const y = bounds.y;
    
    p.rect(x, y, spaceBetweenBars * 0.8, barHeight);
  }
  
  p.colorMode(p.RGB, 255);
}
