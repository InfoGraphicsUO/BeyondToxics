import appState from '../state.js';
import { updateFilters } from './mainFilter.js';

function populateChemicalFilter() {
  const container = document.getElementById('chemical-list');

  appState.chemicalsList.forEach(chemical => {
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
      appState.selectedChemicals.add(checkbox.value);
      checkbox.checked = true;
    });
  } else {
    // Select All was unchecked - deselect ALL chemicals
    appState.selectedChemicals.clear();
    document.querySelectorAll('#chemical-list input[type="checkbox"]').forEach(checkbox => {
      checkbox.checked = false;
    });
  }

  // Update selectAllChecked based on whether all chemicals (not just visible) are selected
  appState.selectAllChecked = appState.selectedChemicals.size === appState.chemicalsList.length;

  updateFilters();
}

function handleIndividualChemicalChange(e) {
  const chemical = e.target.value;

  if (e.target.checked) {
    appState.selectedChemicals.add(chemical);
  } else {
    appState.selectedChemicals.delete(chemical);
  }

  // Update "Select All" checkbox based on visible chemicals
  updateSelectAllCheckboxForVisible();

  // Update the global selectAllChecked flag based on all chemicals
  appState.selectAllChecked = appState.selectedChemicals.size === appState.chemicalsList.length;

  updateFilters();
}

// Load chemicals from JSON
export function loadChemicalFilter() {
  fetch('public/chemicals.json')
    .then(response => response.json())
    .then(data => {
      appState.chemicalsList = data;
      populateChemicalFilter();
      // Reset to defaults: select all chemicals and check "Select All"
      appState.selectedChemicals = new Set(appState.chemicalsList);
      appState.selectAllChecked = true;
      document.getElementById('select-all-checkbox').checked = appState.selectAllChecked;
      updateFilters();
    })
    .catch(error => console.error('Error loading chemicals:', error));
}