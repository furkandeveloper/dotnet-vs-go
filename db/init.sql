CREATE TABLE IF NOT EXISTS products (
    id      VARCHAR(36)    PRIMARY KEY,
    name    VARCHAR(255)   NOT NULL,
    price   DECIMAL(10,2)  NOT NULL
);

INSERT INTO products (id, name, price) VALUES
    ('1',  'Laptop Pro',          1299.99),
    ('2',  'Wireless Mouse',        29.99),
    ('3',  'Mechanical Keyboard',   89.99),
    ('4',  'USB-C Hub',             49.99),
    ('5',  'Monitor 27"',          399.99),
    ('6',  'Webcam HD',             79.99),
    ('7',  'Desk Lamp LED',         34.99),
    ('8',  'Headphones',           149.99),
    ('9',  'External SSD 1TB',     109.99),
    ('10', 'Mouse Pad XL',          19.99)
ON CONFLICT DO NOTHING;
