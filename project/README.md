# Available Plots Microservice

A production-ready microservice for managing available plots with admin authentication, PostgreSQL database, and multi-container Docker setup.

## Features

- **🔐 Admin Authentication**: JWT-based authentication for plot management
- **🗄️ PostgreSQL Database**: Persistent data storage with proper schema
- **🐳 Multi-Container Setup**: Separate containers for frontend, backend, database, and nginx
- **🚀 Auto-Start Services**: Docker Compose orchestration
- **📱 Responsive UI**: Modern React frontend with Tailwind CSS
- **🔒 Security**: Helmet.js, CORS, input validation, and secure authentication

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Git (for cloning the repository)

### 1. Clone and Setup
```bash
git clone <repository-url>
cd available-plots-microservice

# Copy environment variables
cp .env.example .env
```

### 2. Start All Services
```bash
# Build and start all containers
npm run docker:up

# View logs
npm run docker:logs

# Stop all services
npm run docker:down
```

### 3. Access the Application
- **Frontend**: http://localhost:80
- **API**: http://localhost:3000
- **Nginx Proxy**: http://localhost:8080
- **PostgreSQL**: localhost:5432

## Default Admin Credentials
- **Username**: `admin`
- **Password**: `admin123`

## Architecture

### Services Overview
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx Proxy   │    │   React Frontend │    │  Express Backend │
│   Port: 8080    │────│   Port: 80      │────│   Port: 3000    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                               ┌─────────────────┐
                                               │   PostgreSQL    │
                                               │   Port: 5432    │
                                               └─────────────────┘
```

### Container Details

1. **Frontend Container** (`plots-frontend`)
   - React app built with Vite
   - Served by Nginx
   - Responsive design with Tailwind CSS

2. **Backend Container** (`plots-backend`)
   - Express.js API server
   - JWT authentication
   - PostgreSQL integration

3. **Database Container** (`plots-postgres`)
   - PostgreSQL 15 Alpine
   - Persistent data storage
   - Auto-initialization with schema

4. **Nginx Proxy** (`plots-nginx`)
   - Reverse proxy for routing
   - Load balancing
   - Static file serving

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Admin login |
| GET | `/api/auth/verify` | Verify JWT token |

### Plots Management (Admin Only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/plots` | Get plots with filters |
| GET | `/api/plots/:id` | Get specific plot |
| POST | `/api/plots` | Create new plot |
| PUT | `/api/plots/:id` | Update plot |
| DELETE | `/api/plots/:id` | Delete plot |

### Health Check
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health status |

## Database Schema

### Admin Users Table
```sql
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Plots Table
```sql
CREATE TABLE plots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plot_number VARCHAR(20) UNIQUE NOT NULL,
    location VARCHAR(200) NOT NULL,
    size VARCHAR(50) NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'available',
    description TEXT,
    amenities TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Development

### Local Development Setup
```bash
# Install dependencies
npm install

# Start PostgreSQL (using Docker)
docker run -d \
  --name plots-postgres-dev \
  -e POSTGRES_DB=plots_db \
  -e POSTGRES_USER=plots_user \
  -e POSTGRES_PASSWORD=plots_password \
  -p 5432:5432 \
  postgres:15-alpine

# Start backend server
npm run server:dev

# Start frontend (in another terminal)
npm run dev
```

### Environment Variables
```bash
NODE_ENV=production
PORT=3000
DB_HOST=postgres
DB_PORT=5432
DB_NAME=plots_db
DB_USER=plots_user
DB_PASSWORD=plots_password
JWT_SECRET=your-super-secret-jwt-key
```

## Docker Commands

### Build and Run
```bash
# Build all images
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Remove volumes (careful - deletes data!)
docker-compose down -v
```

### Individual Container Management
```bash
# Backend only
docker-compose up -d postgres backend

# Frontend only
docker-compose up -d frontend

# View specific service logs
docker-compose logs -f backend
```

## Production Deployment

### Environment Setup
1. Update `.env` with production values
2. Change JWT_SECRET to a secure random string
3. Update database credentials
4. Configure proper domain names

### Security Considerations
- Change default admin password
- Use strong JWT secret
- Enable SSL/TLS
- Configure firewall rules
- Regular security updates

### Monitoring
- Health check endpoints available
- Container health checks configured
- Logs available via Docker Compose

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check if PostgreSQL is running
   docker-compose ps postgres
   
   # View database logs
   docker-compose logs postgres
   ```

2. **Frontend Not Loading**
   ```bash
   # Check nginx configuration
   docker-compose logs nginx
   
   # Verify frontend build
   docker-compose logs frontend
   ```

3. **API Not Responding**
   ```bash
   # Check backend logs
   docker-compose logs backend
   
   # Verify database connection
   docker-compose exec backend node -e "console.log('Backend running')"
   ```

### Reset Everything
```bash
# Stop and remove all containers and volumes
docker-compose down -v

# Remove all images
docker-compose down --rmi all

# Rebuild and restart
docker-compose up -d --build
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.