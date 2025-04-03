import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Container, Row, Col, Card, Button, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { selectToken, setInitialDataLoaded } from '../redux/authSlice';
import LoadingSpinner from './common/LoadingSpinner';
import { clientsAPI, documentsAPI, settingsAPI } from '../api';

export default function Dashboard() {
  const token = useSelector(selectToken);
  const dispatch = useDispatch();
  
  const [stats, setStats] = useState({
    totalClients: 0,
    pendingDocuments: 0,
    upcomingReminders: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;
    
    // Fetch dashboard statistics
    const fetchStats = async () => {
      try {
        setLoading(true);
        console.log('Dashboard: Fetching statistics...');
        
        // Fetch clients
        try {
          const clientsData = await clientsAPI.getAll(token);
          console.log('Dashboard: Clients data fetched successfully', clientsData);
          setStats(prev => ({ ...prev, clientCount: clientsData.length || 0 }));
        } catch (error) {
          console.error('Failed to fetch clients:', error);
        }
        
        // Fetch pending documents
        try {
          const pendingDocuments = await documentsAPI.getPending(token);
          console.log('Dashboard: Pending documents fetched successfully', pendingDocuments);
          setStats(prev => ({ 
            ...prev, 
            pendingCount: pendingDocuments.length || 0,
            pendingDocuments: pendingDocuments || []
          }));
        } catch (error) {
          console.error('Failed to fetch pending documents:', error);
        }
        
        // Fetch reminder settings
        try {
          const reminderSettings = await settingsAPI.getReminders(token);
          console.log('Dashboard: Reminder settings fetched successfully', reminderSettings);
          setStats(prev => ({ ...prev, reminderSettings: reminderSettings || {} }));
        } catch (error) {
          console.error('Failed to fetch reminder settings:', error);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError(error.message);
        setLoading(false);
      }
    };
    
    fetchStats();
  }, [token, dispatch]);

  if (loading) {
    return (
      <Container fluid className="px-4 pt-3">
        <LoadingSpinner message="Loading dashboard data..." />
      </Container>
    );
  }

  if (error) {
    return (
      <Container fluid className="px-4 pt-3">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Error Loading Dashboard</h4>
          <p>{error}</p>
          <hr />
          <p className="mb-0">Please try refreshing the page or contact support if the issue persists.</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="px-4 pt-3">
      <h1 className="mb-4 mt-2">Dashboard</h1>
      
      <Row className="mb-4">
        <Col md={4}>
          <Card className="text-center h-100">
            <Card.Body>
              <Card.Title>Total Clients</Card.Title>
              <Card.Text className="display-4">{stats.clientCount || 0}</Card.Text>
              <Button as={Link} to="/clients" variant="primary">View Clients</Button>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4}>
          <Card className="text-center h-100">
            <Card.Body>
              <Card.Title>Pending Documents</Card.Title>
              <Card.Text className="display-4">{stats.pendingCount || 0}</Card.Text>
              <Button as={Link} to="/status" variant="warning">Check Status</Button>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4}>
          <Card className="text-center h-100">
            <Card.Body>
              <Card.Title>Reminder Settings</Card.Title>
              <Card.Text>Configure reminder dates and preview emails</Card.Text>
              <Button as={Link} to="/settings" variant="info">Manage Settings</Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row>
        <Col md={6}>
          <Card>
            <Card.Header>Quick Actions</Card.Header>
            <Card.Body>
              <div className="d-grid gap-2">
                <Button as={Link} to="/clients" variant="outline-primary">Manage Clients</Button>
                <Button as={Link} to="/settings" variant="outline-primary">Configure Reminders</Button>
                <Button as={Link} to="/reports" variant="outline-primary">Generate Reports</Button>
                <Button as={Link} to="/users" variant="outline-primary">User Management</Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6}>
          <Card>
            <Card.Header>System Information</Card.Header>
            <Card.Body>
              <p>Welcome to the HPFP Management System.</p>
              <p>This system helps you track GST document submissions and send automated reminders to clients.</p>
              <p>Use the navigation menu to access different features of the system.</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
