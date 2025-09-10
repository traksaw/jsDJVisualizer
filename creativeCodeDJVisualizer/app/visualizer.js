class DJVisualizer {
  constructor() {
    this.p5Instance = null;
    this.audioData = {
      rms: 0,
      bass: 0,
      mid: 0,
      treble: 0,
      spectrum: []
    };
    this.w = 0;
    this.h = 0;
    this.currentMode = 'spectrum';
    this.asciify = null;
    this.particles = [];
    this.time = 0;
  }

  init() {
    // Initialize spectrum visualizer
    this.initSpectrumVisualizer();
    
    // Initialize frequency band displays
    this.bassFill = document.querySelector(".bass-fill");
    this.midFill = document.querySelector(".mid-fill");
    this.highFill = document.querySelector(".high-fill");
    
    // Initialize visualization mode selector
    this.visualModeSelect = document.getElementById('visualMode');
    this.visualModeSelect.addEventListener('change', (e) => {
      this.currentMode = e.target.value;
      console.log('Visualization mode changed to:', this.currentMode);
      this.initializeParticles();
    });
    
    this.p5Instance = new p5((p) => {
      p.setup = () => {
        const container = document.querySelector('.visualizer-container');
        this.w = container.clientWidth;
        this.h = container.clientHeight;
        const canvas = p.createCanvas(this.w, this.h, p.WEBGL);
        canvas.parent('p5-canvas');
        p.frameRate(60);
        
        // Initialize ASCII renderer for ASCII mode
        if (typeof p5Asciify !== 'undefined') {
          this.asciify = new p5Asciify();
          this.asciify.setup(p);
        }
        
        this.initializeParticles();
      };

      p.windowResized = () => {
        const container = document.querySelector('.visualizer-container');
        this.w = container.clientWidth;
        this.h = container.clientHeight;
        p.resizeCanvas(this.w, this.h);
      };

      p.draw = () => {
        this.draw(p);
      };
    });
  }

  initializeParticles() {
    this.particles = [];
    for (let i = 0; i < 50; i++) {
      this.particles.push({
        x: Math.random() * this.w - this.w/2,
        y: Math.random() * this.h - this.h/2,
        z: Math.random() * 200 - 100,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        vz: (Math.random() - 0.5) * 2,
        size: Math.random() * 5 + 2
      });
    }
  }

  initSpectrumVisualizer() {
    this.spectrumContainer = document.getElementById('spectrum-visualizer');
    this.spectrumBars = [];
  }

  updateAudioData(data) {
    this.audioData = { ...data };
    // Debug: Log audio data occasionally
    if (Math.random() < 0.01) {
      console.log('Audio data:', {
        rms: this.audioData.rms,
        bass: this.audioData.bass,
        mid: this.audioData.mid,
        treble: this.audioData.treble,
        spectrumLength: this.audioData.spectrum?.length || 0
      });
    }
  }

  draw(p) {
    this.time += 0.01;
    
    // Update frequency band displays (always show these)
    this.updateFrequencyDisplay();
    
    // Handle spectrum mode separately (HTML-based)
    if (this.currentMode === 'spectrum') {
      this.updateSpectrumBars();
      this.hideP5Canvas();
      return;
    } else {
      this.hideSpectrumBars();
      this.showP5Canvas();
    }
    
    // Clear canvas and draw based on selected mode
    if (this.currentMode === 'ascii' && this.asciify) {
      this.asciify.pre();
    } else {
      p.background(0, 0, 0, 30);
    }
    
    // Draw visualization based on current mode
    switch (this.currentMode) {
      case 'particles':
        this.drawFloatingParticles3D(p);
        break;
      case 'rings':
        this.drawFrequencyRings3D(p);
        break;
      case 'ascii':
        this.drawASCIIMode(p);
        break;
      case 'waves':
        this.drawAudioWaves(p);
        break;
      case 'mandala':
        this.drawMandala(p);
        break;
      case 'tunnel':
        this.drawTunnel(p);
        break;
      case 'galaxy':
        this.drawGalaxy(p);
        break;
      default:
        this.drawFloatingParticles3D(p);
    }
    
    // Apply ASCII effect if in ASCII mode
    if (this.currentMode === 'ascii' && this.asciify) {
      this.asciify.post();
    }
  }

  updateSpectrumBars() {
    if (!this.audioData.spectrum || this.audioData.spectrum.length === 0) return;
    
    // Create bars if they don't exist
    if (this.spectrumBars.length === 0) {
      this.createSpectrumBars();
    }
    
    // Update bar heights
    for (let i = 0; i < this.spectrumBars.length && i < this.audioData.spectrum.length; i++) {
      const value = this.audioData.spectrum[i];
      const height = (value * 100);
      this.spectrumBars[i].style.height = `${height}%`;
    }
  }

  createSpectrumBars() {
    if (!this.audioData.spectrum) return;
    
    // Clear existing bars
    this.spectrumContainer.innerHTML = '';
    this.spectrumBars = [];
    
    const numBars = Math.min(this.audioData.spectrum.length, 256); // Limit for performance
    
    for (let i = 0; i < numBars; i++) {
      const bar = document.createElement('div');
      this.spectrumContainer.appendChild(bar);
      this.spectrumBars.push(bar);
    }
  }

  updateFrequencyDisplay() {
    if (!this.bassFill || !this.midFill || !this.highFill) return;
    
    // Update frequency band level bars
    this.bassFill.style.width = `${Math.min(this.audioData.bass * 100, 100)}%`;
    this.midFill.style.width = `${Math.min(this.audioData.mid * 100, 100)}%`;
    this.highFill.style.width = `${Math.min(this.audioData.treble * 100, 100)}%`;
  }

  drawCreativeVisuals(p) {
    // Only draw if audio is active
    if (!this.audioData.isActive || this.audioData.rms < 0.001) {
      return;
    }

    // Draw subtle creative elements over the spectrum
    this.drawFloatingParticles(p);
    this.drawFrequencyRings(p);
  }

  drawFloatingParticles(p) {
    // Bass-driven particles
    if (this.audioData.bass > 0.05) {
      p.fill(255, 107, 107, 100);
      for (let i = 0; i < 3; i++) {
        const x = p.random(this.w * 0.1, this.w * 0.3);
        const y = p.random(this.h * 0.7, this.h * 0.9);
        const size = this.audioData.bass * 20;
        p.ellipse(x, y, size, size);
      }
    }

    // Mid-driven particles
    if (this.audioData.mid > 0.1) {
      p.fill(78, 205, 196, 120);
      for (let i = 0; i < 5; i++) {
        const x = p.random(this.w * 0.4, this.w * 0.6);
        const y = p.random(this.h * 0.3, this.h * 0.7);
        const size = this.audioData.mid * 15;
        p.ellipse(x, y, size, size);
      }
    }

    // Treble sparkles
    if (this.audioData.treble > 0.08) {
      p.fill(69, 183, 209, 150);
      for (let i = 0; i < 8; i++) {
        const x = p.random(this.w * 0.7, this.w * 0.9);
        const y = p.random(this.h * 0.1, this.h * 0.4);
        const size = this.audioData.treble * 10;
        p.ellipse(x, y, size, size);
      }
    }
  }

  drawFrequencyRings(p) {
    // Central frequency ring
    p.push();
    p.translate(this.w / 2, this.h / 2);
    p.noFill();
    p.strokeWeight(2);
    
    // RMS-driven main ring
    const mainRadius = this.audioData.rms * 100;
    p.stroke(255, 255, 255, 100);
    p.ellipse(0, 0, mainRadius * 2, mainRadius * 2);
    
    // Frequency-specific rings
    if (this.audioData.bass > 0.03) {
      p.stroke(255, 107, 107, 80);
      p.ellipse(0, 0, (mainRadius + this.audioData.bass * 30) * 2, (mainRadius + this.audioData.bass * 30) * 2);
    }
    
    if (this.audioData.mid > 0.05) {
      p.stroke(78, 205, 196, 80);
      p.ellipse(0, 0, (mainRadius + this.audioData.mid * 25) * 2, (mainRadius + this.audioData.mid * 25) * 2);
    }
    
    if (this.audioData.treble > 0.04) {
      p.stroke(69, 183, 209, 80);
      p.ellipse(0, 0, (mainRadius + this.audioData.treble * 20) * 2, (mainRadius + this.audioData.treble * 20) * 2);
    }
    
    p.pop();
  }

  drawCenterPulse(p) {
    // RMS-driven center circle - the "heart" that unifies all frequencies
    const r = p.map(this.audioData.rms, 0, 0.3, 20, Math.min(this.w, this.h) / 2, true);
    
    p.push();
    p.translate(this.w / 2, this.h / 2);
    
    // Main pulse circle
    p.fill(255, 200);
    p.ellipse(0, 0, r * 2, r * 2);
    
    // Add subtle frequency-colored rings around the center
    const bassRing = p.map(this.audioData.bass, 0, 0.10, 0, 30);
    const midRing = p.map(this.audioData.mid, 0, 0.05, 0, 20);
    const trebleRing = p.map(this.audioData.treble, 0, 0.02, 0, 15);
    
    p.noFill();
    p.strokeWeight(2);
    
    p.stroke(255, 80, 80, 150);
    p.ellipse(0, 0, (r + bassRing) * 2, (r + bassRing) * 2);
    
    p.stroke(80, 255, 120, 150);
    p.ellipse(0, 0, (r + midRing) * 2, (r + midRing) * 2);
    
    p.stroke(120, 160, 255, 150);
    p.ellipse(0, 0, (r + trebleRing) * 2, (r + trebleRing) * 2);
    
    p.pop();
  }

  drawFrequencyBars(p) {
    // Three-band bars that work as puzzle pieces
    const barW = this.w / 6;
    const maxH = this.h * 0.6;
    
    // Less sensitive scaling for better dynamic range
    const bassH = p.constrain(p.map(this.audioData.bass, 0, 0.25, 0, maxH), 0, maxH);
    const midH = p.constrain(p.map(this.audioData.mid, 0, 0.30, 0, maxH), 0, maxH);
    const trebH = p.constrain(p.map(this.audioData.treble, 0, 0.20, 0, maxH), 0, maxH);

    p.noStroke();

    // Bass - Left side (warm red)
    p.fill(255, 80, 80);
    p.rect(this.w * 0.2 - barW / 2, this.h - bassH, barW, bassH);

    // Mid - Center (vibrant green)
    p.fill(80, 255, 120);
    p.rect(this.w * 0.5 - barW / 2, this.h - midH, barW, midH);

    // Treble - Right side (cool blue)
    p.fill(120, 160, 255);
    p.rect(this.w * 0.8 - barW / 2, this.h - trebH, barW, trebH);

    // Add frequency labels for DJ context
    this.drawFrequencyLabels(p);
  }

  drawFrequencyLabels(p) {
    p.fill(255, 150);
    p.textAlign(p.CENTER);
    p.textSize(12);
    
    const labelY = this.h - 10;
    
    p.text('BASS', this.w * 0.2, labelY);
    p.text('MID', this.w * 0.5, labelY);
    p.text('HIGH', this.w * 0.8, labelY);
  }

  drawFloatingParticles3D(p) {
    if (!this.audioData.spectrum || this.audioData.spectrum.length === 0) {
      // Show particles even without audio data for testing
      this.drawFallbackParticles(p);
      return;
    }
    
    // Update particles based on audio
    for (let particle of this.particles) {
      particle.x += particle.vx + this.audioData.bass * 2;
      particle.y += particle.vy + this.audioData.mid * 2;
      particle.z += particle.vz + this.audioData.treble * 2;
      
      // Wrap around screen
      if (particle.x > this.w/2) particle.x = -this.w/2;
      if (particle.x < -this.w/2) particle.x = this.w/2;
      if (particle.y > this.h/2) particle.y = -this.h/2;
      if (particle.y < -this.h/2) particle.y = this.h/2;
      if (particle.z > 100) particle.z = -100;
      if (particle.z < -100) particle.z = 100;
    }
    
    // Draw particles
    for (let particle of this.particles) {
      p.push();
      p.translate(particle.x, particle.y, particle.z);
      
      const intensity = this.audioData.rms * 255;
      p.fill(255, intensity, intensity * 0.5, 200);
      p.noStroke();
      
      const size = particle.size + this.audioData.rms * 10;
      p.sphere(size);
      p.pop();
    }
  }

  drawFrequencyRings3D(p) {
    if (!this.audioData.spectrum || this.audioData.spectrum.length === 0) return;
    
    const rings = 10;
    for (let i = 0; i < rings; i++) {
      p.push();
      p.rotateX(this.time + i * 0.1);
      p.rotateY(this.time * 0.5 + i * 0.2);
      
      const freqIndex = Math.floor(p.map(i, 0, rings, 0, this.audioData.spectrum.length));
      const amplitude = this.audioData.spectrum[freqIndex] || 0;
      
      p.stroke(255, 255 - amplitude * 200, amplitude * 255);
      p.strokeWeight(2);
      p.noFill();
      
      const radius = 50 + i * 20 + amplitude * 100;
      p.circle(0, 0, radius);
      p.pop();
    }
  }

  drawASCIIMode(p) {
    if (!this.audioData.spectrum || this.audioData.spectrum.length === 0) return;
    
    // Draw simple shapes for ASCII conversion
    p.fill(255, 255, 0);
    p.noStroke();
    
    const bassRadius = this.audioData.bass * 200;
    const midRadius = this.audioData.mid * 150;
    const trebleRadius = this.audioData.treble * 100;
    
    // Draw concentric circles based on frequency bands
    p.sphere(bassRadius);
    p.fill(0, 255, 255);
    p.sphere(midRadius);
    p.fill(255, 0, 255);
    p.sphere(trebleRadius);
  }

  drawAudioWaves(p) {
    if (!this.audioData.spectrum || this.audioData.spectrum.length === 0) return;
    
    p.stroke(255, 255, 0);
    p.strokeWeight(2);
    p.noFill();
    
    // Draw 3D waveform
    p.beginShape();
    for (let i = 0; i < this.audioData.spectrum.length; i += 4) {
      const x = p.map(i, 0, this.audioData.spectrum.length - 1, -this.w/2, this.w/2);
      const y = this.audioData.spectrum[i] * 200 * Math.sin(this.time + i * 0.1);
      const z = this.audioData.spectrum[i] * 100 * Math.cos(this.time + i * 0.1);
      p.vertex(x, y, z);
    }
    p.endShape();
    
    // Add bass wave
    p.stroke(255, 100, 100);
    p.beginShape();
    for (let x = -this.w/2; x < this.w/2; x += 10) {
      const y = this.audioData.bass * 100 * Math.sin(this.time * 2 + x * 0.02);
      const z = this.audioData.bass * 50 * Math.cos(this.time * 3 + x * 0.01);
      p.vertex(x, y, z);
    }
    p.endShape();
  }

  drawMandala(p) {
    if (!this.audioData.spectrum || this.audioData.spectrum.length === 0) return;
    
    const segments = 12;
    for (let i = 0; i < segments; i++) {
      p.push();
      p.rotateY((p.TWO_PI / segments) * i);
      p.rotateX(this.time * 0.5);
      
      // Draw petal based on frequency data
      const freqIndex = Math.floor(p.map(i, 0, segments, 0, this.audioData.spectrum.length));
      const amplitude = this.audioData.spectrum[freqIndex] || 0;
      
      p.stroke(255, 255 - amplitude * 255, amplitude * 255);
      p.strokeWeight(2);
      p.noFill();
      
      p.beginShape();
      for (let j = 0; j < 20; j++) {
        const r = amplitude * 150 + 20;
        const angle = j * 0.3 + this.time;
        const x = r * Math.cos(angle);
        const y = r * Math.sin(angle) * 0.5;
        const z = r * Math.sin(angle * 2) * 0.3;
        p.vertex(x, y, z);
      }
      p.endShape();
      
      p.pop();
    }
  }

  drawTunnel(p) {
    if (!this.audioData.spectrum || this.audioData.spectrum.length === 0) return;
    
    const rings = 20;
    for (let i = 0; i < rings; i++) {
      p.push();
      const z = p.map(i, 0, rings, -200, 200);
      p.translate(0, 0, z);
      
      const freqIndex = Math.floor(p.map(i, 0, rings, 0, this.audioData.spectrum.length));
      const amplitude = this.audioData.spectrum[freqIndex] || 0;
      
      p.stroke(255 - i * 10, 255, amplitude * 255);
      p.strokeWeight(3);
      p.noFill();
      
      const radius = 50 + amplitude * 100 + Math.sin(this.time + i * 0.5) * 20;
      p.circle(0, 0, radius);
      p.pop();
    }
  }

  drawGalaxy(p) {
    if (!this.audioData.spectrum || this.audioData.spectrum.length === 0) return;
    
    p.push();
    p.rotateY(this.time * 0.2);
    p.rotateX(this.time * 0.1);
    
    // Draw spiral arms
    const arms = 3;
    for (let arm = 0; arm < arms; arm++) {
      const armAngle = (p.TWO_PI / arms) * arm;
      
      for (let i = 0; i < 50; i++) {
        const angle = armAngle + i * 0.4 + this.time;
        const radius = i * 5 + this.audioData.bass * 50;
        
        const freqIndex = Math.floor(p.map(i, 0, 50, 0, this.audioData.spectrum.length));
        const amplitude = this.audioData.spectrum[freqIndex] || 0;
        
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        const z = amplitude * 100 - 50;
        
        p.push();
        p.translate(x, y, z);
        p.fill(255, 255 - amplitude * 200, amplitude * 255, 150);
        p.noStroke();
        p.sphere(2 + amplitude * 8);
        p.pop();
      }
    }
    
    // Central core
    p.fill(255, 255, 0, 200);
    p.noStroke();
    p.sphere(20 + this.audioData.bass * 30);
    
    p.pop();
  }

  drawFallbackParticles(p) {
    // Draw simple animated particles for testing when no audio data
    for (let particle of this.particles) {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.z += particle.vz;
      
      // Wrap around screen
      if (particle.x > this.w/2) particle.x = -this.w/2;
      if (particle.x < -this.w/2) particle.x = this.w/2;
      if (particle.y > this.h/2) particle.y = -this.h/2;
      if (particle.y < -this.h/2) particle.y = this.h/2;
      if (particle.z > 100) particle.z = -100;
      if (particle.z < -100) particle.z = 100;
    }
    
    // Draw particles
    for (let particle of this.particles) {
      p.push();
      p.translate(particle.x, particle.y, particle.z);
      
      p.fill(255, 100, 100, 200);
      p.noStroke();
      
      p.sphere(particle.size);
      p.pop();
    }
  }

  hideSpectrumBars() {
    const spectrumContainer = document.getElementById('spectrum-visualizer');
    if (spectrumContainer) {
      spectrumContainer.style.display = 'none';
    }
  }

  showSpectrumBars() {
    const spectrumContainer = document.getElementById('spectrum-visualizer');
    if (spectrumContainer) {
      spectrumContainer.style.display = 'flex';
    }
  }

  hideP5Canvas() {
    const p5Container = document.getElementById('p5-canvas');
    if (p5Container) {
      p5Container.style.display = 'none';
    }
  }

  showP5Canvas() {
    const p5Container = document.getElementById('p5-canvas');
    if (p5Container) {
      p5Container.style.display = 'block';
    }
  }

  destroy() {
    if (this.p5Instance) {
      this.p5Instance.remove();
    }
  }
}
