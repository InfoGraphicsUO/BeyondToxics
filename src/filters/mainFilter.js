import appState from '../state.js';
import { map } from '../mapSetup.js';

// Reset all filters to default values on page load
export function resetFiltersToDefaults() {
  // Reset year slider to default values
  if (appState.yearSlider) {
    appState.yearSlider.set([2014, 2024]);
  }

  // Reset method checkboxes to all checked
  document.getElementById('method-aerial').checked = true;
  document.getElementById('method-ground').checked = true;
  document.getElementById('method-other').checked = true;
  document.getElementById('method-no-data').checked = true;

  // Reset method filter variables
  appState.selectedMethods = new Set(['Aerial', 'Ground', 'Other', 'No Data']);

  // Reset symbology switch to OFF
  document.getElementById('methodSymbologySwitch').checked = false;
  appState.methodSymbologyEnabled = false;

  // Hide color indicators
  document.querySelectorAll('.method-legend-item').forEach(indicator => {
    indicator.classList.remove('visible');
  });

  // Chemical filter will be reset when chemicals.json loads
  appState.selectAllChecked = true;

  console.debug("Filters reset to defaults");
}

// update map filters based on year range and selected chemicals
export function updateFilters() {
	// Get year values from noUiSlider
	let fromYear, toYear;
  if (appState.yearSlider) {
    const values = appState.yearSlider.get();
    fromYear = parseInt(values[0], 10);
    toYear = parseInt(values[1], 10);
  } else {
    // Fallback to defaults if slider not initialized
    fromYear = 2014;
    toYear = 2024;
  }

  // Build the filter expression
  let filterExpression = ['all'];

  // Add year filter
  filterExpression.push(['>=', ['get', 'Year'], fromYear]);
  filterExpression.push(['<=', ['get', 'Year'], toYear]);

  // Add chemical filter
  if (!appState.selectAllChecked && appState.selectedChemicals.size > 0) {
    // Create an 'any' expression that checks if ANY selected chemical appears in the Chemicals property
    let chemicalFilter = ['any'];

    appState.selectedChemicals.forEach(chemical => {
      if (chemical === 'No Data') {
        // Handle "No Data" case - check for empty, null, or missing fields
        chemicalFilter.push([
          'any',
          ['==', ['get', 'Chemicals'], ''],
          ['==', ['get', 'Chemicals'], null],
          ['!', ['has', 'Chemicals']] // Check if field doesn't exist
        ]);
      } else {
        // Pre-calculate values in JavaScript to avoid complex Mapbox expressions
        const chemicalStart = chemical + ', ';
        const chemicalEnd = ', ' + chemical;
        const chemicalMiddle = ', ' + chemical + ', ';
        const minLength = chemical.length + 2;

        chemicalFilter.push([
          'any',
          // Exact match (entire field is just this chemical)
          ['==', ['get', 'Chemicals'], chemical],
          // Match at beginning of list: "chemical, ..."
          ['all',
            ['>', ['length', ['get', 'Chemicals']], minLength - 1],
            ['==', ['slice', ['get', 'Chemicals'], 0, minLength], chemicalStart]
          ],
          // Match at end of list: "..., chemical"
          ['all',
            ['>', ['length', ['get', 'Chemicals']], minLength - 1],
            ['==', ['slice', ['get', 'Chemicals'], -minLength], chemicalEnd]
          ],
          // Match in middle of list: "..., chemical, ..."
          ['in', chemicalMiddle, ['get', 'Chemicals']]
        ]);
      }
    });

    filterExpression.push(chemicalFilter);
  }
  // If "Select All" is checked OR all chemicals are individually selected, don't add a chemical filter (show all)
  // If no chemicals are selected and "Select All" is unchecked, add a filter that matches nothing
  else if (!appState.selectAllChecked && appState.selectedChemicals.size === 0) {
    filterExpression.push(['==', ['get', 'Chemicals'], '__NEVER_MATCH__']);
  }
  // If "Select All" is checked, don't add any chemical filter (show all chemicals)

	// Method filter
	if (appState.selectedMethods.size > 0 && appState.selectedMethods.size < 4) {
		let methodFilter = ['any'];

    appState.selectedMethods.forEach(method => {
			if (method === 'Aerial') {
				methodFilter.push(['in', 'Aerial', ['get', 'Methods']]);
			} else if (method === 'Ground') {
				methodFilter.push(['in', 'Ground', ['get', 'Methods']]);
			} else if (method === 'Other') {
				methodFilter.push([
					'all',
					['!', ['in', 'Aerial', ['get', 'Methods']]],
					['!', ['in', 'Ground', ['get', 'Methods']]],
					['!=', ['get', 'Methods'], ''],
					['!=', ['get', 'Methods'], null],
					['has', 'Methods']
        ]);
			} else if (method === 'No Data') {
				methodFilter.push([
					'any',
					['==', ['get', 'Methods'], ''],
					['==', ['get', 'Methods'], null],
					['!', ['has', 'Methods']]
        ]);
			}
		});

    filterExpression.push(methodFilter);
	}
	// If no methods selected, add a filter that matches nothing
	else if (appState.selectedMethods.size === 0) {
		filterExpression.push(['==', ['get', 'Methods'], '__NEVER_MATCH__']);
  }

  // Apply filter to all polygon layers
  const layersToFilter = [
    'pesticides-fill_base',
    'pesticides-stroke_base',
    'pesticides-stroke_selected',
    'pesticides-fill_hover',
    'pesticides-stroke_hover'
  ];

  layersToFilter.forEach(layerId => {
    if (map.getLayer(layerId)) {
      map.setFilter(layerId, filterExpression);
    }
  });

  console.debug(`Filters updated: Years ${fromYear}-${toYear}, Chemicals: ${appState.selectedChemicals.size}/${appState.chemicalsList.length}, Methods: ${Array.from(appState.selectedMethods).join(', ')}, SelectAll: ${appState.selectAllChecked}`);
}