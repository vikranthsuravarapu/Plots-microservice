import React, { useState, useEffect } from 'react';
import { Plus, MapPin, DollarSign, Home, Filter, Search, LogOut, Lock, User } from 'lucide-react';

interface Plot {
  id: string;
  plot_number: string;
  location: string;
  size: string;
  price: number;
  status: 'available' | 'reserved' | 'sold';
  description: string;
  amenities: string[];
  created_at: string;
  updated_at: string;
}

interface NewPlot {
  plotNumber: string;
  location: string;
  size: string;
  price: number;
  description: string;
  amenities: string[];
}

interface User {
  id: string;
  username: string;
  email: string;
}

function App() {
  const [plots, setPlots] = useState<Plot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('admin_token'));
  
  const [filters, setFilters] = useState({
    status: 'available',
    location: '',
    minPrice: '',
    maxPrice: ''
  });

  const [loginData, setLoginData] = useState({
    username: '',
    password: ''
  });

  const [newPlot, setNewPlot] = useState<NewPlot>({
    plotNumber: '',
    location: '',
    size: '',
    price: 0,
    description: '',
    amenities: []
  });

  // API base URL
  const API_BASE = '/plots/api';

  // Check authentication on app load
  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setLoading(false);
    }
  }, [token]);

  // Fetch plots when filters change
  useEffect(() => {
    fetchPlots();
  }, [filters]);

  const verifyToken = async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        // Token is invalid, remove it
        localStorage.removeItem('admin_token');
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      localStorage.removeItem('admin_token');
      setToken(null);
      setUser(null);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem('admin_token', data.token);
        setToken(data.token);
        setUser(data.user);
        setShowLoginForm(false);
        setLoginData({ username: '', password: '' });
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Failed to login');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
    setUser(null);
  };

  // Fetch plots from API
  const fetchPlots = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.location) queryParams.append('location', filters.location);
      if (filters.minPrice) queryParams.append('minPrice', filters.minPrice);
      if (filters.maxPrice) queryParams.append('maxPrice', filters.maxPrice);

      const response = await fetch(`${API_BASE}/plots?${queryParams}`);
      const data = await response.json();
      
      if (data.success) {
        setPlots(data.data);
      } else {
        setError(data.message || 'Failed to fetch plots');
      }
    } catch (err) {
      console.error('Error fetching plots:', err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('You must be logged in to create plots');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/plots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newPlot),
      });

      const data = await response.json();
      
      if (data.success) {
        setPlots([...plots, data.data]);
        setNewPlot({
          plotNumber: '',
          location: '',
          size: '',
          price: 0,
          description: '',
          amenities: []
        });
        setShowCreateForm(false);
      } else {
        setError(data.message || 'Failed to create plot');
      }
    } catch (err) {
      console.error('Error creating plot:', err);
      setError('Failed to create plot');
    }
  };

  const handleStatusChange = async (plotId: string, newStatus: 'available' | 'reserved' | 'sold') => {
    if (!token) {
      setError('You must be logged in to update plots');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/plots/${plotId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();
      
      if (data.success) {
        setPlots(plots.map(plot => 
          plot.id === plotId 
            ? { ...plot, status: newStatus, updated_at: new Date().toISOString() }
            : plot
        ));
      } else {
        setError(data.message || 'Failed to update plot status');
      }
    } catch (err) {
      console.error('Error updating plot:', err);
      setError('Failed to update plot status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800 border-green-200';
      case 'reserved': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'sold': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading plots...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
          <button 
            onClick={() => {setError(null); fetchPlots();}}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <Home className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Plot Management</h1>
                <p className="text-gray-600">Manage available plots in your venture</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <div className="flex items-center space-x-2 text-gray-700">
                    <User className="h-4 w-4" />
                    <span className="text-sm font-medium">{user.username}</span>
                  </div>
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors duration-200"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Plot</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors duration-200"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowLoginForm(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors duration-200"
                >
                  <Lock className="h-4 w-4" />
                  <span>Admin Login</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <Filter className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Status</option>
                <option value="available">Available</option>
                <option value="reserved">Reserved</option>
                <option value="sold">Sold</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.location}
                  onChange={(e) => setFilters({...filters, location: e.target.value})}
                  placeholder="Search location..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Min Price</label>
              <input
                type="number"
                value={filters.minPrice}
                onChange={(e) => setFilters({...filters, minPrice: e.target.value})}
                placeholder="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Price</label>
              <input
                type="number"
                value={filters.maxPrice}
                onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
                placeholder="∞"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Available Plots</p>
                <p className="text-2xl font-bold text-green-600">
                  {plots.filter(p => p.status === 'available').length}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <Home className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Reserved Plots</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {plots.filter(p => p.status === 'reserved').length}
                </p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-lg">
                <Home className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sold Plots</p>
                <p className="text-2xl font-bold text-red-600">
                  {plots.filter(p => p.status === 'sold').length}
                </p>
              </div>
              <div className="bg-red-100 p-3 rounded-lg">
                <Home className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Plots Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plots.map((plot) => (
            <div key={plot.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{plot.plot_number}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(plot.status)}`}>
                    {plot.status.charAt(0).toUpperCase() + plot.status.slice(1)}
                  </span>
                </div>
                
                <div className="space-y-3 mb-4">
                  <div className="flex items-center text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span className="text-sm">{plot.location}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Home className="h-4 w-4 mr-2" />
                    <span className="text-sm">{plot.size}</span>
                  </div>
                  <div className="flex items-center text-gray-900">
                    <DollarSign className="h-4 w-4 mr-2" />
                    <span className="text-lg font-semibold">₹{plot.price.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <p className="text-gray-600 text-sm mb-4">{plot.description}</p>

                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">Amenities:</p>
                  <div className="flex flex-wrap gap-1">
                    {plot.amenities.map((amenity, index) => (
                      <span key={index} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>

                {user && (
                  <div className="flex space-x-2">
                    <select
                      value={plot.status}
                      onChange={(e) => handleStatusChange(plot.id, e.target.value as any)}
                      className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="available">Available</option>
                      <option value="reserved">Reserved</option>
                      <option value="sold">Sold</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {plots.length === 0 && (
          <div className="text-center py-12">
            <Home className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No plots found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Login Modal */}
      {showLoginForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Admin Login</h2>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                  <input
                    type="text"
                    required
                    value={loginData.username}
                    onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="admin"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <input
                    type="password"
                    required
                    value={loginData.password}
                    onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="admin123"
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowLoginForm(false)}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-lg transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg transition-colors duration-200"
                  >
                    Login
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create Plot Modal */}
      {showCreateForm && user && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New Plot</h2>
              <form onSubmit={handleCreatePlot} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Plot Number</label>
                  <input
                    type="text"
                    required
                    value={newPlot.plotNumber}
                    onChange={(e) => setNewPlot({...newPlot, plotNumber: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="P004"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  <input
                    type="text"
                    required
                    value={newPlot.location}
                    onChange={(e) => setNewPlot({...newPlot, location: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="West Wing"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Size</label>
                  <input
                    type="text"
                    required
                    value={newPlot.size}
                    onChange={(e) => setNewPlot({...newPlot, size: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="1500 sq ft"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price</label>
                  <input
                    type="number"
                    required
                    value={newPlot.price}
                    onChange={(e) => setNewPlot({...newPlot, price: parseInt(e.target.value)})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="75000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={newPlot.description}
                    onChange={(e) => setNewPlot({...newPlot, description: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    rows={3}
                    placeholder="Premium plot with all amenities"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amenities (comma-separated)</label>
                  <input
                    type="text"
                    value={newPlot.amenities.join(', ')}
                    onChange={(e) => setNewPlot({...newPlot, amenities: e.target.value.split(',').map(s => s.trim()).filter(s => s)})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="parking, garden, security"
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-lg transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg transition-colors duration-200"
                  >
                    Create Plot
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;