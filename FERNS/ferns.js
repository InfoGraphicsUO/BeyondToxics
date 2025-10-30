// Mobile Flag
function isMobileUser() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}
const isTouchDevice = isMobileUser();
console.debug("Is touch device:", isTouchDevice);

// Map Default Extent config
const bounds = [
  [-128.2951742043245, 41.27570884209203], // Southwest (lng,lat)
  [-113.36579758866097, 46.46271965782327] // Northeast (lng,lat)
];
const defaultCenter = [-123.04, 44.944]; // Salem
const defaultZoom = 8;

// Map polls basemap widget to get selected basemap style
const basemapInputs = document.querySelectorAll("#basemaps-inner input");
let selectedStyleId = "outdoors-v12"; // default basemap
for (const basemap of basemapInputs) {
  if (basemap.checked) {
    selectedStyleId = basemap.id;
    break;
  }
}

const ACCESS_TOKEN =
  "pk.eyJ1IjoiaW5mb2dyYXBoaWNzIiwiYSI6ImNqaTR0eHhnODBjeTUzdmx0N3U2dWU5NW8ifQ.fVbTCmIrqILIzv5QGtVJ2Q";
mapboxgl.accessToken = ACCESS_TOKEN;
const sourceLayer = "FERNS_Simplified-748ocs";

// Method filter variables
let selectedMethods = new Set(['Aerial', 'Ground', 'Other', 'No Data']); // All selected by default
// Chemical filter variables
let chemicalsList = [];
let selectedChemicals = new Set(); // Track selected chemicals
let selectAllChecked = true; // Track "Select All" checkbox state

// Reset all filters to default values on page load
function resetFiltersToDefaults() {
  // Reset year sliders and inputs to default values
  document.getElementById('fromSlider').value = '2014';
  document.getElementById('toSlider').value = '2024';
  document.getElementById('fromInput').value = '2014';
  document.getElementById('toInput').value = '2024';
  
  // Disable autocomplete on form elements to prevent browser caching
  document.getElementById('fromInput').setAttribute('autocomplete', 'off');
  document.getElementById('toInput').setAttribute('autocomplete', 'off');
  
  // Reset method checkboxes to all checked
  document.getElementById('method-aerial').checked = true;
  document.getElementById('method-ground').checked = true;
  document.getElementById('method-other').checked = true;
  document.getElementById('method-no-data').checked = true;
  
  // Reset method filter variables
  selectedMethods = new Set(['Aerial', 'Ground', 'Other', 'No Data']);
  
  // Chemical filter will be reset when chemicals.json loads
  selectAllChecked = true;
  
  console.debug("Filters reset to defaults");
}

// Main Map
const map = new mapboxgl.Map({
  container: "map", // container ID
  style: "mapbox://styles/mapbox/" + selectedStyleId,
  center: defaultCenter, // starting position [lng, lat]. Note that lat must be set between -90 and 90
  maxBounds: bounds,
  zoom: defaultZoom, // starting zoom
  maxZoom: 13,
  attributionControl: false // disable default attribution to create our own
}).addControl(
  // Custom Attribution
  new mapboxgl.AttributionControl({
    customAttribution: `<a href="https://www.beyondtoxics.org/" class="beyond-toxics-link" target="_blank" title="Beyond Toxics" aria-label="Beyond Toxics">Beyond Toxics</a>`
  })
);

// Disable map rotation using right click + drag
map.dragRotate.disable();
map.touchPitch.disable();

// Inset Map
const insetMap = new mapboxgl.Map({
	container: 'insetMap',
	style: {
		version: 8,
		sources: {},
		layers: []
	},
	center: [-120.57906090033039, 44.16112354808914],
	zoom: 4,
	attributionControl: false,
	interactive: false
});

let isDragging = false;
let dragStartLngLat;
let rectangleFeature;

// When the inset map loads, add layers and set up event handlers
insetMap.on('load', () => {
	resetFiltersToDefaults();
	addInsetLayers();
	document
		.querySelectorAll('#insetMap .mapboxgl-ctrl-bottom-left')
		.forEach((el) => (el.style.display = 'none'));

	const canvas = insetMap.getCanvas();

	// Hover styles
	const rectangleLayers = ['inset_rectangle_fill', 'inset_rectangle_line'];
	rectangleLayers.forEach((layer) => {
		insetMap.on('mousemove', layer, () => {
			canvas.style.cursor = 'grab';
		});

		insetMap.on('mouseleave', layer, () => {
			canvas.style.cursor = '';
		});

		// Drag start (mouse)
		insetMap.on('mousedown', layer, (e) => {
			startDrag(e, canvas, 'mousemove', 'mouseup');
		});

		insetMap.on('touchstart', layer, (e) => {
			if (e.points.length !== 1) return;

			startDrag(e, canvas, 'touchmove', 'touchend');
		});
	});
});

