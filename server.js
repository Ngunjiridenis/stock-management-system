const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(bodyParser.json());
app.use(express.static('public')); // Serve static files from the 'public' directory

const SECRET_KEY = 'your_secret_key'; // Change this to a secure key

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'stock_management'
});

// Create necessary tables
db.query(`
CREATE TABLE IF NOT EXISTS Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL
);
`, (err) => {
    if (err) throw err;
});

db.query(`
CREATE TABLE IF NOT EXISTS Products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    product_name VARCHAR(255) NOT NULL,
    sku VARCHAR(255) NOT NULL UNIQUE,
    location VARCHAR(255) NOT NULL,
    quantity_in_stock INT NOT NULL,
    price_per_unit DECIMAL(10, 2) NOT NULL
);
`, (err) => {
    if (err) throw err;
});

db.query(`
CREATE TABLE IF NOT EXISTS Orders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sku) REFERENCES Products(sku)
);
`, (err) => {
    if (err) throw err;
});

// Register a new admin user
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    db.query('INSERT INTO Users (username, password_hash) VALUES (?, ?)', [username, hashedPassword], (err) => {
        if (err) return res.status(500).send(err);
        res.status(201).send('User registered');
    });
});

// Login route
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    db.query('SELECT * FROM Users WHERE username = ?', [username], async (err, results) => {
        if (err) return res.status(500).send(err);
        if (results.length === 0) return res.status(401).send('Invalid credentials');

        const user = results[0];
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return res.status(401).send('Invalid credentials');

        const token = jwt.sign({ userId: user.user_id }, SECRET_KEY);
        res.json({ token });
    });
});

// Middleware to authenticate token
function authenticateToken(req, res, next) {
    const token = req.headers['authorization'] && req.headers['authorization'].split(' ')[1];
    if (!token) return res.sendStatus(401); // No token, unauthorized

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403); // Token invalid, forbidden
        req.user = user;
        next(); // Proceed to the next middleware or route handler
    });
}

// Endpoint to add a product
app.post('/api/products', authenticateToken, (req, res) => {
    const { product_name, sku, location, quantity_in_stock, price_per_unit } = req.body;
    const sql = 'INSERT INTO Products (product_name, sku, location, quantity_in_stock, price_per_unit) VALUES (?, ?, ?, ?, ?)';
    db.query(sql, [product_name, sku, location, quantity_in_stock, price_per_unit], (err) => {
        if (err) return res.status(500).send(err);
        res.status(201).send('Product added');
    });
});

// Endpoint to get all products
app.get('/api/products', authenticateToken, (req, res) => {
    db.query('SELECT * FROM Products', (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

// Process order
app.post('/api/orders', authenticateToken, (req, res) => {
    const { sku, quantity } = req.body;
    db.query('SELECT * FROM Products WHERE sku = ?', [sku], (err, results) => {
        if (err) return res.status(500).send(err);
        if (results.length === 0) return res.status(404).send('Product not found');

        const product = results[0];
        if (product.quantity_in_stock < quantity) {
            return res.status(400).send('Insufficient stock');
        }

        // Update stock level
        const newQuantity = product.quantity_in_stock - quantity;
        db.query('UPDATE Products SET quantity_in_stock = ? WHERE sku = ?', [newQuantity, sku], (err) => {
            if (err) return res.status(500).send(err);

            // Record the order
            db.query('INSERT INTO Orders (sku, quantity) VALUES (?, ?)', [sku, quantity], (err) => {
                if (err) return res.status(500).send(err);
                res.status(201).send('Order processed');
            });
        });
    });
});

// Generate inventory report
app.get('/api/reports/inventory', authenticateToken, (req, res) => {
    const sql = `
        SELECT 
            product_name,
            sku,
            location,
            quantity_in_stock,
            price_per_unit
        FROM Products
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

// Profit and Loss Calculation
app.get('/api/profit-loss', authenticateToken, (req, res) => {
    const sql = `
        SELECT 
            SUM(total_price) AS total_sales,
            SUM(cost_price) AS total_cost,
            (SUM(total_price) - SUM(cost_price)) AS profit_loss
        FROM Sales
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results[0]);
    });
});

// Weekly Analysis
app.get('/api/analysis/weekly', authenticateToken, (req, res) => {
    const sql = `
        SELECT 
            DATE(sale_date) AS sale_date,
            SUM(total_price) AS total_sales,
            SUM(cost_price) AS total_cost,
            (SUM(total_price) - SUM(cost_price)) AS profit_loss
        FROM Sales
        WHERE sale_date >= NOW() - INTERVAL 7 DAY
        GROUP BY DATE(sale_date)
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

// Monthly Analysis
app.get('/api/analysis/monthly', authenticateToken, (req, res) => {
    const sql = `
        SELECT 
            DATE_FORMAT(sale_date, '%Y-%m') AS sale_month,
            SUM(total_price) AS total_sales,
            SUM(cost_price) AS total_cost,
            (SUM(total_price) - SUM(cost_price)) AS profit_loss
        FROM Sales
        WHERE sale_date >= NOW() - INTERVAL 1 YEAR
        GROUP BY sale_month
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

// Yearly Analysis
app.get('/api/analysis/yearly', authenticateToken, (req, res) => {
    const sql = `
        SELECT 
            YEAR(sale_date) AS sale_year,
            SUM(total_price) AS total_sales,
            SUM(cost_price) AS total_cost,
            (SUM(total_price) - SUM(cost_price)) AS profit_loss
        FROM Sales
        GROUP BY sale_year
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

// Start the server
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
