const jwt = require('jsonwebtoken');
require('dotenv').config();

const SECRET_KEY = process.env.JWT_SECRET;

/**
 * Middleware to verify and authenticate JWT tokens
 * Based on the LearningManagementSystem implementation
 */
function authenticateToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: "Access denied. No token provided." });
        }

        const token = authHeader.split(" ")[1];
        if (!token) {
            return res.status(401).json({ error: "Access denied. Invalid token format." });
        }

        const decoded = jwt.verify(token, SECRET_KEY);
        
        // Check if token contains the necessary user data
        if (!decoded.id) {
            return res.status(401).json({ error: "Access denied. Invalid token content." });
        }
        
        // Set user info in request object for route handlers
        req.user = { id: decoded.id };
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(401).json({ error: "Invalid token." });
    }
}

module.exports = { authenticateToken }; 