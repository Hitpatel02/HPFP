const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const db = require("../config/db");

/**
 * @desc    Authenticate admin user & get token
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Please provide email and password' });
        }
        
        // Check if user exists
        const user = await db.query(
            `SELECT * FROM "user".admin_users WHERE email = $1`, 
            [email]
        );
        
        if (user.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Verify password with bcrypt
        let validPassword = false;
        
        if (user.rows[0].password_hash.startsWith('$2')) {
            // If password is already hashed with bcrypt
            validPassword = await bcrypt.compare(password, user.rows[0].password_hash);
        } else {
            // For existing passwords not hashed with bcrypt (legacy)
            validPassword = password === user.rows[0].password_hash;
            
            // Update the password to use bcrypt for next time
            if (validPassword) {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);
                
                await db.query(
                    `UPDATE "user".admin_users SET password_hash = $1 WHERE id = $2`,
                    [hashedPassword, user.rows[0].id]
                );
            }
        }
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Update last_login timestamp
        await db.query(
            `UPDATE "user".admin_users SET last_login = NOW() WHERE id = $1`,
            [user.rows[0].id]
        );
        
        // Generate JWT token with expiration time
        const token = jwt.sign(
            { id: user.rows[0].id }, 
            process.env.JWT_SECRET, 
            { expiresIn: '8h' }
        );
        
        // Return user info without sensitive data
        res.json({ 
            token,
            user: {
                id: user.rows[0].id,
                username: user.rows[0].username,
                email: user.rows[0].email
            }
        });
    } catch (error) {
        console.error('Error in login route:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * @desc    Get all admin users
 */
exports.getUsers = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, username, email, created_at, last_login
             FROM "user".admin_users
             ORDER BY username`
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * @desc    Delete an admin user
 */
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if it's the only user
        const userCountResult = await db.query(
            `SELECT COUNT(*) FROM "user".admin_users`
        );
        
        const userCount = parseInt(userCountResult.rows[0].count);
        
        if (userCount <= 1) {
            return res.status(400).json({ 
                error: 'Cannot delete the only admin user. Create another admin user first.' 
            });
        }
        
        // Check if user is deleting themselves
        if (req.user.id.toString() === id) {
            return res.status(400).json({ 
                error: 'You cannot delete your own account while logged in.' 
            });
        }
        
        const result = await db.query(
            `DELETE FROM "user".admin_users WHERE id = $1 RETURNING id`,
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * @desc    Create a new admin user
 */
exports.createUser = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Validate input
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }
        
        // Check if username already exists
        const existingUser = await db.query(
            `SELECT username FROM "user".admin_users WHERE username = $1`,
            [username]
        );
        
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        
        // Check if email already exists
        const existingEmail = await db.query(
            `SELECT email FROM "user".admin_users WHERE email = $1`,
            [email]
        );
        
        if (existingEmail.rows.length > 0) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        
        // Hash password with bcrypt
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Create user with serial ID (don't specify ID to let the database auto-increment)
        const result = await db.query(
            `INSERT INTO "user".admin_users (username, email, password_hash, created_at)
             VALUES ($1, $2, $3, NOW())
             RETURNING id, username, email, created_at`,
            [username, email, hashedPassword]
        );
        
        res.status(201).json({
            message: 'User created successfully',
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * @desc    Update an admin user
 */
exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, password } = req.body;
        
        // Validate input
        if (!username || !email) {
            return res.status(400).json({ error: 'Username and email are required' });
        }
        
        // Check if username already exists for other users
        const existingUser = await db.query(
            `SELECT username FROM "user".admin_users WHERE username = $1 AND id != $2`,
            [username, id]
        );
        
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        
        // Check if email already exists for other users
        const existingEmail = await db.query(
            `SELECT email FROM "user".admin_users WHERE email = $1 AND id != $2`,
            [email, id]
        );
        
        if (existingEmail.rows.length > 0) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        
        let result;
        
        // Update user with or without password
        if (password) {
            // Hash the new password with bcrypt
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            
            // Update with hashed password
            result = await db.query(
                `UPDATE "user".admin_users 
                 SET username = $1, email = $2, password_hash = $3
                 WHERE id = $4
                 RETURNING id, username, email, created_at`,
                [username, email, hashedPassword, id]
            );
        } else {
            // Update without changing password
            result = await db.query(
                `UPDATE "user".admin_users 
                 SET username = $1, email = $2
                 WHERE id = $3
                 RETURNING id, username, email, created_at`,
                [username, email, id]
            );
        }
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({
            message: 'User updated successfully',
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * @desc    Change user's own password
 */
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        // Validate input
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ 
                error: 'Current password and new password are required' 
            });
        }
        
        if (currentPassword === newPassword) {
            return res.status(400).json({ 
                error: 'New password must be different from current password' 
            });
        }
        
        // Get user data with password
        const user = await db.query(
            `SELECT id, password_hash FROM "user".admin_users WHERE id = $1`,
            [req.user.id]
        );
        
        if (user.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Verify current password
        const isMatch = await bcrypt.compare(
            currentPassword, 
            user.rows[0].password_hash
        );
        
        if (!isMatch) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }
        
        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        
        // Update password
        await db.query(
            `UPDATE "user".admin_users SET password_hash = $1 WHERE id = $2`,
            [hashedPassword, req.user.id]
        );
        
        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * @desc    Verify user token and return user information
 */
exports.verifyToken = async (req, res) => {
    try {
        // Get user data from database to ensure it's up-to-date
        const user = await db.query(
            `SELECT id, username, email, created_at, last_login
             FROM "user".admin_users 
             WHERE id = $1`,
            [req.user.id]
        );
        
        if (user.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Return user info without sensitive data
        res.json({
            success: true,
            user: {
                id: user.rows[0].id,
                username: user.rows[0].username,
                email: user.rows[0].email,
            }
        });
    } catch (error) {
        console.error('Error in verify-auth route:', error);
        res.status(500).json({ error: 'Server error' });
    }
}; 