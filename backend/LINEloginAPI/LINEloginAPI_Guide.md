LINE Login API Guide
Overview
This API provides LINE Login functionality, allowing users to authenticate via LINE and store their profile data in a PostgreSQL database.
Endpoints
1. Initiate LINE Login

URL: /api/line-login

Method: GET

Response:
{
  "login_url": "https://access.line.me/oauth2/v2.1/authorize?..."
}


Description: Returns the LINE authorization URL for the user to log in.


2. LINE Callback

URL: /line/callback
Method: GET
Parameters:
code: Authorization code from LINE
state: State parameter for security


Response: Redirects to the frontend with a JWT token and user data.
Description: Handles the LINE OAuth callback, fetches user profile, stores data, and issues a JWT token.

3. Verify Token

URL: /api/verify-token

Method: POST

Body:
{
  "token": "jwt-token"
}


Response:
{
  "line_id": "user-line-id",
  "display_name": "User Name",
  "picture_url": "https://profile.line.me/..."
}


Description: Verifies the JWT token and returns user data.


Setup

Configure .env with LINE Channel ID, Channel Secret, Redirect URI, and Database credentials.
Run the PostgreSQL database and execute create_database.sql.
Install dependencies: pip install -r requirements.txt.
Start the server: flask run --port=5501.

Security Notes

Use HTTPS for production (e.g., via ngrok or a reverse proxy).
Store JWT secret key securely.
Validate state parameter to prevent CSRF attacks.

