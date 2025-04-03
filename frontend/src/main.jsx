import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router } from "react-router-dom";
import { Provider } from 'react-redux';
import store from './redux/store';
import App from "./App.jsx";
import "./css/App.css";
import "./css/styles.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "bootstrap/dist/css/bootstrap.min.css";

// Set browser locale to use DD/MM/YYYY format for date inputs
document.documentElement.lang = 'en-GB';

// Add event listener to ensure date inputs display properly
document.addEventListener('DOMContentLoaded', function() {
  // Force calendar inputs to use DD/MM/YYYY format
  const setDateInputFormat = () => {
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
      // Ensure the date input has the correct format
      if (input.value) {
        const dateParts = input.value.split('-');
        if (dateParts.length === 3) {
          // Set data attribute for CSS styling
          input.setAttribute('data-date', `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`);
        }
      }
    });
  };

  // Run initially and observe DOM changes
  setDateInputFormat();
  
  // Use MutationObserver to detect new date inputs
  const observer = new MutationObserver(() => {
    setDateInputFormat();
  });
  
  observer.observe(document.body, { 
    childList: true, 
    subtree: true 
  });
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <Router>
        <App />
      </Router>
    </Provider>
  </React.StrictMode>
);
