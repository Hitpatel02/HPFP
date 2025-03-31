import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Form, Button, Container, Card, Alert } from 'react-bootstrap';
import { 
  loginUser,
  selectToken, 
  selectLastPath,
  selectIsLoading,
  selectError
} from '../redux/authSlice';

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const token = useSelector(selectToken);
  const lastPath = useSelector(selectLastPath);
  const loading = useSelector(selectIsLoading);
  const error = useSelector(selectError);
  const dispatch = useDispatch();
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // If already logged in, redirect to dashboard or lastPath
  useEffect(() => {
    if (token) {
      console.log('Login: Already logged in, redirecting to', lastPath);
      navigate(lastPath);
    }
  }, [token, navigate, lastPath]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      console.log('Login: Attempting login...');
      
      // Dispatch login action
      await dispatch(loginUser({ email, password })).unwrap();
      
      console.log('Login: Login successful, redirecting');
      // The App component will handle the redirect based on lastPath
    } catch (err) {
      console.error('Login failed:', err);
      // Error handling is managed by the Redux slice
    }
  };

  return (
    <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: 'calc(100vh - 80px)', paddingTop: '80px' }}>
      <Card style={{ width: '400px', marginTop: '20px' }}>
        <Card.Body>
          <Card.Title className="text-center mb-4">Login to HPFP</Card.Title>
          
          {error && <Alert variant="danger">{error}</Alert>}
          
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control 
                type="email" 
                placeholder="Enter email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control 
                type="password" 
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Form.Group>
            
            <Button 
              variant="primary" 
              type="submit" 
              className="w-100"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Login;
