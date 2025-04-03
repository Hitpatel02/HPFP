const db = require("../config/db");

/**
 * @desc    Get all groups with GST status
 */
exports.getGroups = async (req, res) => {
    try {
        const groups = await db.query(
            `SELECT 
                id, 
                name, 
                group_id,
                email,
                gst_1, 
                gst_2, 
                gst_3, 
                TO_CHAR(gst_1_date, 'YYYY-MM-DD') AS gst_1_date, 
                TO_CHAR(gst_2_date, 'YYYY-MM-DD') AS gst_2_date, 
                TO_CHAR(gst_3_date, 'YYYY-MM-DD') AS gst_3_date, 
                description 
            FROM "user".groups
            ORDER BY id`
        );

        res.json(groups.rows);
    } catch (error) {
        console.error("Error fetching groups:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

/**
 * @desc    Get a single group by ID
 */
exports.getGroupById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            `SELECT 
                id, 
                name, 
                group_id,
                email,
                gst_1, 
                gst_2, 
                gst_3, 
                TO_CHAR(gst_1_date, 'YYYY-MM-DD') AS gst_1_date, 
                TO_CHAR(gst_2_date, 'YYYY-MM-DD') AS gst_2_date, 
                TO_CHAR(gst_3_date, 'YYYY-MM-DD') AS gst_3_date, 
                description 
            FROM "user".groups
            WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Group not found" });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error fetching group:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

/**
 * @desc    Update group GST status and dates (partial update)
 */
exports.updateGroup = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        // Define valid fields that can be updated
        const validFields = ['gst_1', 'gst_2', 'gst_3', 'gst_1_date', 'gst_2_date', 'gst_3_date', 'description'];
        const updateFields = [];
        const values = [];
        
        let index = 1;
        Object.keys(updates).forEach(key => {
            if (validFields.includes(key)) {
                updateFields.push(`${key} = $${index}`);
                values.push(updates[key]);
                index++;
            }
        });
        
        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No valid updates provided' });
        }
        
        values.push(id); // Add id as the last parameter
        
        const query = `UPDATE "user".groups SET ${updateFields.join(', ')} WHERE id = $${index}`;
        await db.query(query, values);

        res.json({ message: "Group updated successfully" });
    } catch (error) {
        console.error("Error updating group:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

/**
 * @desc    Reset all groups' GST status
 */
exports.resetGroups = async (req, res) => {
    try {
        await db.query(
            `UPDATE "user".groups 
             SET gst_1 = FALSE, 
                 gst_2 = FALSE, 
                 gst_3 = FALSE,
                 gst_1_date = NULL, 
                 gst_2_date = NULL, 
                 gst_3_date = NULL`
        );
        
        res.json({ message: "All groups reset successfully" });
    } catch (error) {
        console.error("Error resetting groups:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}; 