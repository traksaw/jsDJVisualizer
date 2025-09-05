// Initialization script for DJ Visualizer
// This ensures all modules are properly initialized when DOM is ready

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize all modules in the correct order
  initializeAudio();
  initializeUI();
  
  console.log('DJ Visualizer initialized successfully');
});

// Also handle the case where DOM is already loaded
if (document.readyState === 'loading') {
  // DOM is still loading, wait for DOMContentLoaded
  document.addEventListener('DOMContentLoaded', function() {
    initializeAudio();
    initializeUI();
  });
} else {
  // DOM is already loaded, initialize immediately
  initializeAudio();
  initializeUI();
}
