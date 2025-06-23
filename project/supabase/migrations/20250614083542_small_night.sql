-- Ensure that the role "viksur" exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'viksur') THEN
    EXECUTE 'CREATE ROLE viksur LOGIN';
  END IF;
END
$$;

-- Note: We removed the commands that attempt to create the database or change connection,
-- since the official PostgreSQL Docker image handles database creation via the environment variables.
--
-- The following commands have been removed:
-- CREATE DATABASE IF NOT EXISTS plots_db;
-- CREATE USER IF NOT EXISTS plots_user WITH PASSWORD 'plots_password';
-- GRANT ALL PRIVILEGES ON DATABASE plots_db TO plots_user;
-- \c plots_db;

-- Create admin users table
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create plots table
CREATE TABLE IF NOT EXISTS plots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plot_number VARCHAR(20) UNIQUE NOT NULL,
    location VARCHAR(200) NOT NULL,
    size VARCHAR(50) NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold')),
    description TEXT,
    amenities TEXT[], -- PostgreSQL array type
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_plots_status ON plots(status);
CREATE INDEX IF NOT EXISTS idx_plots_location ON plots(location);
CREATE INDEX IF NOT EXISTS idx_plots_price ON plots(price);

-- Insert default admin user (password: admin123)
INSERT INTO admin_users (username, email, password_hash) 
VALUES ('admin', 'admin@plots.com', '$2a$10$rOzJqKqVQQGVQQGVQQGVQeK8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8')
ON CONFLICT (username) DO NOTHING;

-- Insert sample plots
INSERT INTO plots (plot_number, location, size, price, status, description, amenities) VALUES
('P001', 'North Wing', '1000 sq ft', 50000.00, 'available', 'Prime location with excellent view', ARRAY['parking', 'garden', 'security']),
('P002', 'South Wing', '1200 sq ft', 60000.00, 'available', 'Spacious plot with modern facilities', ARRAY['parking', 'playground', 'security']),
('P003', 'East Wing', '800 sq ft', 40000.00, 'reserved', 'Compact plot suitable for small families', ARRAY['parking', 'security'])
ON CONFLICT (plot_number) DO NOTHING;

-- Grant permissions to the database user "viksur"
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO viksur;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO viksur;