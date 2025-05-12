import DescopeClient from '@descope/node-sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Debug environment variables
console.log('DESCOPE_PROJECT_ID:', process.env.DESCOPE_PROJECT_ID);
console.log('DESCOPE_MANAGEMENT_KEY:', process.env.DESCOPE_MANAGEMENT_KEY ? 'Set' : 'Not Set');

// Initialize the Descope client
const descopeClient = DescopeClient({
  projectId: process.env.DESCOPE_PROJECT_ID || '',
  managementKey: process.env.DESCOPE_MANAGEMENT_KEY || '',
});

export default descopeClient; 