const { getAuthService } = require('./lib/auth.ts');

// Test the authentication system
console.log('Testing authentication system...');

const auth = getAuthService();
console.log('Auth service:', {
  isAuthenticated: auth.isAuthenticated,
  isReady: auth.isReady,
  user: auth.user
});

// Test getting access token
auth.getAccessToken().then(token => {
  console.log('Access token:', token);
}).catch(error => {
  console.error('Error getting token:', error);
}); 