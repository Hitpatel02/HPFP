const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const authQueries = require("../queries/authQueries");

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
        const user = await authQueries.getUserByEmail(email);
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Verify password with bcrypt
        let validPassword = false;
        
        if (user.password_hash.startsWith('$2')) {
            // If password is already hashed with bcrypt
            validPassword = await bcrypt.compare(password, user.password_hash);
        } else {
            // For existing passwords not hashed with bcrypt (legacy)
            validPassword = password === user.password_hash;
            
            // Update the password to use bcrypt for next time
            if (validPassword) {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);
                
                await authQueries.updateUserPassword(user.id, hashedPassword);
            }
        }
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Update last_login timestamp
        await authQueries.updateLastLogin(user.id);
        
        // Generate JWT token with expiration time
        const token = jwt.sign(
            { id: user.id }, 
            process.env.JWT_SECRET, 
            { expiresIn: '8h' }
        );
        
        // Return user info without sensitive data
        res.json({ 
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
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
        const users = await authQueries.getAllUsers();
        res.json(users);
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
        const userCount = await authQueries.getUserCount();
        
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
        
        const deleted = await authQueries.deleteUser(id);
        
        if (!deleted) {
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
        const usernameAlreadyExists = await authQueries.usernameExists(username);
        
        if (usernameAlreadyExists) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        
        // Check if email already exists
        const emailAlreadyExists = await authQueries.emailExists(email);
        
        if (emailAlreadyExists) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        
        // Hash password with bcrypt
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Create user
        const newUser = await authQueries.createUser({
            username,
            email,
            hashedPassword
        });
        
        res.status(201).json({
            message: 'User created successfully',
            user: newUser
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
        const { username, email } = req.body;
        
        // Validate input
        if (!username || !email) {
            return res.status(400).json({ error: 'Username and email are required' });
        }
        
        // Check if user exists
        const existingUser = await authQueries.getUserById(id);
        
        if (!existingUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Check if username already exists for another user
        if (username !== existingUser.username) {
            const usernameExists = await authQueries.usernameExists(username);
            
            if (usernameExists) {
                return res.status(400).json({ error: 'Username already exists' });
            }
        }
        
        // Check if email already exists for another user
        if (email !== existingUser.email) {
            const emailExists = await authQueries.emailExists(email);
            
            if (emailExists) {
                return res.status(400).json({ error: 'Email already exists' });
            }
        }
        
        // Update user
        const updatedUser = await authQueries.updateUser(id, { username, email });
        
        res.json({
            message: 'User updated successfully',
            user: updatedUser
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * @desc    Change password
 */
exports.changePassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { currentPassword, newPassword } = req.body;
        
        // Validate input
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }
        
        // Only allow users to change their own password unless admin
        if (req.user.id.toString() !== id && !req.user.isAdmin) {
            return res.status(403).json({ error: 'Not authorized to change this user\'s password' });
        }
        
        // Get current user data
        const user = await authQueries.getUserById(id);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        
        if (!isMatch) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        
        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        
        // Update password
        await authQueries.changePassword(id, hashedPassword);
        
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
        const user = await authQueries.getUserById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Return user info without sensitive data
        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
            }
        });
    } catch (error) {
        console.error('Error in verify-auth route:', error);
        res.status(500).json({ error: 'Server error' });
    }
}; 