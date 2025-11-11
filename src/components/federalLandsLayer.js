import { map } from '../mapSetup.js';

// --- CONTENT FROM styles.js ---
const lineLayout = {
  'line-cap': 'round',
  'line-join': 'round'
}

//blm
const blmFillColor = '#d9c352'  // (darker and more brown than original #eeee9a)
const blmFillOpacity = .5
const blmLineColor = 'transparent'

//usfs
const usfsFillColor = 'transparent'
const usfsFillOpacity = 1
const usfsLineColor = '#83A278'
const usfsInnerLineColor = `rgb(131, 162, 120)`; // MUST use RGB string, not HEX for current method of setting transparency in legend

//usfws
const usfwsFillColor = 'transparent'
const usfwsFillOpacity = 0.5
const usfwsLineColor = '#6b80a0'  // desaturated by 50% from #507bbb, rgb(97, 136, 194)
const usfwsInnerLineColor = `rgb(121, 141, 170)`;  // MUST use RGB string, not HEX for current method of setting transparency in legend


// BLM styles
const blmPaint = {
  'fill-color': blmFillColor,
  'fill-opacity': blmFillOpacity
}

//note no line layer for BLM layer added to map at this time.

// US Forest Service (USFS) styles
const usfsPaint = {
  'fill-color': usfsFillColor,
  'fill-opacity': usfsFillOpacity
}


const usfsLinePaint = {
  'line-width': [
    'interpolate',
    // ['exponential', 1],
    ["linear"],
    ['zoom'],
    0, 0,
    4, 0,
    7, 1,
    8, 1.5,
    13, 6
  ],
  'line-color': usfsLineColor,
}


const usfsInnerLinePaint = {
  'line-width': [
    'interpolate',
    // ['exponential', 1],
    ["linear"],
    ['zoom'],
    0, 0,
    4, 0,
    7, 3.5,
    8, 4,
    13, 6.5
  ],
  'line-offset': [
    'interpolate',
    // ['exponential', 1],
    ["linear"],
    ['zoom'],
    0, 0,
    4, 0,
    7, 2,
    8, 3,
    13, 6
  ],
  'line-color': usfsInnerLineColor,
  'line-opacity': 0.3
}

// US Fish and Wildlife (USFWS) styles - Refuges
const usfwsPaint = {
  'fill-color': usfwsFillColor,
  'fill-opacity': usfwsFillOpacity
}

const usfwsLinePaint = {
  'line-width': [
    'interpolate',
    // ['exponential', 1],
    ["linear"],
    ['zoom'],
    0, 0,
    4, 0,
    7, 1,
    8, 1.5,
    12, 2
  ],
  'line-color': usfwsLineColor,
}


const usfwsInnerLinePaint = {
  'line-width': [
    'interpolate',
    // ['exponential', 1],
    ["linear"],
    ['zoom'],
    0, 0,
    4, 0,
    7, 2,
    8, 4,
    13, 5
  ],
  'line-offset': [
    'interpolate',
    // ['exponential', 1],
    ["linear"],
    ['zoom'],
    0, 0,
    4, 0,
    7, 1.5,
    8, 2,
    13, 4
  ],
  'line-color': usfwsInnerLineColor,
  'line-opacity': 0.3
}


//nps
const npsLineColor = '#9A8B70'
const npsFillColor = 'transparent'
const npsFillOpacity = 1
const npsInnerLineColor = `rgb(154, 139, 112)` // MUST use RGB string, not HEX for current method of setting transparency in legend


// NPS styles
const npsPaint = {
  'fill-color': npsFillColor,
  'fill-opacity': npsFillOpacity
}
const npsLinePaint = {
  'line-width': [
    'interpolate',
    // ['exponential', 1],
    ["linear"],
    ['zoom'],
    0, 0,
    4, 0,
    7, 1,
    8, 1.5,
    13, 6
  ],
  'line-color': npsLineColor,
}

const npsInnerLinePaint = {
  'line-width': [
    'interpolate',
    // ['exponential', 1],
    ["linear"],
    ['zoom'],
    0, 0,
    4, 0,
    7, 3.5,
    8, 4,
    13, 6.5
  ],
  'line-offset': [
    'interpolate',
    // ['exponential', 1],
    ["linear"],
    ['zoom'],
    0, 0,
    4, 0,
    7, 2,
    8, 2,
    10, 4,
    13, 6
  ],
  'line-color': npsInnerLineColor,
  'line-opacity': 0.3
}

// --- END OF CONTENT FROM styles.js ---


export function addFederalLandsLayers() {
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

// Federal Lands Toggle (NPS, USFS, USFWS)
export function toggleFederalLands() {
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