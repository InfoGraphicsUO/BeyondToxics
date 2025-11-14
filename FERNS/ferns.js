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

const ACCESS_TOKEN = "pk.eyJ1IjoiaW5mb2dyYXBoaWNzIiwiYSI6ImNqaTR0eHhnODBjeTUzdmx0N3U2dWU5NW8ifQ.fVbTCmIrqILIzv5QGtVJ2Q";
mapboxgl.accessToken = ACCESS_TOKEN;
const basemap_style = "mapbox://styles/infographics/cmhl11j9c00h301r6bwbbc6hg";
const sourceLayer = "FERNS_Simplified-748ocs";

// Method filter variables
let selectedMethods = new Set(['Aerial', 'Ground', 'Other', 'No Data']); // All selected by default
let methodSymbologyEnabled = false; // Track symbology switch state (default: OFF)
// Chemical filter variables
let chemicalsList = [];
let selectedChemicals = new Set(); // Track selected chemicals
let selectAllChecked = true; // Track "Select All" checkbox state

// Year slider variable (will be initialized after DOM is ready)
let yearSlider = null;

// Main Map
const map = new mapboxgl.Map({
  container: "map", // container ID
  style: basemap_style,
  center: defaultCenter, // starting position [lng, lat]. Note that lat must be set between -90 and 90
  maxBounds: bounds,
  zoom: defaultZoom, // starting zoom
  maxZoom: 16,
  attributionControl: false // disable default attribution to create our own
}).addControl(
  // Custom Attribution
  new mapboxgl.AttributionControl({
    customAttribution: `<a href="https://infographics.uoregon.edu/" class="attribution-link" target="_blank" title="InfoGraphics Lab" aria-label="InfoGraphics Lab">InfoGraphics Lab</a> | <a href="https://www.beyondtoxics.org/" class="attribution-link" target="_blank" title="Beyond Toxics" aria-label="Beyond Toxics">Beyond Toxics</a>`
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

// Load wheel control
const wheel = document.getElementById('loading-spinner');

function showLoadingWheel() {
	wheel.style.display = 'flex';
	// Stop user interaction while loading
	// Justification: when user interacts with the map while polygons are drawing, the load wheel disappears.
	// map.loaded() returns true after the map "loads" from the interaction, but the polygons are still drawing.
	// Stopping user interaction is the "easy" solution
	const standaloneControls = document.getElementById('standalone-controls');
	if (standaloneControls) {
		standaloneControls.style.pointerEvents = 'none';
		const buttons = standaloneControls.querySelectorAll('button');
		buttons.forEach((button) => {
			button.style.pointerEvents = 'none';
		});
	}
	map.getCanvas().style.pointerEvents = 'none';
	insetMap.getCanvas().style.pointerEvents = 'none';
}
showLoadingWheel();

function hideLoadingWheel() {
	// Re-enable user interaction
	const standaloneControls = document.getElementById('standalone-controls');
	if (standaloneControls) {
		standaloneControls.style.pointerEvents = 'auto';
		const buttons = standaloneControls.querySelectorAll('button');
		buttons.forEach((button) => {
			button.style.pointerEvents = 'auto';
		});
	}
	map.getCanvas().style.pointerEvents = 'auto';
	insetMap.getCanvas().style.pointerEvents = 'auto';
	wheel.style.display = 'none';
}

// Hide loading wheel when map has finished loading
let idleTimeout;

map.on("idle", () => {
	clearTimeout(idleTimeout);
	if (wheel.style.display === 'flex') {
		if (map.loaded()) {
			idleTimeout = setTimeout (() => {
				hideLoadingWheel();
			}, 500);
		} else {
			idleTimeout = setTimeout (() => {
				// Still waiting for map to load
			}, 50);
		}
	}
});

// Hide load wheel if there's an error
map.on('error', () => {
	hideLoadingWheel();
});

let isDragging = false;
let dragStartLngLat;
let rectangleFeature;

// When the inset map loads, add layers and set up event handlers
insetMap.on('load', () => {
	// Initialize year slider if not already done
	if (!yearSlider) {
		initializeYearSlider();
	}
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
resetButton.innerHTML = '<img src="../icons/Expand_Icon_L.svg" alt="Reset view button" height="18px" width="18px">';
resetExtentGroup.appendChild(resetButton);

// Add controls to container and append to document
standaloneControlsContainer.append(resetExtentGroup, navControlGroup);
document.body.appendChild(standaloneControlsContainer);

map.addControl(new mapboxgl.ScaleControl({
	maxWidth: 100,
	unit: 'imperial'
}));

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

// Collapsable Filters Button
function toggleFiltersPanel() {
  const panel = document.querySelector('.right-side-container');
  const toggle = document.getElementById('toggle-panel-button');

  if (!panel || !toggle) {
    console.error('Panel or toggle button not found');
    return;
  }

  toggle.addEventListener('click', () => {
    panel.classList.toggle('collapsed');
    const isCollapsed = panel.classList.contains('collapsed');
    toggle.setAttribute('aria-expanded', !isCollapsed);
    console.debug('Filters panel toggled:', isCollapsed ? 'collapsed' : 'expanded');
  });
}
toggleFiltersPanel();

// Reset all filters to default values on page load
function resetFiltersToDefaults() {
  // Reset year slider to default values
  if (yearSlider) {
    yearSlider.set([2014, 2024]);
  }
  
  // Reset method checkboxes to all checked
  document.getElementById('method-aerial').checked = true;
  document.getElementById('method-ground').checked = true;
  document.getElementById('method-other').checked = true;
  document.getElementById('method-no-data').checked = true;
  
  // Reset method filter variables
  selectedMethods = new Set(['Aerial', 'Ground', 'Other', 'No Data']);
  
  // Reset symbology switch to OFF
  document.getElementById('methodSymbologySwitch').checked = false;
  methodSymbologyEnabled = false;
  
  // Hide color indicators
  document.querySelectorAll('.method-legend-item').forEach(indicator => {
    indicator.classList.remove('visible');
  });
  
  // Chemical filter will be reset when chemicals.json loads
  selectAllChecked = true;
  
  console.debug("Filters reset to defaults");
}

// Get color expression for method-based symbology
function getMethodColor() {
  if (!methodSymbologyEnabled) {
    return "orange"; // Default color when symbology is off
  }
  
  // When symbology is enabled, color by method
  // Priority: Aerial > Ground > Other > No Data
  return [
    "case",
    // Check for Aerial (highest priority)
    ["in", "Aerial", ["get", "Methods"]],
    "#FF6B35", // Orange-red for Aerial
    // Check for Ground
    ["in", "Ground", ["get", "Methods"]],
    "#9B59B6", // Purple for Ground
    // Check for Other (has data but not Aerial or Ground)
    [
      "all",
      ["!=", ["get", "Methods"], ""],
      ["!=", ["get", "Methods"], null],
      ["has", "Methods"]
    ],
    "#495057", // Dark grey for Other (more dominant than No Data)
    // No Data (empty, null, or missing)
    "#ADB5BD" // Light grey for No Data
  ];
}

// Load vector tileset
let hoveredPolygonId = null; // Variable to store the currently hovered polygon ID
window.selectedPolygonId = null; // Variable to store the currently selected polygon ID
function addSourceAndLayer() {
  map.addSource("FERNS-tileset", {
    type: "vector",
    // url: "mapbox://infographics.blqieafd" 2022 only
    url: "mapbox://infographics.38lldpvm"
  });

  // Base fill (all polygons, semi-transparent)
  map.addLayer({
    id: "pesticides-fill_base",
    source: "FERNS-tileset",
    "source-layer": sourceLayer,
    type: "fill",
    paint: {
      "fill-color": getMethodColor(),
      "fill-opacity": 0.5
    }
  });

  // Base stroke (all polygons, colored by method)
  map.addLayer({
    id: "pesticides-stroke_base",
    source: "FERNS-tileset",
    "source-layer": sourceLayer,
    type: "line",
    layout: {},
    paint: {
      "line-color": getMethodColor(),
      "line-width": 2
    }
  });

  // Black stroke for selected polygon (below hover)
  map.addLayer({
    id: "pesticides-stroke_selected",
    source: "FERNS-tileset",
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
    source: "FERNS-tileset",
    "source-layer": sourceLayer,
    type: "fill",
    paint: {
      "fill-color": [
        "case",
        ["boolean", ["feature-state", "hover"], false],
        getMethodColor(),
        "transparent"
      ],
      "fill-opacity": 1
    }
  });

  // White stroke for hovered polygon (on top)
  map.addLayer({
    id: "pesticides-stroke_hover",
    source: "FERNS-tileset",
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
			<label style="margin-bottom: 2px;"><strong>Select Pesticide Permit:</strong></label>
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
            <p><strong>View Original NOAP:</strong><br>
            <div class="link-group">
							<a href="${f.PDFLink}" target="_blank">Permit PDF</a>
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
            source: "FERNS-tileset",
            sourceLayer: sourceLayer,
            id: hoveredPolygonId
          },
          { hover: false }
        );
      }

      hoveredPolygonId = featureId;

      map.setFeatureState(
        {
          source: "FERNS-tileset",
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
            source: "FERNS-tileset",
            sourceLayer: sourceLayer,
            id: window.selectedPolygonId
          },
          { selected: false }
        );
      }

      window.selectedPolygonId = featureId;

      map.setFeatureState(
        {
          source: "FERNS-tileset",
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
              source: "FERNS-tileset",
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
              source: "FERNS-tileset",
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

    popup.on("open", () => {
      // make sure popups are fully visible by panning the map
      const popupElement = popup.getElement();
			const panel = document.querySelector('.right-side-container');

			let dx;
			// if panel is open and on mobile, add horizontal offset to account for the width of the panel
			if (!panel.classList.contains('collapsed') && window.innerWidth < 767) {
				dx = -224/2;
			} else {
				dx = 0;
			}

			const popupHeight = popupElement.offsetHeight;
			const dy = (popupHeight / 2) + 20;

			map.easeTo({
				center: popup.getLngLat(),
				offset: [dx, dy],
				duration: 300
			});
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
              source: "FERNS-tileset",
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
            source: "FERNS-tileset",
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
          source: "FERNS-tileset",
          sourceLayer: sourceLayer,
          id: hoveredPolygonId
        },
        { hover: false }
      );
    }
    hoveredPolygonId = null;
  });

	// Get the first symbol layer to place new layers beneath it (TODO: Improve this. cant see where federal layers end bc they're under the roads e.g USFWS west of Salem)
	const layers = map.getStyle().layers;
	let underLayer;
	for (const layer of layers) {
		if (layer.type === 'line') {
			underLayer = layer.id;
		}
	}
	const federalBLM = 'https://services.arcgis.com/v01gqwM5QqNysAAi/arcgis/rest/services/Fee_Managers_PADUS/FeatureServer/0/query?where=State_Nm%3D%27OR%27+AND+Own_Name%3D%27BLM%27&objectIds=&geometry=&geometryType=esriGeometryPolygon&inSR=&spatialRel=esriSpatialRelIntersects&resultType=none&distance=0.0&units=esriSRUnit_Meter&outDistance=&relationParam=&returnGeodetic=false&outFields=*&returnGeometry=true&returnCentroid=false&returnEnvelope=false&featureEncoding=esriDefault&multipatchOption=xyFootprint&maxAllowableOffset=&geometryPrecision=&outSR=4326&defaultSR=&datumTransformation=&applyVCSProjection=false&returnIdsOnly=false&returnUniqueIdsOnly=false&returnCountOnly=false&returnExtentOnly=false&returnQueryGeometry=false&returnDistinctValues=false&cacheHint=false&collation=&orderByFields=&groupByFieldsForStatistics=&returnAggIds=false&outStatistics=&having=&resultOffset=&resultRecordCount=&returnZ=false&returnM=false&returnTrueCurves=false&returnExceededLimitFeatures=true&quantizationParameters=&sqlFormat=none&f=pgeojson&token=';
	const federalUSFS = 'https://services.arcgis.com/v01gqwM5QqNysAAi/arcgis/rest/services/Fee_Managers_PADUS/FeatureServer/0//query?where=State_Nm%3D%27OR%27+AND+Own_Name%3D%27USFS%27&objectIds=&geometry=&geometryType=esriGeometryPolygon&inSR=&spatialRel=esriSpatialRelIntersects&resultType=none&distance=0.0&units=esriSRUnit_Meter&outDistance=&relationParam=&returnGeodetic=false&outFields=*&returnGeometry=true&returnCentroid=false&returnEnvelope=false&featureEncoding=esriDefault&multipatchOption=xyFootprint&maxAllowableOffset=&geometryPrecision=&outSR=4326&defaultSR=&datumTransformation=&applyVCSProjection=false&returnIdsOnly=false&returnUniqueIdsOnly=false&returnCountOnly=false&returnExtentOnly=false&returnQueryGeometry=false&returnDistinctValues=false&cacheHint=false&collation=&orderByFields=&groupByFieldsForStatistics=&returnAggIds=false&outStatistics=&having=&resultOffset=&resultRecordCount=&returnZ=false&returnM=false&returnTrueCurves=false&returnExceededLimitFeatures=true&quantizationParameters=&sqlFormat=none&f=pgeojson&token=';
	const federalUSFWS = 'https://services.arcgis.com/v01gqwM5QqNysAAi/arcgis/rest/services/Fee_Managers_PADUS/FeatureServer/0//query?where=State_Nm%3D%27OR%27+AND+Own_Name%3D%27FWS%27&objectIds=&geometry=&geometryType=esriGeometryPolygon&inSR=&spatialRel=esriSpatialRelIntersects&resultType=none&distance=0.0&units=esriSRUnit_Meter&outDistance=&relationParam=&returnGeodetic=false&outFields=*&returnGeometry=true&returnCentroid=false&returnEnvelope=false&featureEncoding=esriDefault&multipatchOption=xyFootprint&maxAllowableOffset=&geometryPrecision=&outSR=4326&defaultSR=&datumTransformation=&applyVCSProjection=false&returnIdsOnly=false&returnUniqueIdsOnly=false&returnCountOnly=false&returnExtentOnly=false&returnQueryGeometry=false&returnDistinctValues=false&cacheHint=false&collation=&orderByFields=&groupByFieldsForStatistics=&returnAggIds=false&outStatistics=&having=&resultOffset=&resultRecordCount=&returnZ=false&returnM=false&returnTrueCurves=false&returnExceededLimitFeatures=true&quantizationParameters=&sqlFormat=none&f=pgeojson&token=';
	const federalNPS = 'https://services.arcgis.com/v01gqwM5QqNysAAi/arcgis/rest/services/Fee_Managers_PADUS/FeatureServer/0//query?where=State_Nm%3D%27OR%27+AND+Own_Name%3D%27NPS%27&objectIds=&geometry=&geometryType=esriGeometryPolygon&inSR=&spatialRel=esriSpatialRelIntersects&resultType=none&distance=0.0&units=esriSRUnit_Meter&outDistance=&relationParam=&returnGeodetic=false&outFields=*&returnGeometry=true&returnCentroid=false&returnEnvelope=false&featureEncoding=esriDefault&multipatchOption=xyFootprint&maxAllowableOffset=&geometryPrecision=&outSR=4326&defaultSR=&datumTransformation=&applyVCSProjection=false&returnIdsOnly=false&returnUniqueIdsOnly=false&returnCountOnly=false&returnExtentOnly=false&returnQueryGeometry=false&returnDistinctValues=false&cacheHint=false&collation=&orderByFields=&groupByFieldsForStatistics=&returnAggIds=false&outStatistics=&having=&resultOffset=&resultRecordCount=&returnZ=false&returnM=false&returnTrueCurves=false&returnExceededLimitFeatures=true&quantizationParameters=&sqlFormat=none&f=pgeojson&token=';

	map.addSource('BLM', {
		type: 'geojson',
		data: federalBLM
	});

	map.addSource('USFS', {
		type: 'geojson',
		data: federalUSFS
	});

	map.addSource('USFWS', {
		type: 'geojson',
		data: federalUSFWS
	});

	map.addSource('NPS', {
		type: 'geojson',
		data: federalNPS
	});

	map.addLayer({
		id: 'BLM-fill',
		source: 'BLM',
		type: 'fill',
		paint: blmPaint,
		layout: {}
	}, underLayer)

	map.addLayer({
		id: 'USFS-fill',
		source: 'USFS',
		type: 'fill',
		paint: usfsPaint,
		layout: {},
	}, underLayer)

	map.addLayer({
		id: 'USFS-line',
		source: 'USFS',
		type: 'line',
		paint: usfsLinePaint,
		layout: lineLayout
	}, underLayer)

	map.addLayer({
		id: 'USFS-line-inner',
		source: 'USFS',
		type: 'line',
		paint: usfsInnerLinePaint,
		layout: lineLayout
	}, underLayer)

		map.addLayer({
		id: 'USFWS-fill',
		source: 'USFWS',
		type: 'fill',
		paint: usfwsPaint,
		layout: {},
	}, underLayer)

	map.addLayer({
		id: 'USFWS-line',
		source: 'USFWS',
		type: 'line',
		paint: usfwsLinePaint,
		layout: lineLayout
	}, underLayer)

	map.addLayer({
		id: 'USFWS-line-inner',
		source: 'USFWS',
		type: 'line',
		paint: usfwsInnerLinePaint,
		layout: lineLayout
	}, underLayer)

	map.addLayer({
		id: 'NPS-fill',
		source: 'NPS',
		type: 'fill',
		paint: npsPaint,
		layout: {}
	}, underLayer)

	map.addLayer({
		id: 'NPS-line',
		source: 'NPS',
		type: 'line',
		paint: npsLinePaint,
		layout: lineLayout
	}, underLayer)

	map.addLayer({
		id: 'NPS-line-inner',
		source: 'NPS',
		type: 'line',
		paint: npsInnerLinePaint,
		layout: lineLayout
	}, underLayer)
}

map.on("style.load", () => {
  addSourceAndLayer();
  updateFilters();
  // Set initial visibility of federal land layers based on checkbox state
  toggleFederalLands();
});

// Federal Lands Toggle (NPS, USFS, USFWS)
function toggleFederalLands() {
  const isChecked = document.getElementById("flexSwitchCheckChecked").checked;
  const visibility = isChecked ? "visible" : "none";
  
  const federalLayers = [
		'BLM-fill',
    'USFS-fill', 'USFS-line', 'USFS-line-inner',
    'USFWS-fill', 'USFWS-line', 'USFWS-line-inner',
    'NPS-fill', 'NPS-line', 'NPS-line-inner',
  ];
  
  federalLayers.forEach(layerId => {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, 'visibility', visibility);
    }
  });
}
document.getElementById("flexSwitchCheckChecked").addEventListener("change", toggleFederalLands);