// Helpers
function startDrag(e, canvas, moveEvent, endEvent) {
	isDragging = true;
	dragStartLngLat = e.lngLat;
	rectangleFeature = insetMap.getSource('mainMapBoundsSource')._data.features[0];

	canvas.style.cursor = 'grab';
	insetMap.on(moveEvent, onMove);
	insetMap.once(endEvent, onUp);
}

function onMove(e) {
	if (!isDragging || !rectangleFeature) return;

	const canvas = insetMap.getCanvas();
	const current = e.lngLat;
	const dx = current.lng - dragStartLngLat.lng;
	const dy = current.lat - dragStartLngLat.lat;

	// Shift rectangle
	const newCoords = rectangleFeature.geometry.coordinates[0].map(([lng, lat]) => [
		lng + dx,
		lat + dy
	]);

	canvas.style.cursor = 'grabbing';

	// Update inset rectangle
	const newRectangle = {
		type: 'Feature',
		geometry: {
			type: 'Polygon',
			coordinates: [newCoords]
		}
	};
	insetMap.getSource('mainMapBoundsSource').setData({
		type: 'FeatureCollection',
		features: [newRectangle]
	});

	// Update main map center
	const sw = new mapboxgl.LngLat(
		newRectangle.geometry.coordinates[0][0][0],
		newRectangle.geometry.coordinates[0][0][1]
	);
	const ne = new mapboxgl.LngLat(
		newRectangle.geometry.coordinates[0][2][0],
		newRectangle.geometry.coordinates[0][2][1]
	);

	const bounds = new mapboxgl.LngLatBounds(sw, ne);
	map.setCenter(bounds.getCenter());
}

function onUp() {
	isDragging = false;
	const canvas = insetMap.getCanvas();
	canvas.style.cursor = 'grab';

	insetMap.off('mousemove', onMove);
	insetMap.off('touchmove', onMove);
}

// Layers and sources for inset map
function addInsetLayers() {
	insetMap.addSource('counties', {
		type: 'geojson',
		data: 'OR_COUNTY.json'
	});

	insetMap.addLayer({
		id: 'county_fill',
		type: 'fill',
		source: 'counties',
		paint: {
			'fill-color': 'white'
		}
	});

	insetMap.addLayer({
		id: 'county_lines',
		type: 'line',
		source: 'counties',
		paint: {
			'line-color': 'darkgrey',
			'line-width': 1
		},
		layout: {
			'line-cap': 'round',
			'line-join': 'round'
		}
	});

	insetMap.addSource('mainMapBoundsSource', {
		type: 'geojson',
		data: {
			type: 'FeatureCollection',
			features: []
		}
	});

	insetMap.addLayer({
		id: 'inset_rectangle_fill',
		type: 'fill',
		source: 'mainMapBoundsSource',
		paint: {
			'fill-opacity': 0
		}
	});

	insetMap.addLayer({
		id: 'inset_rectangle_line',
		type: 'line',
		source: 'mainMapBoundsSource',
		paint: {
			'line-color': 'red',
			'line-width': 2
		}
	});

	updateInsetMapBounds();
}

// Updates to inset rectangle
function updateInsetMapBounds() {
	const canvas = map.getCanvas();
	const width = canvas.width;
	const height = canvas.height;

	// Sample points at the center of each edge
	const topCenter = map.unproject([width / 2, 0]);
	const bottomCenter = map.unproject([width / 2, height]);
	const leftCenter = map.unproject([0, height / 2]);
	const rightCenter = map.unproject([width, height / 2]);

	const north = topCenter.lat;
	const south = bottomCenter.lat;
	const west = leftCenter.lng;
	const east = rightCenter.lng;

	const rectangle = {
		type: 'Feature',
		geometry: {
			type: 'Polygon',
			coordinates: [
				[
					[west, south],
					[east, south],
					[east, north],
					[west, north],
					[west, south]
				]
			]
		}
	};

	const source = insetMap.getSource('mainMapBoundsSource');
	if (source) {
		source.setData({
			type: 'FeatureCollection',
			features: [rectangle]
		});
	}
}

