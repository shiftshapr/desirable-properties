const fs = require('fs');
const path = require('path');

// API routes that need auth disabled
const apiRoutes = [
  'app/api/comments/route.ts',
  'app/api/comments/[id]/route.ts',
  'app/api/votes/route.ts',
  'app/api/reports/route.ts',
  'app/api/elements/route.ts'
];

apiRoutes.forEach(routePath => {
  if (fs.existsSync(routePath)) {
    let content = fs.readFileSync(routePath, 'utf8');
    
    // Remove Privy imports
    content = content.replace(/import.*PrivyClient.*from.*@privy-io\/server-auth.*;?\n?/g, '');
    
    // Remove Privy client instantiation
    content = content.replace(/const.*privy.*=.*new.*PrivyClient.*;?\n?/g, '');
    
    // Replace auth token verification with mock data
    content = content.replace(
      /const.*verifiedClaims.*=.*await.*privy.*verifyAuthToken.*token.*;?\n?/g,
      '// Mock auth data for disabled authentication\n    const verifiedClaims = { userId: "mock-user-id", email: "mock@example.com", name: "Mock User" };\n'
    );
    
    // Replace auth token verification with mock data (alternative pattern)
    content = content.replace(
      /const.*verifiedClaims.*=.*await.*privyClient.*verifyAuthToken.*authToken.*;?\n?/g,
      '// Mock auth data for disabled authentication\n        const verifiedClaims = { userId: "mock-user-id", email: "mock@example.com", name: "Mock User" };\n'
    );
    
    // Replace privyUserId with mock data
    content = content.replace(
      /const.*privyUserId.*=.*verifiedClaims\.userId.*;?\n?/g,
      'const privyUserId = "mock-user-id"; // Mock user ID for disabled authentication\n'
    );
    
    // Replace userId with mock data
    content = content.replace(
      /userId.*=.*verifiedClaims\.userId.*;?\n?/g,
      'userId = "mock-user-id"; // Mock user ID for disabled authentication\n'
    );
    
    fs.writeFileSync(routePath, content);
    console.log(`Updated ${routePath}`);
  }
});

console.log('Authentication disabled in all API routes');