// Initialize year slider for year range
function initializeYearSlider() {
  const sliderElement = document.getElementById('yearSlider');

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

  yearSlider = sliderElement.noUiSlider;

  // Merge tooltips when they are close together
  mergeTooltips(sliderElement, 25, ' - ');

  // Update filters when slider values change
  yearSlider.on('update', function(values) {
    updateFilters(false);  // don't show the loading wheel while user is still dragging
  });

	yearSlider.on('set', function(values) {
		updateFilters();  // once the user stops dragging, show the loading wheel
	});
}
initializeYearSlider();

// Method Symbology Toggle
function toggleMethodSymbology() {
  methodSymbologyEnabled = document.getElementById("methodSymbologySwitch").checked;
  
  // Show/hide color indicators
  document.querySelectorAll('.method-legend-item').forEach(indicator => {
    if (methodSymbologyEnabled) {
      indicator.classList.add('visible');
    } else {
      indicator.classList.remove('visible');
    }
  });
  
  // Update paint properties for all relevant layers
  const colorExpression = getMethodColor();
  
  if (map.getLayer('pesticides-fill_base')) {
    map.setPaintProperty('pesticides-fill_base', 'fill-color', colorExpression);
  }
  
  if (map.getLayer('pesticides-stroke_base')) {
    map.setPaintProperty('pesticides-stroke_base', 'line-color', colorExpression);
  }
  
  if (map.getLayer('pesticides-fill_hover')) {
    map.setPaintProperty('pesticides-fill_hover', 'fill-color', [
      "case",
      ["boolean", ["feature-state", "hover"], false],
      colorExpression,
      "transparent"
    ]);
  }
  
  console.debug("Method symbology toggled:", methodSymbologyEnabled);
}

document.getElementById("methodSymbologySwitch").addEventListener("change", toggleMethodSymbology);

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

// update map filters based on year range, method of application, and selected chemicals
function updateFilters(showWheel = true) {
	if (showWheel) {
		showLoadingWheel();
	}

	// Get year values from noUiSlider
	let fromYear, toYear;
	if (yearSlider) {
		const values = yearSlider.get();
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