map.on('move', function () {
	updateInsetMapBounds();
});

// [Bottom Left Mapbox Group]
// Navigation Control (Zoom +/-)
const nav = new mapboxgl.NavigationControl({
  showCompass: false
});
map.addControl(nav, "bottom-left");

// Reset Extent Class
class ResetExtentControl {
  onAdd(map) {
    this.map = map; // add to map instance
    // Create new container
    this.container = document.createElement("div");
    this.container.className = "mapboxgl-ctrl mapboxgl-ctrl-group";

    // Create button within container
    this.button = document.createElement("button");
    this.button.className = "resetExtent";
    this.button.type = "button";
    this.button.title = "Reset Extent";
    // Add icon to inside button
    this.button.innerHTML =
      '<img src="../icons/Expand_Icon_L.svg" alt="Reset view button" height="18px" width="18px">';

    // Add click event listener to button
    this.button.addEventListener("click", () => {
      this.map.flyTo({
        center: defaultCenter,
        zoom: defaultZoom,
        bearing: 0,
        pitch: 0,
        essential: true
      });
    });

    // Append button to container
    this.container.appendChild(this.button);
    return this.container;
  }

  onRemove() {
    // Remove the container from the map
    this.container.parentNode.removeChild(this.container);
    this.map = undefined;
  }
}
// Add Reset Extent Control to map
map.addControl(new ResetExtentControl(), "bottom-left");

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

