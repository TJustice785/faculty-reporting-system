import React, { createContext, useContext, useReducer, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

// Initial state
const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  isLoading: true,
};

// Action types
const AuthActionTypes = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  LOAD_USER_START: 'LOAD_USER_START',
  LOAD_USER_SUCCESS: 'LOAD_USER_SUCCESS',
  LOAD_USER_FAILURE: 'LOAD_USER_FAILURE',
  UPDATE_USER: 'UPDATE_USER',
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AuthActionTypes.LOGIN_START:
    case AuthActionTypes.LOAD_USER_START:
      return {
        ...state,
        isLoading: true,
      };

    case AuthActionTypes.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
      };

    case AuthActionTypes.LOAD_USER_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        isLoading: false,
      };

    case AuthActionTypes.LOGIN_FAILURE:
    case AuthActionTypes.LOAD_USER_FAILURE:
    case AuthActionTypes.LOGOUT:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      };

    case AuthActionTypes.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };

    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth Provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Set token in localStorage and api headers
  const setAuthToken = (token) => {
    if (token) {
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
    }
  };

  // Load user on app start
  const loadUser = async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      dispatch({ type: AuthActionTypes.LOAD_USER_FAILURE });
      return;
    }

    try {
      dispatch({ type: AuthActionTypes.LOAD_USER_START });
      setAuthToken(token);
      
      const response = await api.get('/auth/me');
      let baseUser = response.data.user;
      // Try to enrich with avatarUrl
      try {
        const me = await api.get('/users/me');
        if (me?.data?.avatarUrl) {
          baseUser = { ...baseUser, avatarUrl: me.data.avatarUrl };
        }
      } catch (_) {}
      dispatch({
        type: AuthActionTypes.LOAD_USER_SUCCESS,
        payload: { user: baseUser },
      });
    } catch (error) {
      console.error('Load user error:', error);
      dispatch({ type: AuthActionTypes.LOAD_USER_FAILURE });
      setAuthToken(null);
    }
  };

  // Login function
  const login = async (credentials) => {
    try {
      dispatch({ type: AuthActionTypes.LOGIN_START });
      
      const response = await api.post('/auth/login', credentials);
      const { user, token } = response.data;

      setAuthToken(token);
      // Enrich with avatar if available
      let enriched = user;
      try {
        const me = await api.get('/users/me');
        if (me?.data?.avatarUrl) {
          enriched = { ...enriched, avatarUrl: me.data.avatarUrl };
        }
      } catch (_) {}
      dispatch({
        type: AuthActionTypes.LOGIN_SUCCESS,
        payload: { user: enriched, token },
      });

      toast.success(`Welcome back, ${user.firstName}!`);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Login failed';
      dispatch({ type: AuthActionTypes.LOGIN_FAILURE });
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      const { user, token } = response.data;

      setAuthToken(token);
      dispatch({
        type: AuthActionTypes.LOGIN_SUCCESS,
        payload: { user, token },
      });

      toast.success(`Welcome to Faculty Reporting, ${user.firstName}!`);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Registration failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout API error:', error);
    }
    
    setAuthToken(null);
    dispatch({ type: AuthActionTypes.LOGOUT });
    toast.success('Logged out successfully');
  };

  // Change password function
  const changePassword = async (passwordData) => {
    try {
      const response = await api.post('/auth/change-password', passwordData);
      toast.success(response.data.message);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Password change failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Update user profile
  const updateProfile = async (profileData) => {
    try {
      const response = await api.put(`/users/${state.user.id}`, profileData);
      dispatch({
        type: AuthActionTypes.UPDATE_USER,
        payload: response.data.user,
      });
      toast.success('Profile updated successfully');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Profile update failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Check if user has specific role
  const hasRole = (roles) => {
    if (!state.user) return false;
    if (Array.isArray(roles)) {
      return roles.includes(state.user.role);
    }
    return state.user.role === roles;
  };

  // Check if user has permission (role hierarchy)
  const hasPermission = (requiredRole) => {
    if (!state.user) return false;
    
    const roleHierarchy = {
      'student': 1,
      'lecturer': 2,
      'program_leader': 3,
      'principal_lecturer': 4,
      'faculty_manager': 5
    };

    const userLevel = roleHierarchy[state.user.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;

    return userLevel >= requiredLevel;
  };

  // Load user on mount
  useEffect(() => {
    loadUser();
  }, []);

  // Context value
  const value = {
    // State
    user: state.user,
    token: state.token,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    
    // Actions
    login,
    register,
    logout,
    loadUser,
    changePassword,
    updateProfile,
    
    // Utilities
    hasRole,
    hasPermission,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

