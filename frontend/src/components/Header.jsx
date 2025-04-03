import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { selectToken, logout } from '../redux/authSlice';

export default function Header() {
  const token = useSelector(selectToken);
  const dispatch = useDispatch();
  
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path ? "active" : "";
  };

  return (
    <Navbar 
      bg="dark" 
      variant="dark" 
      expand="lg" 
      fixed="top" 
      className="navbar py-1"
    >
      <Container fluid>
        <Link className="navbar-brand" to="/">
          HPFP
        </Link>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          {token && (
            <Nav className="me-auto">
              <Link className={`nav-link ${isActive('/')}`} to="/">Dashboard</Link>
              <Link className={`nav-link ${isActive('/clients')}`} to="/clients">Clients</Link>
              <Link className={`nav-link ${isActive('/status')}`} to="/status">Document Status</Link>
              <Link className={`nav-link ${isActive('/settings')}`} to="/settings">Reminder Settings</Link>
              <Link className={`nav-link ${isActive('/logs')}`} to="/logs">Communication Logs</Link>
              <Link className={`nav-link ${isActive('/reports')}`} to="/reports">Reports</Link>
              <Link className={`nav-link ${isActive('/users')}`} to="/users">User Management</Link>
            </Nav>
          )}
          {token && (
            <Button variant="outline-light" size="sm" onClick={handleLogout}>Logout</Button>
          )}
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
