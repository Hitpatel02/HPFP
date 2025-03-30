import React from 'react';
import { Button, Form } from 'react-bootstrap';
import { format, sub, isBefore, parseISO } from 'date-fns';

const SetTDSReminderDates = ({ tdsDueDate, onSetDates }) => {
  const calculateReminderDates = () => {
    if (!tdsDueDate) {
      alert('Please set a TDS due date first');
      return;
    }

    try {
      // Parse the due date from string to Date object
      const dueDate = parseISO(tdsDueDate);
      
      // Reminder 1: 5 days before due date
      const reminder1 = sub(dueDate, { days: 5 });
      
      // Reminder 2: 2 days before due date
      const reminder2 = sub(dueDate, { days: 2 });

      // Format dates for output
      const formattedReminder1 = format(reminder1, 'yyyy-MM-dd');
      const formattedReminder2 = format(reminder2, 'yyyy-MM-dd');

      // Call the passed callback with the calculated dates
      onSetDates({
        reminder1: formattedReminder1,
        reminder2: formattedReminder2
      });
    } catch (error) {
      console.error('Error calculating reminder dates:', error);
      alert('Error calculating reminder dates. Please ensure the TDS due date is valid.');
    }
  };

  return (
    <Form.Group className="mb-3">
      <Button 
        variant="outline-secondary" 
        size="sm"
        onClick={calculateReminderDates}
        className="mb-2"
      >
        Auto-Set TDS Reminder Dates
      </Button>
      <Form.Text className="text-muted d-block">
        Automatically set reminder dates to 5 days and 2 days before the TDS due date.
      </Form.Text>
    </Form.Group>
  );
};

export default SetTDSReminderDates; 