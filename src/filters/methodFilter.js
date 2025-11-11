import appState from '../state.js';
import { updateFilters } from './mainFilter.js';
import { updatePesticideLayerSymbology } from '../components/pesticideLayer.js';

// Method Symbology Toggle
function toggleMethodSymbology() {
  appState.methodSymbologyEnabled = document.getElementById("methodSymbologySwitch").checked;

  // Show/hide color indicators
  document.querySelectorAll('.method-legend-item').forEach(indicator => {
    if (appState.methodSymbologyEnabled) {
      indicator.classList.add('visible');
    } else {
      indicator.classList.remove('visible');
    }
  });

  // Update the map layer paint properties
  updatePesticideLayerSymbology();

  console.debug("Method symbology toggled:", appState.methodSymbologyEnabled);
}

function handleMethodChange(e) {
	const method = e.target.value;

	if (e.target.checked) {
		appState.selectedMethods.add(method);
	} else {
		appState.selectedMethods.delete(method);
	}
	updateFilters();
}

// Method Filter Functionality
export function setupMethodFilter() {
	document.getElementById('method-aerial').addEventListener('change', handleMethodChange);
	document.getElementById('method-ground').addEventListener('change', handleMethodChange);
  document.getElementById('method-other').addEventListener('change', handleMethodChange);
	document.getElementById('method-no-data').addEventListener('change', handleMethodChange);
  document.getElementById("methodSymbologySwitch").addEventListener("change", toggleMethodSymbology);
}