import { map } from '../mapSetup.js';
import { sourceLayer } from '../config.js';
import appState from '../state.js';
import { isTouchDevice, formatDate, displayValue } from '../utils.js';

// Get color expression for method-based symbology
export function getMethodColor() {
  if (!appState.methodSymbologyEnabled) {
    return "orange";  // Default color when symbology is off
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

// Update paint properties for all relevant layers
export function updatePesticideLayerSymbology() {
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
}

export function addPesticideLayers() {
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

  // --- SETUP INTERACTIVITY ---
  setupClickPopup();
  setupHoverTooltip();
}

function setupClickPopup() {
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

          // Details of the selected polygon
          details.innerHTML = `
            <p><strong>Method of Presticide Application:</strong> ${displayValue(f.Methods)}</p>
            <p><strong>Chemicals Applied:</strong> ${displayValue(f.Chemicals)}</p>
            <p><strong>Time Range of Application:</strong> ${formatDate(f.StartDate)} - ${formatDate(f.EndDate)}</p>
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
          if (appState.hoveredPolygonId !== null && appState.hoveredPolygonId !== featureId) {
            map.setFeatureState(
              {
                source: "FERNS-tileset",
                sourceLayer: sourceLayer,
                id: appState.hoveredPolygonId
              },
              { hover: false }
            );
          }

          appState.hoveredPolygonId = featureId;

          map.setFeatureState(
            {
              source: "FERNS-tileset",
              sourceLayer: sourceLayer,
              id: appState.hoveredPolygonId
            },
            { hover: true }
          );
        }

        // Set selected state for clicked polygon
        function setSelected(featureId) {
          // Clear any previously selected polygon
          if (appState.selectedPolygonId !== null && appState.selectedPolygonId !== featureId) {
            map.setFeatureState(
              {
                source: "FERNS-tileset",
                sourceLayer: sourceLayer,
                id: appState.selectedPolygonId
              },
              { selected: false }
            );
          }

          appState.selectedPolygonId = featureId;

          map.setFeatureState(
            {
              source: "FERNS-tileset",
              sourceLayer: sourceLayer,
              id: appState.selectedPolygonId
            },
            { selected: true }
          );
        }

        let selectedIdx = 0;  // Index of selected polygon in list of polygons
        let hoveredTempId = null;  // Temporary ID for hovered polygon

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

            if (hoveredTempId!== null) {
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

        showDetails(features[selectedIdx]);
        setHighlight(features[selectedIdx].id);
        setSelected(features[selectedIdx].id);

        popup.setDOMContent(container).addTo(map);
      });
}

function setupHoverTooltip() {
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
            if (appState.hoveredPolygonId !== null) {
              map.setFeatureState(
                {
                  source: "FERNS-tileset",
                  sourceLayer: sourceLayer,
                  id: appState.hoveredPolygonId
                },
                { hover: false }
              );
            }
            appState.hoveredPolygonId = e.features[0].id;
            console.debug("Hovered ID:", appState.hoveredPolygonId);
            map.setFeatureState(
              {
                source: "FERNS-tileset",
                sourceLayer: sourceLayer,
                id: appState.hoveredPolygonId
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

        if (appState.hoveredPolygonId !== null) {
          map.setFeatureState(
            {
              source: "FERNS-tileset",
              sourceLayer: sourceLayer,
              id: appState.hoveredPolygonId
            },
            { hover: false }
          );
        }
        appState.hoveredPolygonId = null;
      });
}