underLayer = 'road_secondary_tertiary_fallback' // SET THIS LAYER

//blm
blmFillColor = '#eeee9a'
blmFillOpacity = .5
blmLineColor = 'transparent'

//usfs
usfsFillColor = 'transparent'
usfsFillOpacity = 1
usfsLineColor = '#83A278'
usfsInnerLineColor = `rgb(131, 162, 120)`; // MUST use RGB string, not HEX for current method of setting transparency in legend

//usfws
usfwsFillColor = 'transparent'
usfwsFillOpacity = 0.5
usfwsLineColor = '#507BBB'
usfwsInnerLineColor = `rgb(97, 136, 194)`; // MUST use RGB string, not HEX for current method of setting transparency in legend


// BLM styles
blmPaint = {
    'fill-color': blmFillColor,
    'fill-opacity': blmFillOpacity
}

//note no line layer for BLM layer added to map at this time.

// US Forest Service (USFS) styles
usfsPaint = {
    'fill-color': usfsFillColor,
    'fill-opacity': usfsFillOpacity
}


usfsLinePaint = {
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


usfsInnerLinePaint = {
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
usfwsPaint = {
    'fill-color': usfwsFillColor,
    'fill-opacity': usfwsFillOpacity
}

usfwsLinePaint = {
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


usfwsInnerLinePaint = {
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



map.addLayer({
        id: 'blmLayer',
        source: 'blmSource',
        'source-layer': 'blmfgb',
        type: 'fill',
        minzoom: ownershipminzoom,
        paint: blmPaint,
        layout: {

        },
        visibility: 'none'
    }, underLayer)

    map.addLayer({
        id: 'usfwsLayer',
        source: 'usfwsSource',
        'source-layer': 'usfwsfgb',
        type: 'fill',
        minzoom: 7,
        paint: usfwsPaint,
        layout: {

        },


    }, underLayer)

    map.addLayer({
        id: 'usfwsLineLayer',
        source: 'usfwsSource',
        'source-layer': 'usfwsfgb',
        type: 'line',
        minzoom: 7,
        paint: usfwsLinePaint,
        layout: lineLayout
    }, underLayer)

    map.addLayer({
        id: 'usfwsInnerLineLayer',
        source: 'usfwsSource',
        'source-layer': 'usfwsfgb',
        type: 'line',
        minzoom: 7,
        paint: usfwsInnerLinePaint,
        layout: lineLayout
    }, underLayer)


    map.addLayer({
        id: 'usfsLayer',
        source: 'usfsSource',
        'source-layer': 'usfsfgb',
        type: 'fill',
        minzoom: 7,
        paint: usfsPaint,
        layout: {

        },
    }, underLayer)

    map.addLayer({
        id: 'usfsLayerLine',
        source: 'usfsSource',
        'source-layer': 'usfsfgb',
        type: 'line',
        minzoom: 7,
        paint: usfsLinePaint,
        layout: lineLayout
    }, underLayer)

    map.addLayer({
        id: 'usfsLayerInnerLine',
        source: 'usfsSource',
        'source-layer': 'usfsfgb',
        type: 'line',
        minzoom: 7,
        paint: usfsInnerLinePaint,
        layout: lineLayout
    }, underLayer)

