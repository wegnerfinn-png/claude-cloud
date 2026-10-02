// Everything you would want to tweak without touching the scene code.
window.CFG = {
  W: 1080,
  H: 1920,
  FPS: 30,

  brand: {
    name: 'PUMPY',
    // Pumpy colour used for the caption bar, pixel stickers, scan ring and phone UI.
    color: '#2E54FF',
    colorDeep: '#1B37C9',
    over: '#FF4D3D',
  },

  // kcal per slice. The pie angles are derived from these, so the chart stays honest.
  kcal: {
    oil: 120,        // 1 tbsp olive oil
    latte: 190,      // medium oat latte
    nuts: 180,       // 30 g almonds
    bites: 160,      // tasting while cooking
    breakfast: 430,
    lunch: 640,
    dinner: 780,
  },
  budget: 2200,

  // Caption bar, measured from the reference (scaled 720 -> 1080).
  caption: { y: 442, size: 61, padX: 22, padY: 14, radius: 12 },

  // Optional real app screen (828x1792 RPReplay frame, no camera view). If the file
  // is missing the built-in mock screen is drawn instead.
  appScreen: 'assets/app-screen.png',
};
