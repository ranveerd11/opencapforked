# OpenCap Test Endpoints Guide

This document provides detailed instructions for testing the various test endpoints in the OpenCap application. Th
ese endpoints are designed to help verify that middleware components are functioning correctly.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Base URL](#base-url)
- [Authentication](#authentication)
- [Test Endpoints](#test-endpoints)
  - [1. Test Root Endpoint](#1-test-root-endpoint)
  - [2. Test Body Parser](#2-test-body-parser)
  - [3. Test Cookie Parser](#3-test-cookie-parser)
  - [4. Test Compression](#4-test-compression)
  - [5. Test Rate Limiting](#5-test-rate-limiting)
- [Testing Best Practices](#testing-best-practices)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have:

1. **cURL** installed on your system
2. The OpenCap API server running locally (typically at `http://localhost:3000`)
3. (Optional) **jq** installed for pretty-printing JSON responses
4. (Optional) **httpie** as an alternative to cURL

## Base URL

All endpoints are relative to the base URL of your API. The base URL differs between environments:

### Local Development
```
http://localhost:3000/api/v1/test
```

### Production (Railway)
```
https://opencap-production.up.railway.app/api
```

**Note:** The URL structure differs between environments. In local development, test endpoints are under `/api/v1/test/`, while in production they are directly under `/api/`.

## Authentication

### JWT Authentication Overview

OpenCap uses JSON Web Tokens (JWT) for authentication. Most API endpoints require a valid JWT token in the `Authorization` header.

> **Important**: When testing protected endpoints on the Railway deployment, you must first obtain a valid authentication token.

### Obtaining a JWT Token

#### 1. User Login

To get a JWT token, you first need to authenticate with valid credentials:

```bash
# Example: User login to get JWT token
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "your-secure-password"
  }'
```

**Successful Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "role": "user"
  }
}
```

#### 2. Using the Token in Requests

Include the token in the `Authorization` header for authenticated requests:

```bash
# Example: Making an authenticated request
curl -X GET http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### 3. Refreshing an Expired Token

When your access token expires, use the refresh token to get a new one:

```bash
# Example: Refresh token
curl -X POST http://localhost:3000/api/v1/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

### Environment Variable Setup

For easier testing, set your token as an environment variable:

```bash
# Set token in environment
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Use in curl commands
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/users/me
```

### Token Expiration

- **Access Token**: Typically expires after 15 minutes
- **Refresh Token**: Typically expires after 7 days

### Common Authentication Errors

- `401 Unauthorized`: Missing or invalid token
  - Solution: Obtain a new token by logging in
  
- `403 Forbidden`: Valid token but insufficient permissions
  - Solution: Ensure your user has the required role/permissions

- `400 Bad Request`: Malformed token
  - Solution: Verify the token format and ensure it's not corrupted

### Testing Authentication with cURL

Here's a complete example of testing an authenticated endpoint:

#### Local Development

```bash
# 1. Login and store the token
RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"your-password"}')

# 2. Extract the token
TOKEN=$(echo $RESPONSE | jq -r '.token')

# 3. Use the token in subsequent requests
curl -X GET http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer $TOKEN" | jq .
```

#### Production (Railway)

```bash
# 1. Login and store the token
RESPONSE=$(curl -s -X POST https://opencap-production.up.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"your-password"}')

# 2. Extract the token
TOKEN=$(echo $RESPONSE | jq -r '.token')

# 3. Use the token in subsequent requests
curl -X GET https://opencap-production.up.railway.app/api/v1/users/me \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### Railway-Specific Authentication Notes

1. **Database Seeding**: The production environment may have different user credentials than your local development environment. Ensure you're using credentials that exist in the Railway deployment.

2. **Error Troubleshooting**: If you encounter 500 Internal Server Error when authenticating on Railway, check:
   - Whether the auth service is properly configured in the deployment
   - If environment variables for JWT secrets are properly set
   - If the MongoDB connection is properly established

3. **First-Time Setup**: For a fresh Railway deployment, you may need to create an initial admin user through a secure channel before being able to authenticate.

4. **Railway Environment Variables**: Make sure all necessary environment variables are set correctly in the Railway dashboard, especially:
   ```
   JWT_SECRET=your_jwt_secret_here
   JWT_EXPIRATION=24h
   MONGODB_URI=your_mongodb_connection_string
   ```

5. **Deployment Log Access**: Check the Railway logs for specific error messages:
   ```bash
   railway logs
   ```
   If you don't have the Railway CLI installed:
   ```bash
   npm i -g @railway/cli
   railway login
   ```

### Railway Deployment Verification and Authentication Process

#### Step 1: Verify Basic Health and Connectivity

```bash
# Check if the application is running
curl https://opencap-production.up.railway.app/health

# Expected response:
# {"status":"ok","message":"Server is running"}
```

#### Step 2: Test Middleware Components 

Ensure middleware is functioning correctly before testing authentication:

```bash
# Test body parser middleware
curl -X POST https://opencap-production.up.railway.app/api/test-body-parser \
  -H "Content-Type: application/json" \
  -d '{"testField":"testValue"}'
```

#### Step 3: Authenticate to Get JWT Token

Attempt to authenticate with the pre-configured admin account:

```bash
# Try to get an authentication token
RESPONSE=$(curl -s -X POST https://opencap-production.up.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@opencap.com","password":"admin123"}')

echo $RESPONSE
```

**Note for Dev Team**: If you receive an "Internal server error" response:

```json
{"message":"Internal server error"}
```

This indicates one of the following issues:

1. The MongoDB connection string (`MONGODB_URI`) is not properly configured in Railway
2. JWT secrets (`JWT_SECRET`) are not properly set in the Railway environment
3. The database doesn't contain the user account you're trying to authenticate with

#### Step 4: First-Time Setup for Railway Environment

For a new Railway deployment, complete these steps in order:

1. Set required environment variables in Railway dashboard:
   - `MONGODB_URI` - MongoDB connection string
   - `JWT_SECRET` - Secret key for JWT token signing
   - `JWT_EXPIRATION` - Token expiration time (e.g., "24h")
   - `PORT` - Set to match Railway's expected port
   - `NODE_ENV` - Set to "production"

2. Provision and initialize the MongoDB database:
   - Connect to MongoDB instance using connection string
   - Run the database seed script to create initial admin user:
   ```bash
   # From local environment with Railway CLI installed
   railway run node scripts/init-admin-user.js
   ```

3. Retry authentication with the credentials created during initialization

#### Step 5: Working with JWT Tokens

Once authentication is working correctly, follow this workflow:

```bash
# 1. Login and store the token (replace with working credentials)
RESPONSE=$(curl -s -X POST https://opencap-production.up.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@opencap.com","password":"admin123"}')

# 2. Extract the token - will only work after environment setup
TOKEN=$(echo $RESPONSE | jq -r '.token')

# 3. Use the token for authenticated requests
curl -X GET https://opencap-production.up.railway.app/api/v1/users \
  -H "Authorization: Bearer $TOKEN"
```

#### Step 6: Verify MongoDB Connectivity

Most authentication errors relate to database connectivity issues. Verify MongoDB connection:

```bash
# Check MongoDB connectivity using a database utility endpoint (if available)
curl https://opencap-production.up.railway.app/api/v1/admin/db-status \
  -H "Authorization: Bearer $TOKEN"
```

Refer to [OpenCap_TestCoverage_DigitalOceanDeployment.md](./OpenCap_TestCoverage_DigitalOceanDeployment.md) for detailed deployment setup instructions.

### Security Notes

1. Never commit tokens to version control
2. Use environment variables for tokens in scripts
3. Set appropriate token expiration times in your environment
4. Always use HTTPS in production
5. Store refresh tokens securely

## Test Endpoints

### 1. Test Root Endpoint

Verifies that the test router is properly mounted and basic requests work.

**Endpoint:** `GET /`

**cURL Command (Local):**
```bash
curl -X GET http://localhost:3000/api/v1/test/
```

**cURL Command (Production):**
```bash
curl -X GET https://opencap-production.up.railway.app/api
```

**Expected Response:**
```json
{
  "message": "Test root endpoint for middleware testing",
  "success": true
}
```

**Verification Points:**
- Status code should be 200
- Response should include the success message
- Check response headers for security headers (CORS, etc.)

### 2. Test Body Parser

Tests the Express JSON body parser middleware.

**Endpoint:** `POST /test-body-parser`

**cURL Command (Local):**
```bash
curl -X POST \
  http://localhost:3000/api/v1/test/test-body-parser \
  -H 'Content-Type: application/json' \
  -d '{
    "testField": "testValue",
    "numbers": [1, 2, 3],
    "nested": {"key": "value"}
  }'
```

**cURL Command (Production):**
```bash
curl -X POST \
  https://opencap-production.up.railway.app/api/test-body-parser \
  -H 'Content-Type: application/json' \
  -d '{
    "testField": "testValue",
    "numbers": [1, 2, 3],
    "nested": {"key": "value"}
  }'
```

**Expected Response:**
```json
{
  "receivedData": {
    "testField": "testValue",
    "numbers": [1, 2, 3],
    "nested": {"key": "value"}
  },
  "success": true
}
```

**Verification Points:**
- Status code should be 200
- Response should echo back the exact JSON payload sent
- All data types should be preserved (strings, arrays, nested objects)

### 3. Test Cookie Parser

Tests cookie parsing and setting functionality.

**Endpoint:** `GET /test-cookie-parser`

**cURL Command (Local):**
```bash
# First request - no cookies
curl -v http://localhost:3000/api/v1/test/test-cookie-parser

# Second request - with cookies from first response
curl -v http://localhost:3000/api/v1/test/test-cookie-parser \
  -H "Cookie: testResponseCookie=cookieValue"
```

**cURL Command (Production):**
```bash
# First request - no cookies
curl -v https://opencap-production.up.railway.app/api/test-cookie-parser

# Second request - with cookies from first response
curl -v https://opencap-production.up.railway.app/api/test-cookie-parser \
  -H "Cookie: testResponseCookie=cookieValue"
```

**Expected Response:**
```json
{
  "cookies": {
    "testResponseCookie": "cookieValue"
  },
  "success": true
}
```

**Verification Points:**
- Check for `Set-Cookie` header in the response
- Verify cookie attributes (httpOnly, secure, sameSite)
- Second request should show the cookie in the request

### 4. Test Compression

Tests response compression (gzip/deflate).

**Endpoint:** `GET /test-compression`

**cURL Command (Local):**
```bash
# Without compression (for comparison)
curl -v http://localhost:3000/api/v1/test/test-compression \
  -H "Accept-Encoding: "  # Explicitly disable compression

# With compression
curl -v --compressed http://localhost:3000/api/v1/test/test-compression
```

**cURL Command (Production):**
```bash
# Without compression (for comparison)
curl -v https://opencap-production.up.railway.app/api/test-compression \
  -H "Accept-Encoding: "  # Explicitly disable compression

# With compression
curl -v --compressed https://opencap-production.up.railway.app/api/test-compression
```

**Verification Points:**
- Check response headers for `Content-Encoding: gzip`
- Compare response sizes with and without compression
- Verify the response can be properly decompressed

### 5. Test Rate Limiting

Tests the rate limiting middleware.

**Endpoint:** `GET /rate-limit-test`

**cURL Command (Local):**
```bash
# Make multiple requests to test rate limiting
for i in {1..6}; do
  curl -s -o /dev/null -w "Request $i: %{http_code}\n" \
    http://localhost:3000/api/v1/test/rate-limit-test
done
```

**cURL Command (Production):**
```bash
# Make multiple requests to test rate limiting
for i in {1..6}; do
  curl -s -o /dev/null -w "Request $i: %{http_code}\n" \
    https://opencap-production.up.railway.app/api/rate-limit-test
done
```

**Expected Behavior:**
- First 5 requests should return 200 OK
- 6th request should be rate limited (429 Too Many Requests)
- Response headers should include rate limit information:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Remaining requests in the window
  - `Retry-After`: When to retry after being rate limited

**Verification Points:**
- Check status codes for each request
- Verify rate limit headers are present
- Test that the rate limit resets after the window expires

## API Endpoints Reference

This section documents all available API endpoints in the OpenCap application. Each endpoint is prefixed with the base URL (e.g., `http://localhost:3000`).

### Authentication & User Management

#### Auth Routes (`/api/v1/auth`)
- `POST /login` - User login
- `POST /register` - Register a new user
- `POST /refresh-token` - Refresh access token
- `POST /forgot-password` - Request password reset
- `POST /reset-password` - Reset password with token

#### User Management (`/api/v1/users`)
- `GET /` - List all users (admin only)
- `GET /:id` - Get user by ID
- `PUT /:id` - Update user
- `DELETE /:id` - Delete user (admin only)

### Financial Data

#### Financial Reports (`/api/v1/financial-reports`)
- `GET /` - List all financial reports
- `POST /` - Create a new financial report
- `GET /:id` - Get report by ID
- `PUT /:id` - Update report
- `DELETE /:id` - Delete report

#### Financial Metrics (`/api/v1/metrics`)
- `GET /companies/:companyId/metrics/profitability` - Get profitability metrics
- `GET /companies/:companyId/metrics/liquidity` - Get liquidity metrics
- `GET /companies/:companyId/metrics/solvency` - Get solvency metrics
- `GET /companies/:companyId/metrics/efficiency` - Get efficiency metrics
- `GET /companies/:companyId/metrics/dashboard` - Get financial dashboard

### Company & Stakeholder Management

#### Companies (`/api/v1/companies`)
- `GET /` - List all companies
- `POST /` - Create a new company
- `GET /:id` - Get company by ID
- `PUT /:id` - Update company
- `DELETE /:id` - Delete company

#### Stakeholders (`/api/v1/stakeholders`)
- `GET /` - List all stakeholders
- `POST /` - Create new stakeholder
- `GET /:id` - Get stakeholder by ID
- `PUT /:id` - Update stakeholder
- `DELETE /:id` - Delete stakeholder

### Document Management

#### Documents (`/api/v1/documents`)
- `GET /` - List all documents
- `POST /` - Upload new document
- `GET /:id` - Get document by ID
- `PUT /:id` - Update document metadata
- `DELETE /:id` - Delete document

#### Document Access (`/api/v1/document-accesses`)
- `GET /` - List all document access records
- `POST /` - Grant document access
- `DELETE /:id` - Revoke document access

### Investment & Equity

#### Investment Tracking (`/api/v1/investments`)
- `GET /` - List all investments
- `POST /` - Record new investment
- `GET /:id` - Get investment by ID
- `PUT /:id` - Update investment
- `DELETE /:id` - Delete investment

#### Share Classes (`/api/v1/share-classes`)
- `GET /` - List all share classes
- `POST /` - Create new share class
- `GET /:id` - Get share class by ID
- `PUT /:id` - Update share class
- `DELETE /:id` - Delete share class

### Special Purpose Vehicles (SPVs)

#### SPV Management (`/api/v1/spvs`)
- `GET /` - List all SPVs
- `POST /` - Create new SPV
- `GET /:id` - Get SPV by ID
- `PUT /:id` - Update SPV
- `DELETE /:id` - Delete SPV

#### SPV Assets (`/api/v1/spv-assets`)
- `GET /` - List all SPV assets
- `POST /` - Add asset to SPV
- `GET /:id` - Get SPV asset by ID
- `PUT /:id` - Update SPV asset
- `DELETE /:id` - Remove asset from SPV

### System & Administration

#### Admin Endpoints (`/api/v1/admin`)
- `GET /users` - List all users (admin only)
- `POST /users` - Create new user (admin only)
- `GET /system/stats` - Get system statistics

#### Health Check (`/health`)
- `GET /health` - Basic health check endpoint
  ```bash
  curl http://localhost:3000/health
  ```
  **Response:**
  ```json
  {
    "status": "ok",
    "message": "Server is running"
  }
  ```

## Testing Best Practices

1. **Use Environment Variables**
   ```bash
   # Set in your shell
   export API_BASE="http://localhost:3000/api/v1/test"
   export AUTH_TOKEN="your-jwt-token"
   
   # Use in cURL
   curl -H "Authorization: Bearer $AUTH_TOKEN" "$API_BASE/"
   ```

2. **Check Response Headers**
   ```bash
   curl -I http://localhost:3000/api/v1/test/
   ```

3. **Pretty-print JSON Responses**
   ```bash
   curl -s http://localhost:3000/api/v1/test/ | jq .
   ```

4. **Save and Reuse Cookies**
   ```bash
   # Save cookies to a file
   curl -c cookies.txt http://localhost:3000/api/v1/test/test-cookie-parser
   
   # Use saved cookies
   curl -b cookies.txt http://localhost:3000/api/v1/test/test-cookie-parser
   ```

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure the server is sending the correct CORS headers
   - Check for preflight OPTIONS requests

2. **Rate Limiting**
   - If you're being rate limited, wait for the window to reset
   - Check the `Retry-After` header for when to retry

3. **Compression Issues**
   - Ensure the client sends `Accept-Encoding` header
   - Verify the response size is above the compression threshold

4. **Cookie Problems**
   - Check cookie attributes (httpOnly, secure, sameSite)
   - Ensure cookies are being sent with subsequent requests

### Debugging Tips

1. **Verbose cURL Output**
   ```bash
   curl -v http://localhost:3000/api/v1/test/
   ```

2. **Check Server Logs**
   - Look for errors or warnings in the server console
   - Check for unhandled promise rejections

3. **Network Inspection**
   - Use browser developer tools or tools like Postman to inspect requests/responses
   - Check for malformed headers or cookies

4. **Test with httpie**
   ```bash
   http :3000/api/v1/test/
   http :3000/api/v1/test/test-body-parser testField=testValue nested:='{"key":"value"}'
   ```

## Conclusion

These test endpoints provide a way to verify that the core middleware components of the OpenCap API are functioning correctly. Regular testing of these endpoints can help catch configuration issues early in the development process.

For additional testing scenarios or custom middleware tests, consider adding new endpoints to the test router following the same patterns demonstrated here.
