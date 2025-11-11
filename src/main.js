import { map } from './mapSetup.js';
import { initializeInsetMap } from './components/insetMap.js';
import { initializeMapControls } from './components/mapControls.js';
import { addPesticideLayers } from './components/pesticideLayer.js';
import { addFederalLandsLayers, toggleFederalLands } from './components/federalLandsLayer.js';
import { initializeYearSlider } from './filters/yearFilter.js';
import { setupMethodFilter } from './filters/methodFilter.js';
import { loadChemicalFilter } from './filters/chemicalFilter.js';
import { updateFilters } from './filters/mainFilter.js';

// 1. Initialize filters that don't depend on map load
initializeYearSlider();
setupMethodFilter();
loadChemicalFilter();

// 2. Initialize map controls
initializeMapControls();

// 3. Load map-dependent components on style load
map.on("style.load", () => {
  addPesticideLayers();
  addFederalLandsLayers();
  updateFilters();
  // Set initial visibility of federal land layers based on checkbox state
  toggleFederalLands();
});

// 4. Initialize inset map
initializeInsetMap();

// 5. Set up federal lands toggle listener
document.getElementById("flexSwitchCheckChecked").addEventListener("change", toggleFederalLands);