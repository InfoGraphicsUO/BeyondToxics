const lineLayout = {
	'line-cap': 'round',
	'line-join': 'round'
}

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
// desaturated by 50% from #507bbb, rgb(97, 136, 194)
usfwsLineColor = '#6b80a0'
usfwsInnerLineColor = `rgb(121, 141, 170)`; // MUST use RGB string, not HEX for current method of setting transparency in legend


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


//nps
npsLineColor = '#9A8B70'
npsFillColor = 'transparent'
npsFillOpacity = 1
npsInnerLineColor = `rgb(154, 139, 112)` // MUST use RGB string, not HEX for current method of setting transparency in legend


// NPS styles
npsPaint = {
	'fill-color': npsFillColor,
	'fill-opacity': npsFillOpacity
}
npsLinePaint = {
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

npsInnerLinePaint = {
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