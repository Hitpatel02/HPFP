import React, { useState, useEffect } from 'react';
import { Container, Alert, Card } from 'react-bootstrap';

export default function ReminderPage({ token }) {
  const [message, setMessage] = useState('');

  useEffect(() => {
    setMessage('This is the legacy reminder system. We are transitioning to the new client-based system. Please use the Clients and Settings pages for the new functionality.');
  }, []);

  return (
    <Container className="mt-4">
      <h1 className="mb-4">Legacy Reminders</h1>
      
      <Alert variant="warning">
        <Alert.Heading>Legacy System</Alert.Heading>
        <p>
          This page represents the legacy reminder system. We are in the process of transitioning to the new client-based system.
        </p>
        <hr />
        <p className="mb-0">
          Please use the Clients and Settings pages for the new functionality.
        </p>
      </Alert>
      
      <Card className="mt-4">
        <Card.Body>
          <Card.Title>Migration in Progress</Card.Title>
          <Card.Text>
            We are migrating from the old reminder system to the new one. The new system offers:
          </Card.Text>
          <ul>
            <li>Better client management with multiple email addresses</li>
            <li>Document tracking by month</li>
            <li>More detailed reminder settings</li>
            <li>Improved email templates</li>
          </ul>
        </Card.Body>
      </Card>
    </Container>
  );
}
