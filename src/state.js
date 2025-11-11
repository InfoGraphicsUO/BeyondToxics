// Export a single state object.
// Other modules can import this object and mutate its properties.
const appState = {
  // All selected by default, matching original ferns.js
  selectedMethods: new Set(),
  methodSymbologyEnabled: false,
  chemicalsList: [],
  selectedChemicals: new Set(),
  selectAllChecked: true,
  yearSlider: null,
  hoveredPolygonId: null,
  selectedPolygonId: null
};

export default appState;