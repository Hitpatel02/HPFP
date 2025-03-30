import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Card, Form, Button, Alert, Spinner, Table, Row, Col, InputGroup } from 'react-bootstrap';
import { format, sub, parse } from 'date-fns';
import { formatDateForDisplay, getTodayDate } from '../utils/dateUtils';
import CommunicationDateInput, { DatePickerProvider } from './common/CommunicationDateInput';
import SetReminderDates from './SetReminderDates';
import SetTDSReminderDates from './SetTDSReminderDates';
import WhatsAppControl from './WhatsAppControl';
import ReminderToggles from './ReminderToggles';
import { selectToken, setInitialDataLoaded } from '../redux/authSlice';
import LoadingSpinner from './common/LoadingSpinner';
import api from '../services/api';

const ReminderSettings = () => {
  const token = useSelector(selectToken);
  const dispatch = useDispatch();
  
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // Add month year picker state
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
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
    scheduler_minute_value: 0,
    scheduler_am_pm: 'AM'
  });

  useEffect(() => {
    if (!token) return;
    
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
    
    // Fetch settings from backend
    fetchSettings();
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);
  
  // Function to update today's date
  const updateTodayDate = () => {
    const todayFormatted = getTodayDate();
    console.log('Updating today\'s date to:', todayFormatted);
    
    setFormData(prevData => ({
      ...prevData,
      today_date: todayFormatted
    }));
    
    // If settings exist, update the date in the database
    if (settings && settings.id) {
      updateTodayDateInDatabase(todayFormatted);
    }
  };
  
  // Function to update today's date in database
  const updateTodayDateInDatabase = async (currentDate) => {
    try {
      console.log('Updating today\'s date in database:', currentDate);
      await api.settings.updateSettings(token, settings.id, { today_date: currentDate });
    } catch (err) {
      console.error('Error updating today\'s date:', err);
    }
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      if (!token) {
        throw new Error('Authentication token is missing');
      }

      // Instead of using /api/reminder-settings endpoint, use the available endpoint
      const settings = await api.settings.getSettings(token);
      console.log('Fetched settings:', settings);

      // Ensure all dates are properly formatted before setting in form
      const formattedSettings = { ...settings };
      
      // Define date fields that need formatting
      const dateFields = [
        'today_date', 
        'gst_due_date',
        'gst_reminder_1_date',
        'gst_reminder_2_date',
        'tds_due_date',
        'tds_reminder_1_date',
        'tds_reminder_2_date'
      ];
      
      // Format dates consistently
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
      
      // Set month and year based on current_month
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      formattedSettings.today_date = formattedSettings.today_date || format(new Date(), 'yyyy-MM-dd');
      formattedSettings.gst_due_date = formattedSettings.gst_due_date || '';
      formattedSettings.gst_reminder_1_date = formattedSettings.gst_reminder_1_date || '';
      formattedSettings.gst_reminder_2_date = formattedSettings.gst_reminder_2_date || '';
      formattedSettings.tds_due_date = formattedSettings.tds_due_date || '';
      formattedSettings.tds_reminder_1_date = formattedSettings.tds_reminder_1_date || '';
      formattedSettings.tds_reminder_2_date = formattedSettings.tds_reminder_2_date || '';
      
      // Set the formatted settings to the form data state
      setFormData({
        today_date: formattedSettings.today_date || format(new Date(), 'yyyy-MM-dd'),
        gst_due_date: formattedSettings.gst_due_date || '',
        gst_reminder_1_date: formattedSettings.gst_reminder_1_date || '',
        gst_reminder_2_date: formattedSettings.gst_reminder_2_date || '',
        tds_due_date: formattedSettings.tds_due_date || '',
        tds_reminder_1_date: formattedSettings.tds_reminder_1_date || '',
        tds_reminder_2_date: formattedSettings.tds_reminder_2_date || '',
        password: formattedSettings.password || '',
        scheduler_hour: formattedSettings.scheduler_hour || 9,
        scheduler_minute: formattedSettings.scheduler_minute 
          ? formattedSettings.scheduler_minute.toString().padStart(2, '0') 
          : '00',
        scheduler_minute_value: formattedSettings.scheduler_minute || 0,
        scheduler_am_pm: formattedSettings.scheduler_am_pm || 'AM'
      });

      // Set the settings to state
      setSettings(settings);
      
      // Dispatch action to indicate initial data is loaded
      dispatch(setInitialDataLoaded(true));
    } catch (error) {
      console.error('Error fetching settings:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Format date to YYYY-MM-DD regardless of input format
  const formatToYYYYMMDD = (dateStr) => {
    if (!dateStr) return '';
    
    try {
      // Handle different date formats
      let date;
      
      // Check if already in YYYY-MM-DD format
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateStr;
      }
      
      // Check if in DD/MM/YYYY format
      if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        date = parse(dateStr, 'dd/MM/yyyy', new Date());
      } else {
        // Try standard date parsing
        date = new Date(dateStr);
      }
      
      if (isNaN(date.getTime())) {
        console.error(`Invalid date: ${dateStr}`);
        return '';
      }
      
      // Format to YYYY-MM-DD
      const formatted = format(date, 'yyyy-MM-dd');
      return formatted;
    } catch (error) {
      console.error(`Error formatting date ${dateStr}:`, error);
      return dateStr; // Return original if parsing fails
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
    updateCurrentMonth(monthIndex, selectedYear);
  };
  
  const handleYearChange = (e) => {
    const year = parseInt(e.target.value, 10);
    setSelectedYear(year);
    updateCurrentMonth(selectedMonth, year);
  };
  
  const updateCurrentMonth = (monthIndex, year) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
    
    const monthYearString = `${months[monthIndex]} ${year}`;
    
    setFormData(prev => ({
      ...prev,
      today_date: format(new Date(), 'yyyy-MM-dd')
    }));
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      if (!token) {
        throw new Error('Authentication token is missing');
      }
      
      console.log('Submitting form data:', formData);
      
      // Create a copy of form data for submission
      const formDataToSubmit = { ...formData };
      
      // Ensure all dates are in YYYY-MM-DD format
      const dateFields = ['today_date', 'gst_due_date', 'gst_reminder_1_date', 'gst_reminder_2_date', 
                         'tds_due_date', 'tds_reminder_1_date', 'tds_reminder_2_date'];
      
      // Validate required dates
      if (!formDataToSubmit.today_date) {
        throw new Error('Today\'s date is required');
      }
      
      if (!formDataToSubmit.gst_due_date) {
        throw new Error('GST due date is required');
      }
      
      dateFields.forEach(field => {
        if (formDataToSubmit[field]) {
          try {
            // Make sure the date is valid before formatting
            const testDate = new Date(formDataToSubmit[field]);
            if (isNaN(testDate.getTime())) {
              throw new Error(`Invalid date format for ${field}: ${formDataToSubmit[field]}`);
            }
            
            formDataToSubmit[field] = formatToYYYYMMDD(formDataToSubmit[field]);
            console.log(`Formatted ${field}:`, formDataToSubmit[field]);
          } catch (err) {
            console.error(`Error formatting date for ${field}:`, err);
            throw new Error(`Invalid date for ${field}. Please correct the date format.`);
          }
        }
      });
      
      // Ensure numeric fields are properly formatted
      formDataToSubmit.scheduler_hour = parseInt(formDataToSubmit.scheduler_hour, 10) || 9;
      
      // Validate scheduler minute value (must be between 0-59)
      const minuteValue = parseInt(formDataToSubmit.scheduler_minute_value, 10);
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
      
      // Remove the internal field before submission
      delete formDataToSubmit.scheduler_minute_value;
      
      console.log('Submitting data to API:', formDataToSubmit);
      
      // Use API service to update settings
      if (settings && settings.id) {
        await api.settings.updateSettings(token, settings.id, formDataToSubmit);
      } else {
        // If we don't have an ID, we might need to create new settings
        // This depends on your backend implementation
        throw new Error('Cannot update settings: No settings ID found');
      }
      
      setSuccessMessage('Settings saved successfully.');
      
      // Set a timeout to clear the success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      
      // Immediately fetch updated settings to ensure UI reflects current state
      await fetchSettings();
      
    } catch (error) {
      console.error('Error saving settings:', error);
      setError(error.message || 'An error occurred while saving settings');
    } finally {
      setLoading(false);
    }
  };

  // Add a useEffect to monitor formData changes
  useEffect(() => {
    console.log('Updated form data:', formData);
  }, [formData]);

  // Add handlers for keyboard input to restrict to valid values only
  const handleMinuteKeyPress = (e) => {
    // Allow only numbers 0-9 and control keys
    const char = String.fromCharCode(e.which);
    if (!/^\d+$/.test(char)) {
      e.preventDefault();
      return false;
    }
    
    // Get the resulting input if this keystroke is allowed
    const currentValue = e.target.value;
    const selectionStart = e.target.selectionStart;
    const selectionEnd = e.target.selectionEnd;
    
    // Calculate what the new value would be
    const newValue = currentValue.substring(0, selectionStart) + char + currentValue.substring(selectionEnd);
    
    // Check if the new value would be in the valid range (0-59)
    const numValue = parseInt(newValue, 10);
    
    // If it results in a value > 59, prevent the input
    if (numValue > 59) {
      e.preventDefault();
      return false;
    }
  };

  // Add another useEffect to refresh the current date when the component is in focus
  useEffect(() => {
    // Update today's date whenever the component is active
    updateTodayDate();
    
    // Set up an event listener for when the window gets focus
    const handleFocus = () => {
      console.log('Window focused, updating today\'s date');
      updateTodayDate();
    };
    
    // Add the event listener
    window.addEventListener('focus', handleFocus);
    
    // Clean up the event listener
    return () => window.removeEventListener('focus', handleFocus);
  }, [settings]);  // Re-run when settings change

  if (loading) {
    return (
      <div className="container-fluid px-4">
        <LoadingSpinner message="Loading reminder settings..." />
      </div>
    );
  }
  
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
              
              <ReminderToggles 
                settings={settings} 
                onSettingsUpdated={fetchSettings} 
              />
              
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
                <Card.Body>
                  <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                      <Form.Label>Current Month</Form.Label>
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
                        The month that you're currently tracking documents for. This is used in reminder messages.
                      </Form.Text>
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>Today's Date</Form.Label>
                      <Form.Control
                        type="text"
                        name="today_date_display"
                        value={formData.today_date ? formatDateForDisplay(formData.today_date) : formatDateForDisplay(getTodayDate())}
                        readOnly
                        className="form-control"
                        style={{ backgroundColor: '#f8f9fa' }}
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
                        
                        <SetTDSReminderDates 
                          tdsDueDate={formData.tds_due_date}
                          onSetDates={handleSetTDSReminderDates}
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

                    <Form.Group className="mb-3">
                      <Form.Label>Scheduler Time</Form.Label>
                      <Row>
                        <Col sm={4}>
                          <Form.Label>Hour</Form.Label>
                          <Form.Control 
                            type="text" 
                            name="scheduler_hour" 
                            value={formData.scheduler_hour} 
                            onChange={handleInputChange}
                            onBlur={handleHourBlur}
                            placeholder="1-12"
                            maxLength={2}
                            pattern="[1-9]|1[0-2]"
                          />
                          <Form.Text className="text-muted">
                            Enter a value between 1-12
                          </Form.Text>
                        </Col>
                        <Col sm={4}>
                          <Form.Label>Minute</Form.Label>
                          <Form.Control 
                            type="text" 
                            name="scheduler_minute" 
                            value={formData.scheduler_minute} 
                            onChange={handleInputChange}
                            onBlur={handleMinuteBlur}
                            onKeyPress={handleMinuteKeyPress}
                            placeholder="00-59"
                            maxLength={2}
                            pattern="[0-5]?[0-9]"
                          />
                          <Form.Text className="text-muted">
                            Enter a value between 0-59
                          </Form.Text>
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
                    
                    <Button variant="primary" type="submit" disabled={loading}>
                      {loading ? (
                        <>
                          <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                          Saving...
                        </>
                      ) : 'Save Settings'}
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