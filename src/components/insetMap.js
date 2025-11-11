import { map, insetMap } from '../mapSetup.js';
import appState from '../state.js';
import { initializeYearSlider } from '../filters/yearFilter.js';
import { resetFiltersToDefaults } from '../filters/mainFilter.js';

let isDragging = false;
let dragStartLngLat;
let rectangleFeature;

// When the inset map loads, add layers and set up event handlers
function initializeInsetMapListeners() {
    insetMap.on('load', () => {
    	// Initialize year slider if not already done
    	if (!appState.yearSlider) {
    		initializeYearSlider();
    	}
    	resetFiltersToDefaults();
    	addInsetLayers();
    	document
    		.querySelectorAll('#insetMap.mapboxgl-ctrl-bottom-left')
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
    			if (e.points.length!== 1) return;

    			startDrag(e, canvas, 'touchmove', 'touchend');
    		});
    	});
    });
}

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
		data: 'public/OR_COUNTY.json'
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

export function initializeInsetMap() {
    initializeInsetMapListeners();
    map.on('move', function () {
    	updateInsetMapBounds();
    });
}