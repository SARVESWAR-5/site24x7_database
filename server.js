const express = require('express');
const axios = require('axios');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const PORT = 3004;

// Enable CORS
app.use(cors());

// MySQL Connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root', // Change to your MySQL user
    password: '12345', // Change to your MySQL password
    database: 'api_data' // Make sure this database exists
});

db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err.stack);
        return;
    }
    console.log('Connected to MySQL database');
});

// Fetch data from external API and store it in MySQL
app.get('/api/fetchData', async (req, res) => {
    try {
        // Fetch data from the external API
        const response = await axios.get('https://www.site24x7.com/app/api/short/current_status', {
            headers: {
                'Authorization': 'Zoho-oauthtoken 1000.bfdb0b043d429c827c5da02e827deb26.7f293d94825979346a43ef3d5eaca3e0',
                'Content-Type': 'application/json',
            }
        });

        // Log the full response to inspect the structure
        console.log('API Response:', response.data);

        if (response.data && response.data.data && response.data.data.monitors) {
            const monitors = response.data.data.monitors;

            // Insert or update the database for each monitor
            monitors.forEach(monitor => {
                const query = `
                    INSERT INTO monitors (monitor_id, name, monitor_type, status) 
                    VALUES (?, ?, ?, ?) 
                    ON DUPLICATE KEY UPDATE 
                    name = VALUES(name), 
                    monitor_type = VALUES(monitor_type), 
                    status = VALUES(status), 
                    fetched_at = CURRENT_TIMESTAMP
                `;

                db.query(query, [monitor.monitor_id, monitor.name, monitor.monitor_type, monitor.status], (err, result) => {
                    if (err) {
                        console.error('Error inserting data:', err);
                    } else {
                        console.log(`Monitor ${monitor.monitor_id} inserted or updated successfully`);
                    }
                });
            });

            res.json({ message: 'Data stored successfully' });
        } else {
            res.status(500).send({ message: 'Invalid response structure from external API.' });
        }
    } catch (error) {
        console.error('Error fetching data:', error.message);
        res.status(500).send({ message: 'Error fetching data from external API', error: error.message });
    }
});

// Retrieve stored data from MySQL
app.get('/api/getData', (req, res) => {
    const query = "SELECT * FROM monitors";
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching data from database:', err);
            res.status(500).send({ message: 'Error fetching data from database', error: err });
        } else {
            res.json({ data: results });
        }
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
