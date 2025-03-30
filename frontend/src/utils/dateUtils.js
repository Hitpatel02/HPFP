import { format, parse } from 'date-fns';

/**
 * Format a date string from YYYY-MM-DD to DD/MM/YYYY
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {string} - Formatted date string in DD/MM/YYYY format
 */
export const formatDateForDisplay = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return format(date, 'dd/MM/yyyy');
  } catch (error) {
    return dateString;
  }
};

/**
 * Get today's date in YYYY-MM-DD format using local timezone
 * @returns {string} - Today's date in YYYY-MM-DD format
 */
export const getTodayDate = () => {
  // Force a new Date object to ensure we get the current date, not cached
  const today = new Date();
  
  // Get local date values
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  
  const formattedDate = `${year}-${month}-${day}`;
  console.log(`getTodayDate called, returning: ${formattedDate}, raw date: ${today.toString()}`);
  
  return formattedDate;
};

/**
 * Format a date object to DD/MM/YYYY format
 * @param {Date} date - Date object
 * @returns {string} - Formatted date string in DD/MM/YYYY format
 */
export const formatDate = (date) => {
  if (!date) return '';
  try {
    return format(date, 'dd/MM/yyyy');
  } catch (error) {
    return '';
  }
}; 