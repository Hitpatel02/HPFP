import React, { useState, useEffect } from 'react';
import { Card, Form, Row, Col, Button, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { settingsAPI } from '../services/api';

const ReminderToggles = ({ settings, onSettingsUpdated }) => {
  const [reminderSettings, setReminderSettings] = useState({
    enable_whatsapp_reminders: true,
    enable_email_reminders: true
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setReminderSettings({
        enable_whatsapp_reminders: settings.enable_whatsapp_reminders ?? true,
        enable_email_reminders: settings.enable_email_reminders ?? true
      });
    }
  }, [settings]);

  const handleToggleChange = (field) => {
    setReminderSettings(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleSave = async () => {
    if (!settings || !settings.id) {
      toast.error('No settings found to update');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await settingsAPI.updateSettings(token, settings.id, {
        enable_whatsapp_reminders: reminderSettings.enable_whatsapp_reminders,
        enable_email_reminders: reminderSettings.enable_email_reminders
      });
      
      toast.success('Reminder settings updated successfully');
      
      // Call the callback to refresh settings in parent component
      if (onSettingsUpdated) {
        onSettingsUpdated();
      }
    } catch (error) {
      console.error('Error updating reminder settings:', error);
      toast.error('Failed to update reminder settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mb-4">
      <Card.Header>
        <h5>Reminder Channel Settings</h5>
      </Card.Header>
      <Card.Body>
        <p className="text-muted mb-4">
          Enable or disable reminder channels. When disabled, reminders will not be sent through that channel
          regardless of the schedule.
        </p>

        <Row className="mb-3">
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Check
                type="switch"
                id="whatsapp-toggle"
                label="Enable WhatsApp Reminders"
                checked={reminderSettings.enable_whatsapp_reminders}
                onChange={() => handleToggleChange('enable_whatsapp_reminders')}
                disabled={loading || saving}
              />
              <Form.Text className="text-muted">
                {reminderSettings.enable_whatsapp_reminders 
                  ? "WhatsApp reminders are enabled. Reminders will be sent according to schedule." 
                  : "WhatsApp reminders are disabled. No reminders will be sent via WhatsApp."}
              </Form.Text>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Check
                type="switch"
                id="email-toggle"
                label="Enable Email Reminders"
                checked={reminderSettings.enable_email_reminders}
                onChange={() => handleToggleChange('enable_email_reminders')}
                disabled={loading || saving}
              />
              <Form.Text className="text-muted">
                {reminderSettings.enable_email_reminders 
                  ? "Email reminders are enabled. Reminders will be sent according to schedule." 
                  : "Email reminders are disabled. No reminders will be sent via email."}
              </Form.Text>
            </Form.Group>
          </Col>
        </Row>

        <div className="d-flex justify-content-end">
          <Button 
            variant="primary" 
            onClick={handleSave}
            disabled={loading || saving}
          >
            {saving ? <><Spinner as="span" animation="border" size="sm" /> Saving...</> : 'Save Changes'}
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

export default ReminderToggles; 