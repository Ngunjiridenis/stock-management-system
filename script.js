async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('token');
    if (token) {
        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        };
    }
    return fetch(url, options);
}

// Load products from the server
async function loadProducts() {
    const response = await fetchWithAuth('/api/products');
    const products = await response.json();
    const productList = document.getElementById('product-list');
    productList.innerHTML = ''; // Clear existing products

    products.forEach(product => {
        const li = document.createElement('li');
        li.textContent = `${product.product_name} (SKU: ${product.sku}) - Location: ${product.location}, Quantity: ${product.quantity_in_stock}, Price: $${product.price_per_unit}`;
        productList.appendChild(li);
    });
}

// Process order functionality
document.getElementById('order-form').onsubmit = async function(event) {
    event.preventDefault();
    const sku = document.getElementById('order-sku').value;
    const quantity = document.getElementById('order-quantity').value;

    const response = await fetchWithAuth('/api/orders', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sku, quantity })
    });

    const orderStatusDiv = document.getElementById('order-status');
    if (response.ok) {
        orderStatusDiv.textContent = 'Order processed successfully!';
        loadProducts(); // Refresh product list
    } else {
        orderStatusDiv.textContent = 'Failed to process order.';
    }
};

// Generate inventory report
async function generateInventoryReport() {
    const response = await fetchWithAuth('/api/reports/inventory');
    const reportData = await response.json();
    const reportDiv = document.getElementById('inventory-report');
    reportDiv.innerHTML = `<pre>${JSON.stringify(reportData, null, 2)}</pre>`;
}

// Load products when the page loads
window.onload = loadProducts;
