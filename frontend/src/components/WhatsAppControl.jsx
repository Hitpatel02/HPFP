import React, { useState, useEffect } from 'react';
import { Card, Button, Form, InputGroup, Alert, Badge, Row, Col, ProgressBar } from 'react-bootstrap';
import { whatsAppAPI } from '../api';
import { toast } from 'react-toastify';

const WhatsAppControl = () => {
  const [status, setStatus] = useState({
    isReady: false,
    groupIdRetrievalMode: false,
    maxRetryAttemptsReached: false,
    connectionInfo: {
      connectionAttempts: 0,
      maxConnectionAttempts: 3,
      isInitializing: false
    },
    timestamp: null,
    loading: true
  });
  
  const [groupId, setGroupId] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  // Fetch WhatsApp status on component mount and every 10 seconds
  useEffect(() => {
    fetchStatus();
    
    const interval = setInterval(fetchStatus, 10000); // More frequent updates to show connection progress
    
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      setError(null);
      const response = await whatsAppAPI.getWhatsAppStatus();
      
      if (response.success) {
        setStatus({
          ...response.data,
          loading: false
        });
      } else {
        setStatus(prev => ({ ...prev, loading: false }));
        setError('Failed to fetch WhatsApp status');
        // Don't show toast for status fetching as it can be spammy
      }
    } catch (err) {
      console.error('WhatsApp status error:', err);
      setStatus(prev => ({ ...prev, loading: false }));
      setError('Failed to communicate with WhatsApp service');
    }
  };

  const handleStartGroupIdRetrieval = async () => {
    setProcessing(true);
    setError(null);
    
    try {
      const response = await whatsAppAPI.startWhatsAppGroupIdRetrieval();
      
      if (response.success) {
        toast.success('WhatsApp group ID retrieval mode started');
        fetchStatus();
      } else {
        setError(response.error || 'Failed to start WhatsApp group ID retrieval');
        toast.error(response.error || 'Failed to start WhatsApp group ID retrieval');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      toast.error('An unexpected error occurred');
    } finally {
      setProcessing(false);
    }
  };

  const handleStopGroupIdRetrieval = async () => {
    setProcessing(true);
    setError(null);
    
    try {
      const response = await whatsAppAPI.stopWhatsAppGroupIdRetrieval();
      
      if (response.success) {
        toast.success('WhatsApp group ID retrieval mode stopped');
        fetchStatus();
      } else {
        setError(response.error || 'Failed to stop WhatsApp group ID retrieval');
        toast.error(response.error || 'Failed to stop WhatsApp group ID retrieval');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      toast.error('An unexpected error occurred');
    } finally {
      setProcessing(false);
    }
  };

  const handleForceReconnect = async () => {
    setProcessing(true);
    setError(null);
    
    try {
      const response = await whatsAppAPI.forceWhatsAppReconnect();
      
      if (response.success) {
        toast.success('WhatsApp reconnection initiated. Please wait...');
        fetchStatus();
      } else {
        setError(response.error || 'Failed to force WhatsApp reconnection');
        toast.error(response.error || 'Failed to force WhatsApp reconnection');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      toast.error('An unexpected error occurred');
    } finally {
      setProcessing(false);
    }
  };

  const handleSendTestMessage = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!groupId) {
      setError('Please enter a group ID');
      toast.error('Please enter a group ID');
      return;
    }
    
    setProcessing(true);
    
    try {
      const response = await whatsAppAPI.sendWhatsAppTestMessage(groupId);
      
      if (response.success) {
        toast.success('Test message sent successfully');
      } else {
        setError(response.error || 'Failed to send WhatsApp test message');
        toast.error(response.error || 'Failed to send WhatsApp test message');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      toast.error('An unexpected error occurred');
    } finally {
      setProcessing(false);
    }
  };

  const renderStatusBadge = () => {
    if (status.loading) {
      return <Badge bg="secondary">Loading...</Badge>;
    }
    
    if (status.isReady) {
      return <Badge bg="success">Connected</Badge>;
    }
    
    if (status.connectionInfo && status.connectionInfo.isInitializing) {
      return <Badge bg="warning">Connecting...</Badge>;
    }
    
    if (status.maxRetryAttemptsReached) {
      return <Badge bg="danger">Connection Failed</Badge>;
    }
    
    return <Badge bg="danger">Disconnected</Badge>;
  };

  const renderConnectionProgress = () => {
    if (!status.connectionInfo) return null;
    
    const { connectionAttempts, maxConnectionAttempts, isInitializing } = status.connectionInfo;
    const progress = (connectionAttempts / maxConnectionAttempts) * 100;
    
    if (status.isReady) {
      return <ProgressBar variant="success" now={100} label="Connected" />;
    }
    
    if (isInitializing) {
      return (
        <div>
          <ProgressBar 
            now={progress} 
            label={`Attempt ${connectionAttempts}/${maxConnectionAttempts}`} 
            variant={connectionAttempts < maxConnectionAttempts ? "warning" : "danger"} 
          />
          <small className="text-muted mt-1 d-block">
            {connectionAttempts < maxConnectionAttempts 
              ? "Connection in progress..." 
              : "Maximum attempts reached. Try force reconnect."}
          </small>
        </div>
      );
    }
    
    return null;
  };

  return (
    <Card className="mb-4">
      <Card.Header>
        <h5>WhatsApp Configuration</h5>
      </Card.Header>
      <Card.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        
        <Row className="mb-4">
          <Col md={6}>
            <h6>WhatsApp Status: {renderStatusBadge()}</h6>
            {renderConnectionProgress()}
            
            {status.groupIdRetrievalMode && (
              <Alert variant="info" className="mt-2">
                <strong>Group ID Retrieval Mode is active!</strong>
                <p>Type <code>!groupid</code> in your WhatsApp group to retrieve the group ID.</p>
              </Alert>
            )}
            
            {status.maxRetryAttemptsReached && (
              <Alert variant="warning" className="mt-2">
                <strong>Connection issues detected!</strong>
                <p>The WhatsApp client has failed to connect after multiple attempts. Try using the Force Reconnect button.</p>
              </Alert>
            )}
          </Col>
          <Col md={6} className="text-end">
            <Button
              variant="success"
              className="me-2"
              onClick={handleStartGroupIdRetrieval}
              disabled={processing || status.isReady}
            >
              {processing ? 'Starting...' : 'Start WhatsApp Client'}
            </Button>
            <Button
              variant="danger"
              className="me-2"
              onClick={handleStopGroupIdRetrieval}
              disabled={processing || !status.isReady}
            >
              {processing ? 'Stopping...' : 'Stop WhatsApp Client'}
            </Button>
            <Button
              variant="warning"
              onClick={handleForceReconnect}
              disabled={processing}
            >
              {processing ? 'Reconnecting...' : 'Force Reconnect'}
            </Button>
          </Col>
        </Row>
        
        <Row>
          <Col md={12}>
            <Card bg="light">
              <Card.Body>
                <h6>Send Test Message</h6>
                <Form onSubmit={handleSendTestMessage}>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      placeholder="Enter WhatsApp Group ID"
                      value={groupId}
                      onChange={(e) => setGroupId(e.target.value)}
                      required
                    />
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={processing || !groupId || !status.isReady}
                    >
                      {processing ? 'Sending...' : 'Send Test Message'}
                    </Button>
                  </InputGroup>
                  <Form.Text className="text-muted">
                    The group ID should be in the format 123456789@g.us
                  </Form.Text>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
        
        <div className="mt-4">
          <h6>Instructions</h6>
          <ol className="text-muted">
            <li>Click the "Start WhatsApp Client" button to start the client.</li>
            <li>A QR code will appear on the server. You'll need to scan it with your phone.</li>
            <li>Type <code>!groupid</code> in your WhatsApp group to get the group ID.</li>
            <li>Use the group ID when setting up clients in the system.</li>
            <li>Click "Stop WhatsApp Client" when you're done to free up server resources.</li>
            <li>If connection fails after multiple attempts, use the "Force Reconnect" button.</li>
          </ol>
        </div>
        
        <div className="mt-3">
          <h6>Connection Troubleshooting</h6>
          <ul className="text-muted">
            <li>Make sure your phone has an active internet connection when scanning the QR code.</li>
            <li>Ensure WhatsApp is updated to the latest version on your phone.</li>
            <li>Try clearing your browser cache and cookies if connection issues persist.</li>
            <li>If you get QR code timeouts, try using the "Force Reconnect" feature.</li>
            <li>For persistent issues, try restarting the server application.</li>
          </ul>
        </div>
      </Card.Body>
    </Card>
  );
};

export default WhatsAppControl; 