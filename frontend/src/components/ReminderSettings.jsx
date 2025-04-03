import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Card, Form, Button, Alert, Spinner, Table, Row, Col, InputGroup } from 'react-bootstrap';
import { format, sub, parse } from 'date-fns';
import { formatDateForDisplay, getTodayDate } from '../utils/dateUtils';
import CommunicationDateInput, { DatePickerProvider } from './common/CommunicationDateInput';
import SetReminderDates from './SetReminderDates';
import WhatsAppControl from './WhatsAppControl';
import ReminderToggles from './ReminderToggles';
import { selectToken, setInitialDataLoaded } from '../redux/authSlice';
import LoadingSpinner from './common/LoadingSpinner';
import { settingsAPI } from '../api';

const ReminderSettings = () => {
  const token = useSelector(selectToken);
  const dispatch = useDispatch();
  
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // Add month year picker state for the current active month
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // State to track available months with settings
  const [availableMonths, setAvailableMonths] = useState([]);
  
  const [formData, setFormData] = useState({
    today_date: '',
    gst_due_date: '',
    gst_reminder_1_date: '',
    gst_reminder_2_date: '',
    tds_due_date: '',
    tds_reminder_1_date: '',
    tds_reminder_2_date: '',
    password: '',
    scheduler_hour: 9,
    scheduler_minute: '00',
    scheduler_am_pm: 'AM'
  });

  useEffect(() => {
    if (!token) return;
    
    fetchAvailableMonths();
    fetchSettings();
  }, [token]);
  
  // Update today's date automatically when component mounts
  useEffect(() => {
    // Set today's date on initial load
    updateTodayDate();
    
    // Set up an interval to update the date at midnight
    const intervalId = setInterval(() => {
      const now = new Date();
      // Check if it's midnight (hour is 0, minute is 0)
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        console.log('Midnight detected, updating today\'s date');
        updateTodayDate();
      }
    }, 60000); // Check every minute
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);
  
  // Fetch settings when selected month/year changes
  useEffect(() => {
    if (token) {
      fetchSettings();
    }
  }, [selectedMonth, selectedYear]);
  
  // Function to update today's date
  const updateTodayDate = () => {
    setFormData(prev => ({
      ...prev,
      today_date: getTodayDate() // Use the getTodayDate function to ensure consistent timezone handling
    }));
  };
  
  // Helper function to format dates for the API
  const formatToYYYYMMDD = (dateString) => {
    if (!dateString) return '';
    
    try {
      // Check if the date is already in YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString;
      }
      
      // Handle PostgreSQL timestamp format with timezone
      if (dateString.includes('T')) {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
          throw new Error('Invalid date format');
        }
        return format(date, 'yyyy-MM-dd');
      }
      
      // Parse the date from the display format (e.g., "22-Mar-2023")
      try {
        const parsedDate = parse(dateString, 'dd-MMM-yyyy', new Date());
        return format(parsedDate, 'yyyy-MM-dd');
      } catch (parseError) {
        // If parsing fails, try to create a date directly
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
          throw new Error('Invalid date format');
        }
        return format(date, 'yyyy-MM-dd');
      }
    } catch (error) {
      console.error('Error formatting date:', error, 'for date:', dateString);
      // Return empty string for invalid dates
      return '';
    }
  };
  
  // Fetch available months with settings
  const fetchAvailableMonths = async () => {
    try {
      const response = await settingsAPI.getAvailableMonths(token);
      if (response && Array.isArray(response)) {
        setAvailableMonths(response);
      }
    } catch (error) {
      console.error('Error fetching available months:', error);
      // Don't set error state as this shouldn't block the UI
    }
  };
  
  // Fetch settings for the selected month and year
  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const monthStr = (selectedMonth + 1).toString().padStart(2, '0');
      const yearStr = selectedYear.toString();
      const monthYear = `${yearStr}-${monthStr}`;
      
      console.log(`Fetching reminder settings for month: ${monthYear}`);
      
      const response = await settingsAPI.getSettingsForMonth(token, yearStr, monthStr);
      
      // Format dates and set default values
      if (response && Object.keys(response).length > 0) {
        const formattedSettings = { ...response };
        const dateFields = [
          'gst_due_date', 'gst_reminder_1_date', 
          'gst_reminder_2_date', 'tds_due_date', 'tds_reminder_1_date', 
          'tds_reminder_2_date'
        ];
        
        // Always set today's date to the current date, ignoring what's in the server response
        formattedSettings.today_date = getTodayDate();
        
        // Format all date fields to ensure consistency
        dateFields.forEach(field => {
          if (formattedSettings[field]) {
            // Ensure dates are in YYYY-MM-DD format for internal storage
            formattedSettings[field] = formatToYYYYMMDD(formattedSettings[field]);
          }
        });
        
        // Ensure scheduler fields have default values if they're not present or null
        formattedSettings.scheduler_hour = formattedSettings.scheduler_hour !== null ? 
          parseInt(formattedSettings.scheduler_hour, 10) : 9;
        
        // Parse minute value for internal state storage
        const minuteValue = formattedSettings.scheduler_minute !== null ? 
          parseInt(formattedSettings.scheduler_minute, 10) : 0;
        
        // Store the raw numeric value
        formattedSettings.scheduler_minute_value = minuteValue;
        
        // Format minute for display with leading zero if needed
        formattedSettings.scheduler_minute = minuteValue.toString().padStart(2, '0');
        
        formattedSettings.scheduler_am_pm = formattedSettings.scheduler_am_pm || 'AM';
        
        // Ensure password field is a string
        formattedSettings.password = formattedSettings.password || '';
        
        console.log('Formatted settings:', formattedSettings);
        
        // Set default values for missing fields
        formattedSettings.gst_due_date = formattedSettings.gst_due_date || '';
        formattedSettings.gst_reminder_1_date = formattedSettings.gst_reminder_1_date || '';
        formattedSettings.gst_reminder_2_date = formattedSettings.gst_reminder_2_date || '';
        formattedSettings.tds_due_date = formattedSettings.tds_due_date || '';
        formattedSettings.tds_reminder_1_date = formattedSettings.tds_reminder_1_date || '';
        formattedSettings.tds_reminder_2_date = formattedSettings.tds_reminder_2_date || '';
        
        // Set the formatted settings to the form data state
        setFormData(formattedSettings);
        setSettings(formattedSettings);
      } else {
        // No settings found for this month, set empty form
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
        // Reset form data but keep the selected month/year
        setFormData({
          today_date: format(new Date(), 'yyyy-MM-dd'),
          gst_due_date: '',
          gst_reminder_1_date: '',
          gst_reminder_2_date: '',
          tds_due_date: '',
          tds_reminder_1_date: '',
          tds_reminder_2_date: '',
          password: '',
          scheduler_hour: 9,
          scheduler_minute: '00',
          scheduler_am_pm: 'AM',
          current_month: `${months[selectedMonth]} ${selectedYear}`
        });
        setSettings(null);
      }
      
      // Mark data as loaded
      dispatch(setInitialDataLoaded(true));
    } catch (error) {
      console.error('Error fetching settings:', error);
      setError('Failed to load settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Check if this is a date clear event and handle it separately
    if (e.isDateClear) {
      // Just update the form data with empty value
      setFormData(prev => ({
        ...prev,
        [name]: value // Just update the form data with the cleared value (empty string)
      }));
      // Don't proceed further - prevents form submission
      return;
    }
    
    // Special handling for scheduler_hour
    if (name === 'scheduler_hour') {
      // Allow empty input
      if (value === '') {
        setFormData(prev => ({
          ...prev,
          scheduler_hour: ''
        }));
      } else {
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue) && numValue >= 1 && numValue <= 12) {
          setFormData(prev => ({
            ...prev,
            scheduler_hour: value
          }));
        }
      }
    }
    // Special handling for scheduler_minute
    else if (name === 'scheduler_minute') {
      // Allow empty input or only valid numbers between 0-59
      if (value === '') {
        setFormData(prev => ({
          ...prev,
          scheduler_minute: '',
          scheduler_minute_value: 0
        }));
      } else {
        // Parse the input value and check the range
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue) && numValue >= 0 && numValue <= 59) {
          setFormData(prev => ({
            ...prev,
            scheduler_minute: value,
            scheduler_minute_value: numValue
          }));
        }
        // Don't update state if outside valid range
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Add blur handlers for hour and minute fields
  const handleHourBlur = (e) => {
    const value = e.target.value;
    if (value === '') {
      setFormData(prev => ({
        ...prev,
        scheduler_hour: '9' // Default value
      }));
    }
  };

  const handleMinuteBlur = (e) => {
    const value = e.target.value;
    if (value === '') {
      setFormData(prev => ({
        ...prev,
        scheduler_minute: '00',
        scheduler_minute_value: 0
      }));
    } else {
      const numValue = parseInt(value.replace(/^0+/, ''), 10);
      if (!isNaN(numValue) && numValue >= 0 && numValue <= 59) {
        setFormData(prev => ({
          ...prev,
          scheduler_minute: numValue.toString().padStart(2, '0'),
          scheduler_minute_value: numValue
        }));
      } else {
        // If invalid, reset to default
        setFormData(prev => ({
          ...prev,
          scheduler_minute: '00',
          scheduler_minute_value: 0
        }));
      }
    }
  };

  // Add a new handler for setting reminder dates automatically
  const handleSetReminderDates = (dates) => {
    setFormData(prev => ({
      ...prev,
      gst_reminder_1_date: dates.reminder1,
      gst_reminder_2_date: dates.reminder2
    }));
  };
  
  // Add handler for TDS reminder dates
  const handleSetTDSReminderDates = (dates) => {
    setFormData(prev => ({
      ...prev,
      tds_reminder_1_date: dates.reminder1,
      tds_reminder_2_date: dates.reminder2
    }));
  };
  
  // Handle month and year changes
  const handleMonthChange = (e) => {
    const monthIndex = parseInt(e.target.value, 10);
    setSelectedMonth(monthIndex);
  };
  
  const handleYearChange = (e) => {
    const year = parseInt(e.target.value, 10);
    setSelectedYear(year);
  };
  
  // Generate years array (5 years before current year, current year, 5 years after)
  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      years.push(i);
    }
    
    return years;
  };
  
  const years = generateYearOptions();
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                'July', 'August', 'September', 'October', 'November', 'December'];

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSaving(true);
    setError(null);
    
    try {
      // Clone the form data to avoid modifying state directly
      const formDataToSubmit = { ...formData };
      
      // Always set today's date to the current date
      formDataToSubmit.today_date = getTodayDate();
      
      // Format all dates to YYYY-MM-DD format
      const dateFields = [
        'gst_due_date', 'gst_reminder_1_date', 
        'gst_reminder_2_date', 'tds_due_date', 'tds_reminder_1_date', 
        'tds_reminder_2_date'
      ];
      
      dateFields.forEach(field => {
        if (formDataToSubmit[field]) {
          formDataToSubmit[field] = formatToYYYYMMDD(formDataToSubmit[field]);
        }
      });
      
      // Validate required fields
      if (!formDataToSubmit.today_date) {
        throw new Error('Today\'s date is required');
      }
      
      // Validate scheduler hour
      const hourValue = parseInt(formDataToSubmit.scheduler_hour, 10);
      if (isNaN(hourValue) || hourValue < 1 || hourValue > 12) {
        throw new Error('Scheduler hour must be between 1 and 12');
      }
      
      // Validate scheduler minute
      const minuteValue = formDataToSubmit.scheduler_minute_value;
      if (isNaN(minuteValue) || minuteValue < 0 || minuteValue > 59) {
        throw new Error('Scheduler minute must be between 0 and 59');
      }
      
      // Use the stored numeric value for minutes
      formDataToSubmit.scheduler_minute = minuteValue;
      
      // Ensure scheduler_am_pm is either 'AM' or 'PM'
      formDataToSubmit.scheduler_am_pm = 
        (formDataToSubmit.scheduler_am_pm === 'PM' ? 'PM' : 'AM');
      
      // Add current month based on month and year selection
      formDataToSubmit.current_month = `${months[selectedMonth]} ${selectedYear}`;
      
      // Remove month and year fields if they exist as they don't exist in the database
      delete formDataToSubmit.month;
      delete formDataToSubmit.year;
      
      // Remove the internal field before submission
      delete formDataToSubmit.scheduler_minute_value;
      
      console.log('Submitting data to API:', formDataToSubmit);
      
      // Use API service to save settings for the specific month/year
      await settingsAPI.saveSettingsForMonth(token, selectedYear, selectedMonth + 1, formDataToSubmit);
      
      setSuccessMessage('Settings saved successfully.');
      
      // Set a timeout to clear the success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      
      // Refresh available months list
      await fetchAvailableMonths();
      
      // Immediately fetch updated settings to ensure UI reflects current state
      await fetchSettings();
      
    } catch (error) {
      console.error('Error saving settings:', error);
      setError(error.message || 'An error occurred while saving settings');
    } finally {
      setLoading(false);
      setSaving(false);
    }
  };

  // Add a useEffect to monitor formData changes
  useEffect(() => {
    console.log('Updated form data:', formData);
  }, [formData]);

  return (
    <div className="settings-container">
      <h1 className="mb-4">Reminder Settings</h1>
      
      <DatePickerProvider>
        <div className="content-section">
          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <Alert variant="danger">{error}</Alert>
          ) : (
            <>
              {successMessage && <Alert variant="success">{successMessage}</Alert>}
              <WhatsAppControl />
              
              {settings && Object.keys(settings).length > 0 && (
                <ReminderToggles 
                  settings={settings} 
                  onSettingsUpdated={fetchSettings} 
                />
              )}
              
              <Card className="mb-4">
                <Card.Header as="h5">How Reminders Work</Card.Header>
                <Card.Body>
                  <p>The reminder system helps you keep track of pending documents for your clients:</p>
                  <ol>
                    <li><strong>Current Month</strong>: Select which month you're tracking documents for.</li>
                    <li><strong>GST Due Date</strong>: Set the official due date for GST filing.</li>
                    <li><strong>TDS Due Date</strong>: Set the official due date for TDS filing.</li>
                    <li><strong>Reminder Dates</strong>: Set reminder dates for each document type.</li>
                  </ol>
                  <p>Reminders will be sent automatically according to the document types enabled for each client and the dates you set here.</p>
                </Card.Body>
              </Card>
              
              <Card className="mb-4">
                <Card.Header as="h5">Reminder Settings</Card.Header>
                <Card.Body>
                  <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                      <Form.Label>Month Selection</Form.Label>
                      <Row className="month-year-picker">
                        <Col sm={6}>
                          <Form.Select
                            value={selectedMonth}
                            onChange={handleMonthChange}
                            className="mb-2"
                          >
                            {months.map((month, index) => (
                              <option key={index} value={index}>{month}</option>
                            ))}
                          </Form.Select>
                        </Col>
                        <Col sm={6}>
                          <Form.Select
                            value={selectedYear}
                            onChange={handleYearChange}
                          >
                            {years.map((year) => (
                              <option key={year} value={year}>{year}</option>
                            ))}
                          </Form.Select>
                        </Col>
                      </Row>
                      <Form.Control 
                        type="hidden" 
                        name="current_month" 
                        value={`${months[selectedMonth]} ${selectedYear}`} 
                      />
                      <Form.Text className="text-muted">
                        Select a month to configure or view its reminder settings. You can set up reminders for future months in advance.
                        {availableMonths.length > 0 && (
                          <div className="mt-2">
                            <strong>Months with settings:</strong> {availableMonths.map(m => `${months[m.month-1]} ${m.year}`).join(', ')}
                          </div>
                        )}
                      </Form.Text>
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>Today's Date</Form.Label>
                      <Form.Control
                        type="text"
                        name="today_date_display"
                        value={formatDateForDisplay(getTodayDate())}
                        readOnly
                        className="form-control"
                        style={{ backgroundColor: '#f8f9fa' }}
                      />
                      {/* Hidden field to store the actual value for form submission */}
                      <Form.Control 
                        type="hidden" 
                        name="today_date" 
                        value={getTodayDate()} 
                      />
                      <Form.Text className="text-muted">
                        Automatically set to current date based on your local timezone (India).
                      </Form.Text>
                    </Form.Group>
                    
                    <Row>
                      <Col md={6}>
                        <h4 className="mt-4 mb-3">GST Reminder Settings</h4>
                        
                        <CommunicationDateInput
                          label="GST Due Date"
                          name="gst_due_date"
                          value={formData.gst_due_date}
                          onChange={handleInputChange}
                          required={true}
                          helpText="The last date for GST return filing"
                        />
                        
                        <SetReminderDates 
                          gstDueDate={formData.gst_due_date}
                          onSetDates={handleSetReminderDates}
                          type="gst"
                        />
                        
                        <CommunicationDateInput
                          label="1st GST Reminder Date (Gentle Reminder)"
                          name="gst_reminder_1_date"
                          value={formData.gst_reminder_1_date}
                          onChange={handleInputChange}
                          helpText="Date when the first gentle reminder should be sent for GST documents."
                        />
                        
                        <CommunicationDateInput
                          label="2nd GST Reminder Date (Urgent Reminder)"
                          name="gst_reminder_2_date"
                          value={formData.gst_reminder_2_date}
                          onChange={handleInputChange}
                          helpText="Date when the second urgent reminder should be sent for GST documents."
                        />
                      </Col>
                      
                      <Col md={6}>
                        <h4 className="mt-4 mb-3">TDS Reminder Settings</h4>
                        
                        <CommunicationDateInput
                          label="TDS Due Date"
                          name="tds_due_date"
                          value={formData.tds_due_date}
                          onChange={handleInputChange}
                          helpText="The last date for TDS return filing. TDS reminder dates should be earlier than GST reminder dates."
                        />
                        
                        <SetReminderDates 
                          tdsDueDate={formData.tds_due_date}
                          onSetDates={handleSetTDSReminderDates}
                          type="tds"
                        />
                        
                        <CommunicationDateInput
                          label="1st TDS Reminder Date (Gentle Reminder)"
                          name="tds_reminder_1_date"
                          value={formData.tds_reminder_1_date}
                          onChange={handleInputChange}
                          helpText="Date when the first gentle reminder should be sent for TDS documents."
                        />
                        
                        <CommunicationDateInput
                          label="2nd TDS Reminder Date (Urgent Reminder)"
                          name="tds_reminder_2_date"
                          value={formData.tds_reminder_2_date}
                          onChange={handleInputChange}
                          helpText="Date when the second urgent reminder should be sent for TDS documents."
                        />
                      </Col>
                    </Row>
                    
                    <h4 className="mt-4 mb-3">Scheduler Settings</h4>
                    <p className="text-muted mb-4">
                      These settings control when automatic reminders are sent out. They apply to all months.
                    </p>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>Daily Scheduler Time</Form.Label>
                      <Row>
                        <Col sm={4}>
                          <Form.Label>Hour</Form.Label>
                          <Form.Control 
                            type="number" 
                            min="1" 
                            max="12" 
                            name="scheduler_hour" 
                            value={formData.scheduler_hour}
                            onChange={handleInputChange}
                            onBlur={handleHourBlur}
                          />
                        </Col>
                        <Col sm={4}>
                          <Form.Label>Minute</Form.Label>
                          <Form.Control 
                            type="text" 
                            name="scheduler_minute" 
                            value={formData.scheduler_minute} 
                            onChange={handleInputChange}
                            onBlur={handleMinuteBlur}
                          />
                        </Col>
                        <Col sm={4}>
                          <Form.Label>AM/PM</Form.Label>
                          <Form.Select
                            name="scheduler_am_pm"
                            value={formData.scheduler_am_pm}
                            onChange={handleInputChange}
                          >
                            <option value="AM">AM</option>
                            <option value="PM">PM</option>
                          </Form.Select>
                        </Col>
                      </Row>
                      <Form.Text className="text-muted">
                        The time of day when reminders should be automatically sent. System will automatically convert to server time.
                      </Form.Text>
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>Password</Form.Label>
                      <Form.Control 
                        type="text" 
                        name="password" 
                        value={formData.password} 
                        onChange={handleInputChange} 
                      />
                      <Form.Text className="text-muted">
                        Optional password to protect generated PDF reports (leave blank for unprotected reports)
                      </Form.Text>
                    </Form.Group>
                    
                    <Button variant="primary" type="submit" disabled={saving}>
                      {saving ? (
                        <>
                          <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                          Saving...
                        </>
                      ) : !settings ? 'Create Settings' : 'Update Settings'}
                    </Button>
                  </Form>
                </Card.Body>
              </Card>
            </>
          )}
        </div>
      </DatePickerProvider>
    </div>
  );
};

export default ReminderSettings; 