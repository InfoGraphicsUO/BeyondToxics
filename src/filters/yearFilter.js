import { updateFilters } from './mainFilter.js';
import appState from '../state.js';

// Initialize year slider for year range
export function initializeYearSlider() {
  const sliderElement = document.getElementById('yearSlider');

  if (!sliderElement) {
    console.error('Year slider element not found');
    return;
  }

  noUiSlider.create(sliderElement, {
    start: [2014, 2024],
    connect: true,
    tooltips: [true, true],
    range: {
      'min': 2014,
      'max': 2024
    },
    step: 1,
    format: {
      to: function(value) {
        return Math.round(value);
      },
      from: function(value) {
        return Number(value);
      }
    }
  });

  appState.yearSlider = sliderElement.noUiSlider;

  // Update filters when slider values change
  appState.yearSlider.on('update', function(values) {
    updateFilters();
  });
}