// Load vector tileset
let hoveredPolygonId = null; // Variable to store the currently hovered polygon ID
window.selectedPolygonId = null; // Variable to store the currently selected polygon ID
function addSourceAndLayer() {
  map.addSource("custom-tileset", {
    type: "vector",
    // url: "mapbox://infographics.blqieafd" 2022 only
    url: "mapbox://infographics.38lldpvm"
  });

  // Base fill (all polygons, semi-transparent)
  map.addLayer({
    id: "pesticides-fill_base",
    source: "custom-tileset",
    "source-layer": sourceLayer,
    type: "fill",
    paint: {
      "fill-color": "orange",
      "fill-opacity": 0.5
    }
  });

  // Base stroke (all polygons, orange)
  map.addLayer({
    id: "pesticides-stroke_base",
    source: "custom-tileset",
    "source-layer": sourceLayer,
    type: "line",
    layout: {},
    paint: {
      "line-color": "orange",
      "line-width": 2
    }
  });

  // Black stroke for selected polygon (below hover)
  map.addLayer({
    id: "pesticides-stroke_selected",
    source: "custom-tileset",
    "source-layer": sourceLayer,
    type: "line",
    paint: {
      "line-color": [
        "case",
        [
          "all",
          ["boolean", ["feature-state", "selected"], false],
          ["!", ["boolean", ["feature-state", "hover"], false]]
        ],
        "black",
        "transparent"
      ],
      "line-width": 2
    }
  });

  // Hovered polygon fill (fully opaque when hovered)
  map.addLayer({
    id: "pesticides-fill_hover",
    source: "custom-tileset",
    "source-layer": sourceLayer,
    type: "fill",
    paint: {
      "fill-color": [
        "case",
        ["boolean", ["feature-state", "hover"], false],
        "orange",
        "transparent"
      ],
      "fill-opacity": 1
    }
  });

  // White stroke for hovered polygon (on top)
  map.addLayer({
    id: "pesticides-stroke_hover",
    source: "custom-tileset",
    "source-layer": sourceLayer,
    type: "line",
    paint: {
      "line-color": [
        "case",
        ["boolean", ["feature-state", "hover"], false],
        "white",
        "transparent"
      ],
      "line-width": 2
    }
  });

  map.on("click", "pesticides-fill_base", (e) => {
    const features = map.queryRenderedFeatures(e.point, {
      layers: ["pesticides-fill_base"]
    });

    if (!features.length) return; // No features found, exit early

    const popup = new mapboxgl.Popup().setLngLat(e.lngLat);

    // Container for the entire popup content
    const container = document.createElement("div");
    container.innerHTML = `
        <label><strong>Select Polygon:</strong></label>
        <div id="polygon-selector"></div>
        <div id="polygon-details"></div>
    `;

    const select = container.querySelector("#polygon-selector"); // Dropdown for polygon selection
    const details = container.querySelector("#polygon-details"); // Details section for selected polygon

    function showDetails(feature) {
      const f = feature.properties; // Shorthand for properties

      // Format the date strings to MM/DD/YYYY
      function formatDate(dateStr) {
        if (!dateStr || dateStr.length !== 8) return dateStr;
        const year = dateStr.slice(0, 4);
        const month = dateStr.slice(4, 6);
        const day = dateStr.slice(6, 8);
        return `${month}/${day}/${year}`;
      }

      // Clean up the values for display
      function displayValue(value) {
        if (!value) return "No Data";
        return (
          value
            .replace(/^(\.\s*)+/, "") // Remove leading ".. ", ". .", etc in landowners
            .replace(/None,\s|,\sNone/g, "") // Remove all "None, " or ", None" (case-insensitive) in chemicals
            .trim() // Trim whitespace
            .replace(/,$/, "") || "No Data"
        ); // Remove trailing comma or return NA if cleaned str is empty
      }

      // Details of the selected polygon
      details.innerHTML = `
        <p><strong>Method of Presticide Application:</strong> ${displayValue(f.Methods)}</p>
        <p><strong>Chemicals Applied:</strong> ${displayValue(f.Chemicals)}</p>
        <p><strong>Time Range of Application:</strong> ${formatDate(
          f.StartDate
        )} - ${formatDate(f.EndDate)}</p>
        <div id="links">
            <p><strong>Links:</strong><br>
            <div class="link-group">
                <a href="${f.PDFLink}" target="_blank">PDF</a>
            </div>
            </p>
        </div>
        `;
    }

    // Switch highlighted polygon to passed feature ID
    function setHighlight(featureId) {
      if (isTouchDevice) {
        // if on mobile, ignore highlighting
        return;
      }
      if (hoveredPolygonId !== null && hoveredPolygonId !== featureId) {
        map.setFeatureState(
          {
            source: "custom-tileset",
            sourceLayer: sourceLayer,
            id: hoveredPolygonId
          },
          { hover: false }
        );
      }

      hoveredPolygonId = featureId;

      map.setFeatureState(
        {
          source: "custom-tileset",
          sourceLayer: sourceLayer,
          id: hoveredPolygonId
        },
        { hover: true }
      );
    }

    // Set selected state for clicked polygon
    function setSelected(featureId) {
      // Clear any previously selected polygon
      if (window.selectedPolygonId !== null && window.selectedPolygonId !== featureId) {
        map.setFeatureState(
          {
            source: "custom-tileset",
            sourceLayer: sourceLayer,
            id: window.selectedPolygonId
          },
          { selected: false }
        );
      }

      window.selectedPolygonId = featureId;

      map.setFeatureState(
        {
          source: "custom-tileset",
          sourceLayer: sourceLayer,
          id: window.selectedPolygonId
        },
        { selected: true }
      );
    }

    let selectedIdx = 0; // Index of selected polygon in list of polygons
    let hoveredTempId = null; // Temporary ID for hovered polygon

    // For each polygon feature,
    features.forEach((feat, i) => {
      const item = document.createElement("div"); // Create a new item in the list
      item.textContent = feat.properties.NoapIdenti; // Identifier for the polygon
      item.style.padding = "4px 8px";
      item.style.cursor = "pointer";
      if (i !== features.length - 1) {
        // Add bottom border to all but last item
        item.style.borderBottom = "2px solid #0000001a";
      }

      // Hover
      item.addEventListener("mouseenter", () => {
        // Dont change highlight of selected polygon
        if (i !== selectedIdx) {
          item.style.backgroundColor = "#eee"; // Light gray background on hover (not as dark as background for selected)
        }

        // Set feature state to highlight hovered polygon
        if (hoveredTempId !== null && hoveredTempId !== feat.id) {
          // If there is a previously hovered polygon, remove its highlight
          map.setFeatureState(
            {
              source: "custom-tileset",
              sourceLayer: sourceLayer,
              id: hoveredTempId
            },
            { hover: false }
          );
        }

        hoveredTempId = feat.id;

        setHighlight(hoveredTempId);
      });

      // Stop hover
      item.addEventListener("mouseleave", () => {
        if (i !== selectedIdx) {
          item.style.backgroundColor = "";
        }

        if (hoveredTempId !== null) {
          map.setFeatureState(
            {
              source: "custom-tileset",
              sourceLayer: sourceLayer,
              id: hoveredTempId
            },
            { hover: false }
          );
        }

        hoveredTempId = null;
      });

      item.addEventListener("click", () => {
        selectedIdx = i;
        showDetails(feat);
        setHighlight(feat.id);
        setSelected(feat.id);

        Array.from(select.children).forEach((child) => {
          child.style.backgroundColor = "";
          child.style.fontWeight = "";
        });
        item.style.backgroundColor = "#ddd";
        item.style.fontWeight = "bold";
      });

      if (i === 0) {
        item.style.backgroundColor = "#ddd";
        item.style.fontWeight = "bold";
      }

      select.appendChild(item);
    });

    popup.on("close", () => {
      setSelected(null);
    });

    showDetails(features[selectedIdx]);
    setHighlight(features[selectedIdx].id);
    setSelected(features[selectedIdx].id);

    popup.setDOMContent(container).addTo(map);
  });

  let tooltip; // Hover tooltip

  if (!isTouchDevice) {
    // Dont add hover functionality on mobile
    map.on("mousemove", "pesticides-fill_base", (e) => {
      map.getCanvas().style.cursor = "pointer";

      if (!tooltip) {
        tooltip = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false
        });
      }
      const coords = e.lngLat;
      tooltip
        .setLngLat(coords)
        .setHTML('<div style="font-size:12px;">Click for more information</div>')
        .addTo(map);

      if (e.features.length > 0) {
        if (hoveredPolygonId !== null) {
          map.setFeatureState(
            {
              source: "custom-tileset",
              sourceLayer: sourceLayer,
              id: hoveredPolygonId
            },
            { hover: false }
          );
        }
        hoveredPolygonId = e.features[0].id;
        console.debug("Hovered ID:", hoveredPolygonId);
        map.setFeatureState(
          {
            source: "custom-tileset",
            sourceLayer: sourceLayer,
            id: hoveredPolygonId
          },
          { hover: true }
        );
      }
    });
  }

  map.on("mouseleave", "pesticides-fill_base", () => {
    map.getCanvas().style.cursor = "";

    if (tooltip) {
      tooltip.remove();
      tooltip = null;
    }

    if (hoveredPolygonId !== null) {
      map.setFeatureState(
        {
          source: "custom-tileset",
          sourceLayer: sourceLayer,
          id: hoveredPolygonId
        },
        { hover: false }
      );
    }
    hoveredPolygonId = null;
  });
}

