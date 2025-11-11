import { map } from '../mapSetup.js';
import { defaultCenter, defaultZoom, ACCESS_TOKEN, bounds } from '../config.js';

// Taking the mapbox controls out of mapbox control container to make them standalone
// Helper function to create a control button
function createControlButton(className, title, onClick) {
  const button = document.createElement('button');
  button.className = className;
  button.type = 'button';
  button.title = title;
  button.setAttribute('aria-label', title);
  button.addEventListener('click', onClick);
  return button;
}

// Helper function to create a control group
function createControlGroup() {
  const group = document.createElement('div');
  group.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';
  return group;
}

function setupStandaloneControls() {
    // Create standalone controls container
    const standaloneControlsContainer = document.createElement('div');
    standaloneControlsContainer.id = 'standalone-controls';
    standaloneControlsContainer.className = 'standalone-controls';

    // Navigation Control (Zoom +/-)
    const navControlGroup = createControlGroup();
    const zoomInButton = createControlButton('mapboxgl-ctrl-icon mapboxgl-ctrl-zoom-in', 'Zoom in', () => map.zoomIn());
    const zoomOutButton = createControlButton('mapboxgl-ctrl-icon mapboxgl-ctrl-zoom-out', 'Zoom out', () => map.zoomOut());
    zoomInButton.innerHTML = '<span class="mapboxgl-ctrl-icon" aria-hidden="true"></span>';
    zoomOutButton.innerHTML = '<span class="mapboxgl-ctrl-icon" aria-hidden="true"></span>';
    navControlGroup.append(zoomInButton, zoomOutButton);

    // Reset Extent Button
    const resetExtentGroup = createControlGroup();
    const resetButton = createControlButton('resetExtent', 'Reset Extent', () => {
      map.flyTo({
        center: defaultCenter,
        zoom: defaultZoom,
        bearing: 0,
        pitch: 0,
        essential: true
      });
    });
    resetButton.innerHTML = '<img src="public/icons/Expand_Icon_L.svg" alt="Reset view button" height="18px" width="18px">';
    resetExtentGroup.appendChild(resetButton);

    // Add controls to container and append to document
    standaloneControlsContainer.append(resetExtentGroup, navControlGroup);
    document.body.appendChild(standaloneControlsContainer);
}

function setupScaleControl() {
    map.addControl(new mapboxgl.ScaleControl({
    	maxWidth: 100,
    	unit: 'imperial'
    }));
}

function setupSearchBox() {
    // Search Box
    window.addEventListener("load", () => {
      const searchBox = new MapboxSearchBox();
      searchBox.accessToken = ACCESS_TOKEN;
      searchBox.options = {
        types: "city,locality,address",
        proximity: map.getCenter(), // Bias search results to locations closer to current center
        bbox: bounds
      };
      searchBox.marker = true;
      searchBox.mapboxgl = mapboxgl;
      searchBox.componentOptions = { allowReverse: true, flipCoordinates: true };

      map.addControl(searchBox, "top-left");
    });
}

export function initializeMapControls() {
    setupStandaloneControls();
    setupScaleControl();
    setupSearchBox();
}