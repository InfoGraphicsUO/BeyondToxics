// Mobile Flag
export function isMobileUser() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}
export const isTouchDevice = isMobileUser();

// Format the date strings to MM/DD/YYYY
export function formatDate(dateStr) {
  if (!dateStr || dateStr.length !== 8) return dateStr;
  const year = dateStr.slice(0, 4);
  const month = dateStr.slice(4, 6);
  const day = dateStr.slice(6, 8);
  return `${month}/${day}/${year}`;
}

// Clean up the values for display
export function displayValue(value) {
  if (!value) return "No Data";
  return (
    value
      .replace(/^(\.\s*)+/, "") // Remove leading ".. ", "..", etc in landowners
      .replace(/None,\s|,\sNone/g, "") // Remove all "None, " or ", None" (case-insensitive) in chemicals
      .trim() // Trim whitespace
      .replace(/,$/, "") || "No Data"
  ); // Remove trailing comma or return NA if cleaned str is empty
}