map.on("style.load", () => {
  addSourceAndLayer();
  updateFilters();
});

// Debug/Dev Boundary Markers
const markersw = new mapboxgl.Marker() // Southwest corner
  .setLngLat(bounds[0])
  .addTo(map);
const markerne = new mapboxgl.Marker() // Northeast corner
  .setLngLat(bounds[1])
  .addTo(map);

let markersVisible = true;
// due to session caching: if unchecked on page load, hide markers first
if (!document.getElementById("showBoundsMarkers").checked) {
  markersVisible = false;
  markersw.getElement().style.display = "none";
  markerne.getElement().style.display = "none";
}

function showBoundsMarkers() {
  if (markersVisible) {
    markersw.getElement().style.display = "none";
    markerne.getElement().style.display = "none";
  } else {
    markersw.getElement().style.display = "";
    markerne.getElement().style.display = "";
  }
  markersVisible = !markersVisible;
}

document.getElementById("showBoundsMarkers").addEventListener("change", showBoundsMarkers);

// Basemap Picker
const layerList = document.getElementById("basemaps");
const inputs = layerList.getElementsByTagName("input");

for (const input of inputs) {
  input.onclick = (layer) => {
    const layerId = layer.target.id;
    map.setStyle("mapbox://styles/mapbox/" + layerId);
  };
}

// Year Range Slider
const sliderNoColor = "#C6C6C6";
const sliderBarColor = "#bfe172";

const fromSlider = document.querySelector("#fromSlider");
const toSlider = document.querySelector("#toSlider");
const fromInput = document.querySelector("#fromInput");
const toInput = document.querySelector("#toInput");

// Method Filter Functionality
function setupMethodFilter() {
	document.getElementById('method-aerial').addEventListener('change', handleMethodChange);
	document.getElementById('method-ground').addEventListener('change', handleMethodChange);
	document.getElementById('method-other').addEventListener('change', handleMethodChange);
	document.getElementById('method-no-data').addEventListener('change', handleMethodChange);
}

