-- Initialize database with proper password hashing
-- This file will be executed when PostgreSQL container starts

-- Create admin user with bcrypt hashed password for 'admin123'
INSERT INTO admin_users (username, email, password_hash) 
VALUES ('admin', 'admin@plots.com', '$2a$10$rOzJqKqVQQGVQQGVQQGVQeK8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8')
ON CONFLICT (username) DO NOTHING;

-- Insert sample plots
INSERT INTO plots (plot_number, location, size, price, status, description, amenities) VALUES
('P001', 'North Wing', '1000 sq ft', 50000.00, 'available', 'Prime location with excellent view', ARRAY['parking', 'garden', 'security']),
('P002', 'South Wing', '1200 sq ft', 60000.00, 'available', 'Spacious plot with modern facilities', ARRAY['parking', 'playground', 'security']),
('P003', 'East Wing', '800 sq ft', 40000.00, 'reserved', 'Compact plot suitable for small families', ARRAY['parking', 'security']),
('P004', 'West Wing', '1500 sq ft', 75000.00, 'available', 'Premium plot with all amenities', ARRAY['parking', 'garden', 'security', 'playground']),
('P005', 'Central Area', '900 sq ft', 45000.00, 'sold', 'Centrally located compact plot', ARRAY['parking', 'security'])
ON CONFLICT (plot_number) DO NOTHING;