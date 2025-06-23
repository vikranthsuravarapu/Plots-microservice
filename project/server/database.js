import pkg from 'pg';
import bcrypt from 'bcryptjs';
const { Pool } = pkg;

export class DatabaseService {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'plots_db',
      user: process.env.DB_USER || 'plots_user',
      password: process.env.DB_PASSWORD || 'plots_password',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    // Handle connection errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }

  async connect() {
    let retries = 5;
    while (retries > 0) {
      try {
        const client = await this.pool.connect();
        console.log('✅ Database connection established');
        
        // Test the connection and create tables if they don't exist
        await this.initializeTables(client);
        client.release();
        return;
      } catch (error) {
        console.error(`❌ Database connection failed (${retries} retries left):`, error.message);
        retries--;
        if (retries === 0) {
          throw error;
        }
        // Wait 2 seconds before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  async initializeTables(client) {
    try {
      console.log('🔄 Initializing database tables...');
      
      // Create admin_users table
      await client.query(`
        CREATE TABLE IF NOT EXISTS admin_users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          username VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create plots table
      await client.query(`
        CREATE TABLE IF NOT EXISTS plots (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          plot_number VARCHAR(20) UNIQUE NOT NULL,
          location VARCHAR(200) NOT NULL,
          size VARCHAR(50) NOT NULL,
          price DECIMAL(12,2) NOT NULL,
          status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold')),
          description TEXT,
          amenities TEXT[],
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes
      await client.query(`CREATE INDEX IF NOT EXISTS idx_plots_status ON plots(status)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_plots_location ON plots(location)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_plots_price ON plots(price)`);

      // Generate proper bcrypt hash for 'admin123'
      console.log('🔐 Generating admin password hash...');
      const adminPassword = 'admin123';
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(adminPassword, saltRounds);
      
      console.log('🔐 Creating admin user with proper password hash...');
      
      // Insert or update admin user with correct password hash
      await client.query(`
        INSERT INTO admin_users (username, email, password_hash) 
        VALUES ('admin', 'admin@plots.com', $1)
        ON CONFLICT (username) DO UPDATE SET 
          password_hash = $1,
          updated_at = CURRENT_TIMESTAMP
      `, [passwordHash]);

      // Verify the admin user was created
      const adminCheck = await client.query('SELECT username, email FROM admin_users WHERE username = $1', ['admin']);
      if (adminCheck.rows.length > 0) {
        console.log('✅ Admin user verified:', adminCheck.rows[0]);
      } else {
        console.log('❌ Admin user not found after creation');
      }

      // Insert sample plots if table is empty
      const plotCount = await client.query('SELECT COUNT(*) FROM plots');
      if (parseInt(plotCount.rows[0].count) === 0) {
        console.log('📊 Inserting sample plots...');
        await client.query(`
          INSERT INTO plots (plot_number, location, size, price, status, description, amenities) VALUES
          ('P001', 'North Wing', '1000 sq ft', 50000.00, 'available', 'Prime location with excellent view', ARRAY['parking', 'garden', 'security']),
          ('P002', 'South Wing', '1200 sq ft', 60000.00, 'available', 'Spacious plot with modern facilities', ARRAY['parking', 'playground', 'security']),
          ('P003', 'East Wing', '800 sq ft', 40000.00, 'reserved', 'Compact plot suitable for small families', ARRAY['parking', 'security']),
          ('P004', 'West Wing', '1500 sq ft', 75000.00, 'available', 'Premium plot with all amenities', ARRAY['parking', 'garden', 'security', 'playground']),
          ('P005', 'Central Area', '900 sq ft', 45000.00, 'sold', 'Centrally located compact plot', ARRAY['parking', 'security'])
        `);
        console.log('✅ Sample plots inserted');
      } else {
        console.log('📊 Plots table already has data, skipping sample data insertion');
      }

      console.log('✅ Database tables initialized successfully');
      console.log('🔐 Admin credentials: username=admin, password=admin123');
    } catch (error) {
      console.error('❌ Error initializing database tables:', error);
      throw error;
    }
  }

  // Admin user methods
  async findAdminByUsername(username) {
    const query = 'SELECT * FROM admin_users WHERE username = $1';
    const result = await this.pool.query(query, [username]);
    return result.rows[0];
  }

  // Plot methods
  async getPlots(filters = {}) {
    let query = 'SELECT * FROM plots WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (filters.status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(filters.status);
    } else {
      // Default to available plots if no status specified
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push('available');
    }

    if (filters.location) {
      paramCount++;
      query += ` AND location ILIKE $${paramCount}`;
      params.push(`%${filters.location}%`);
    }

    if (filters.minPrice) {
      paramCount++;
      query += ` AND price >= $${paramCount}`;
      params.push(parseFloat(filters.minPrice));
    }

    if (filters.maxPrice) {
      paramCount++;
      query += ` AND price <= $${paramCount}`;
      params.push(parseFloat(filters.maxPrice));
    }

    query += ' ORDER BY created_at DESC';

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getPlotById(id) {
    const query = 'SELECT * FROM plots WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows[0];
  }

  async getPlotByNumber(plotNumber) {
    const query = 'SELECT * FROM plots WHERE plot_number = $1';
    const result = await this.pool.query(query, [plotNumber]);
    return result.rows[0];
  }

  async createPlot(plotData) {
    const query = `
      INSERT INTO plots (plot_number, location, size, price, status, description, amenities)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      plotData.plotNumber,
      plotData.location,
      plotData.size,
      plotData.price,
      plotData.status || 'available',
      plotData.description || '',
      plotData.amenities || []
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async updatePlot(id, plotData) {
    const fields = [];
    const values = [];
    let paramCount = 0;

    Object.entries(plotData).forEach(([key, value]) => {
      if (value !== undefined) {
        paramCount++;
        const dbField = key === 'plotNumber' ? 'plot_number' : key;
        fields.push(`${dbField} = $${paramCount}`);
        values.push(value);
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    paramCount++;
    fields.push(`updated_at = $${paramCount}`);
    values.push(new Date());

    paramCount++;
    values.push(id);

    const query = `
      UPDATE plots 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async deletePlot(id) {
    const query = 'DELETE FROM plots WHERE id = $1 RETURNING *';
    const result = await this.pool.query(query, [id]);
    return result.rows[0];
  }

  async close() {
    await this.pool.end();
  }
}