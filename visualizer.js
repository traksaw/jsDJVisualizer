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
  }

  init() {
    this.p5Instance = new p5((p) => {
      p.setup = () => {
        this.w = p.windowWidth;
        this.h = p.windowHeight;
        p.createCanvas(this.w, this.h);
        p.frameRate(60);
        p.noStroke();
      };

      p.windowResized = () => {
        this.w = p.windowWidth;
        this.h = p.windowHeight;
        p.resizeCanvas(this.w, this.h);
      };

      p.draw = () => {
        this.draw(p);
      };
    });
  }

  updateAudioData(data) {
    this.audioData = { ...data };
  }

  draw(p) {
    // Background with slight fade for trails
    p.fill(0, 40);
    p.rect(0, 0, this.w, this.h);

    // Draw the three frequency bands as complementary puzzle pieces
    this.drawCenterPulse(p);
    this.drawFrequencyBars(p);
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
    
    // Balanced scaling for neutral EQ position (12 o'clock)
    // Using similar scaling ranges to match mixer behavior
    const bassH = p.constrain(p.map(this.audioData.bass, 0, 0.08, 0, maxH), 0, maxH);
    const midH = p.constrain(p.map(this.audioData.mid, 0, 0.08, 0, maxH), 0, maxH);
    const trebH = p.constrain(p.map(this.audioData.treble, 0, 0.08, 0, maxH), 0, maxH);

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

  destroy() {
    if (this.p5Instance) {
      this.p5Instance.remove();
    }
  }
}
