/**
 * Date utility functions
 */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Get current month in format "Month YYYY" (e.g., "January 2023")
 * @param {Date} date - Optional date object (defaults to current date)
 * @returns {string} Formatted month string
 */
function getFormattedMonth(date = null) {
  const currentDate = date || new Date();
  return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
}

/**
 * Get previous month in format "Month YYYY" (e.g., "January 2023")
 * @returns {string} Formatted previous month string
 */
function getPreviousMonthFormatted() {
  const currentDate = new Date();
  // Go back one month
  currentDate.setMonth(currentDate.getMonth() - 1);
  return getFormattedMonth(currentDate);
}

/**
 * Parse a formatted month string into month index and year
 * @param {string} formattedMonth - Month in format "Month YYYY" (e.g., "January 2023")
 * @returns {Object} Object with month index and year
 */
function parseFormattedMonth(formattedMonth) {
  const [monthName, yearStr] = formattedMonth.split(' ');
  const monthIndex = MONTHS.indexOf(monthName);
  const year = parseInt(yearStr, 10);
  
  return {
    monthIndex,
    year
  };
}

module.exports = {
  MONTHS,
  getFormattedMonth,
  getPreviousMonthFormatted,
  parseFormattedMonth
}; 