function handleMethodChange(e) {
	const method = e.target.value;

	if (e.target.checked) {
		selectedMethods.add(method);
	} else {
		selectedMethods.delete(method);
	}
	updateFilters();
}
setupMethodFilter();

// Chemical Filter Functionality
// Load chemicals from JSON
fetch('chemicals.json')
  .then(response => response.json())
  .then(data => {
    chemicalsList = data;
    populateChemicalFilter();
    // Reset to defaults: select all chemicals and check "Select All"
    selectedChemicals = new Set(chemicalsList);
    selectAllChecked = true;
    document.getElementById('select-all-checkbox').checked = selectAllChecked;
    updateFilters();
  })
  .catch(error => console.error('Error loading chemicals:', error));

function populateChemicalFilter() {
  const container = document.getElementById('chemical-list');

  chemicalsList.forEach(chemical => {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = chemical;
    checkbox.checked = true; // Start with all selected
    checkbox.addEventListener('change', handleIndividualChemicalChange);

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(chemical));
    container.appendChild(label);
  });

  // Add event listener for "Select All" checkbox
  document.getElementById('select-all-checkbox').addEventListener('change', handleSelectAllChange);
  
  // Add event listener for search input
  document.getElementById('chemical-search').addEventListener('input', handleChemicalSearch);
}

function handleChemicalSearch(e) {
  const searchTerm = e.target.value.toLowerCase();
  const labels = document.querySelectorAll('#chemical-list label');
  
  labels.forEach(label => {
    const chemicalName = label.textContent.toLowerCase();
    if (chemicalName.includes(searchTerm)) {
      label.style.display = 'flex';
    } else {
      label.style.display = 'none';
    }
  });
  
  // Update "Select All" checkbox state based on visible chemicals
  updateSelectAllCheckboxForVisible();
}

// Helper function to get all visible chemical checkboxes
function getVisibleChemicalCheckboxes() {
  const checkboxes = [];
  const labels = document.querySelectorAll('#chemical-list label');
  
  labels.forEach(label => {
    if (label.style.display !== 'none') {
      const checkbox = label.querySelector('input[type="checkbox"]');
      if (checkbox) {
        checkboxes.push(checkbox);
      }
    }
  });
  
  return checkboxes;
}

// Update "Select All" checkbox based on whether all visible chemicals are selected
function updateSelectAllCheckboxForVisible() {
  const visibleCheckboxes = getVisibleChemicalCheckboxes();
	document.getElementById('select-all-checkbox').checked = visibleCheckboxes.length > 0 && visibleCheckboxes.every(checkbox => checkbox.checked);
}

function handleSelectAllChange(e) {
  const selectAllCheckbox = e.target;

  if (selectAllCheckbox.checked) {
    // Select only visible chemicals (All if nothing is typed into search)
    const visibleCheckboxes = getVisibleChemicalCheckboxes();
    visibleCheckboxes.forEach(checkbox => {
      selectedChemicals.add(checkbox.value);
      checkbox.checked = true;
    });
  } else {
    // Select All was unchecked - deselect ALL chemicals
    selectedChemicals.clear();
    document.querySelectorAll('#chemical-list input[type="checkbox"]').forEach(checkbox => {
      checkbox.checked = false;
    });
  }

  // Update selectAllChecked based on whether all chemicals (not just visible) are selected
  selectAllChecked = selectedChemicals.size === chemicalsList.length;

  updateFilters();
}

function handleIndividualChemicalChange(e) {
  const chemical = e.target.value;

  if (e.target.checked) {
    selectedChemicals.add(chemical);
  } else {
    selectedChemicals.delete(chemical);
  }

  // Update "Select All" checkbox based on visible chemicals
  updateSelectAllCheckboxForVisible();
  
  // Update the global selectAllChecked flag based on all chemicals
  selectAllChecked = selectedChemicals.size === chemicalsList.length;

  updateFilters();
}

