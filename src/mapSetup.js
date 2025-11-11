import { ACCESS_TOKEN, basemap_style, defaultCenter, bounds, defaultZoom } from './config.js';

mapboxgl.accessToken = ACCESS_TOKEN;

// Main Map
export const map = new mapboxgl.Map({
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
export const insetMap = new mapboxgl.Map({
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