// update map filters based on year range and selected chemicals
function updateFilters() {
	const [fromYear, toYear] = getParsed(fromSlider, toSlider);
  
  // Build the filter expression
  let filterExpression = ['all'];
  
  // Add year filter
  filterExpression.push(['>=', ['get', 'Year'], fromYear]);
  filterExpression.push(['<=', ['get', 'Year'], toYear]);
  
  // Add chemical filter
  if (!selectAllChecked && selectedChemicals.size > 0) {
    // Create an 'any' expression that checks if ANY selected chemical appears in the Chemicals property
    let chemicalFilter = ['any'];
    
    selectedChemicals.forEach(chemical => {
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
  else if (!selectAllChecked && selectedChemicals.size === 0) {
    filterExpression.push(['==', ['get', 'Chemicals'], '__NEVER_MATCH__']);
  }
  // If "Select All" is checked, don't add any chemical filter (show all chemicals)

	// Method filter
	if (selectedMethods.size > 0 && selectedMethods.size < 4) {
		let methodFilter = ['any'];

		selectedMethods.forEach(method => {
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
	else if (selectedMethods.size === 0) {
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
  
  console.debug(`Filters updated: Years ${fromYear}-${toYear}, Chemicals: ${selectedChemicals.size}/${chemicalsList.length}, Methods: ${Array.from(selectedMethods).join(', ')}, SelectAll: ${selectAllChecked}`);
}

// Make sure one of the sliders is always accessible to being moved
function setToggleAccessible(currentTarget) {
  const toSlider = document.querySelector("#toSlider");
  if (Number(currentTarget.value) <= Number(fromSlider.min)) {
    toSlider.style.zIndex = "2";
  } else {
    toSlider.style.zIndex = "0";
  }
}

function fillSlider(from, to, sliderColor, rangeColor, controlSlider) {
  const rangeDistance = to.max - to.min;
  const fromPosition = from.value - to.min;
  const toPosition = to.value - to.min;
  controlSlider.style.background = `linear-gradient(
    to right,
    ${sliderColor} 0%,
    ${sliderColor} ${(fromPosition / rangeDistance) * 100}%,
    ${rangeColor} ${(fromPosition / rangeDistance) * 100}%,
    ${rangeColor} ${(toPosition / rangeDistance) * 100}%,
    ${sliderColor} ${(toPosition / rangeDistance) * 100}%,
    ${sliderColor} 100%)`;
}

fillSlider(fromSlider, toSlider, sliderNoColor, sliderBarColor, toSlider);
setToggleAccessible(toSlider);

function getParsed(currentFrom, currentTo) {
  const from = parseInt(currentFrom.value, 10);
  const to = parseInt(currentTo.value, 10);
  return [from, to];
}

function controlFromSlider(fromSlider, toSlider, fromInput) {
  const [from, to] = getParsed(fromSlider, toSlider);
  fillSlider(fromSlider, toSlider, sliderNoColor, sliderBarColor, toSlider);
  if (from > to) {
    fromSlider.value = to;
    fromInput.value = to;
  } else {
    fromInput.value = from;
  }
  updateFilters();
}
fromSlider.oninput = () => controlFromSlider(fromSlider, toSlider, fromInput);

function controlToSlider(fromSlider, toSlider, toInput) {
  const [from, to] = getParsed(fromSlider, toSlider);
  fillSlider(fromSlider, toSlider, sliderNoColor, sliderBarColor, toSlider);
  setToggleAccessible(toSlider);
  if (from <= to) {
    toSlider.value = to;
    toInput.value = to;
  } else {
    toInput.value = from;
    toSlider.value = from;
  }
  updateFilters();
}
toSlider.oninput = () => controlToSlider(fromSlider, toSlider, toInput);

function controlFromInput(fromSlider, fromInput, toInput, controlSlider) {
  const [from, to] = getParsed(fromInput, toInput);
  fillSlider(fromInput, toInput, sliderNoColor, sliderBarColor, controlSlider);
  if (from > to) {
    fromSlider.value = to;
    fromInput.value = to;
  } else {
    fromSlider.value = from;
  }
  updateFilters();
}
fromInput.oninput = () => controlFromInput(fromSlider, fromInput, toInput, toSlider);

function controlToInput(toSlider, fromInput, toInput, controlSlider) {
  const [from, to] = getParsed(fromInput, toInput);
  fillSlider(fromInput, toInput, sliderNoColor, sliderBarColor, controlSlider);
  setToggleAccessible(toInput);
  if (from <= to) {
    toSlider.value = to;
    toInput.value = to;
  } else {
    toInput.value = from;
  }
  updateFilters();
}
toInput.oninput = () => controlToInput(toSlider, fromInput, toInput, toSlider);
