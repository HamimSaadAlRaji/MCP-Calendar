# My Calendar MCP Server

A Model Context Protocol (MCP) server that provides comprehensive calendar integration functionality using the Google Calendar API with OAuth 2.0 authentication. This server allows you to retrieve calendar events, add new events, and manage your Google Calendar seamlessly.

## Features

- 🔍 Retrieve calendar events for specific dates
- ➕ Add new calendar events with full details (title, time, description, location)
- 🔐 OAuth 2.0 authentication with Google Calendar API
- 🌐 Built-in web server for OAuth authorization flow
- 📅 Full Google Calendar API integration
- 🛡️ MCP-compliant server implementation
- ⚡ Real-time calendar management
- 🚫 Comprehensive error handling for invalid dates and API issues

## Prerequisites

- Node.js (version 14 or higher)
- Google Cloud Console project with Calendar API enabled
- Google OAuth 2.0 credentials (Web application type)
- Access to the Google Calendar you want to manage

## Installation

1. Clone or download this project
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your Google OAuth credentials (see Configuration section below)
4. Configure environment variables

## Configuration

### Step 1: Google Cloud Console Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API
4. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
5. Select "Web application" as the application type
6. Add authorized redirect URIs:
   - `http://localhost:3001/oauth2callback`
7. Download the credentials as `credentials.json` and place it in the project root

### Step 2: Environment Variables

Create a `.env` file in the root directory with the following variables:

### Required Environment Variables

- `CALENDAR_ID` - The ID of the Google Calendar you want to access (usually your email for primary calendar)

### Example .env file:

```env
CALENDAR_ID=your-email@gmail.com
```

### Step 3: OAuth Authorization

1. Start the server (see Usage section)
2. Visit `http://localhost:3001` in your browser
3. Click "Authorize with Google" to complete the OAuth flow
4. Grant the necessary permissions for calendar access
5. The server will save your tokens automatically for future use

## Usage

### Starting the Server

Run the MCP server:

```bash
node server.js
```

The server will:

1. Start the MCP server on stdio transport
2. Launch a web server on port 3001 for OAuth authorization
3. Display authorization instructions if needed

### OAuth Authorization Flow

If this is your first time running the server or your tokens have expired:

1. The server will display: `Please visit http://localhost:3001 to authorize the application if needed.`
2. Open your browser and go to `http://localhost:3001`
3. Click "Authorize with Google"
4. Sign in to your Google account and grant calendar permissions
5. You'll be redirected back and see "Authorization successful!"
6. The server is now ready to use

### Available Tools

#### `getMyCalendarDataByDate`

Retrieves calendar events for a specific date.

**Parameters:**

- `date` (optional): Date string in YYYY-MM-DD format. If not provided, uses today's date.

**Returns:**

- `meetings`: Array of meeting descriptions with timestamps
- `error`: Error message if the request fails

**Example Response:**

```json
{
  "meetings": [
    "Quiz on Microprocessor at 2025-07-21",
    "Meeting with Team at 2025-07-21T14:00:00+06:00"
  ]
}
```

#### `addCalendarEvent`

Creates a new calendar event.

**Parameters:**

- `summary` (required): Title/summary of the event
- `startDate` (required): Start date in YYYY-MM-DD format
- `startTime` (required): Start time in HH:MM format (24-hour)
- `endDate` (required): End date in YYYY-MM-DD format
- `endTime` (required): End time in HH:MM format (24-hour)
- `description` (optional): Event description
- `location` (optional): Event location

**Returns:**

- `success`: Boolean indicating if the event was created
- `eventId`: Google Calendar event ID
- `htmlLink`: Link to view the event in Google Calendar
- `summary`: Event title
- `start`/`end`: Event start and end times
- `error`: Error message if the request fails

**Example Response:**

```json
{
  "success": true,
  "eventId": "abc123def456",
  "htmlLink": "https://www.google.com/calendar/event?eid=...",
  "summary": "Quiz on Web Programming",
  "start": "2025-07-23T10:00:00+06:00",
  "end": "2025-07-23T11:00:00+06:00"
}
```

## MCP Integration

This server is configured to work with MCP-compatible clients. The configuration file should contain:

**For Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json`):**

```json
{
  "mcpServers": {
    "mycalendarmcp": {
      "command": "node",
      "args": ["/path/to/your/project/server.js"]
    }
  }
}
```

**For VS Code with MCP extension (`.vscode/mcp.json`):**

```json
{
  "servers": {
    "MyCalendarMCP": {
      "type": "stdio",
      "command": "node",
      "args": ["server.js"],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

## Development

The project structure:

```
├── server.js          # Main MCP server implementation with OAuth
├── package.json       # Node.js dependencies and scripts
├── credentials.json   # Google OAuth credentials (not tracked in git)
├── token.json         # OAuth tokens (generated after authorization)
├── .env              # Environment variables (not tracked in git)
├── .gitignore        # Git ignore rules
└── README.md         # This documentation
```

### Development Notes

- The server runs two services simultaneously:
  1. MCP server on stdio transport for tool communication
  2. Express web server on port 3001 for OAuth flow
- OAuth tokens are automatically refreshed when needed
- The server gracefully handles missing credentials and guides users through setup

## Dependencies

- `@modelcontextprotocol/sdk` - MCP SDK for server implementation
- `dotenv` - Environment variable loading
- `googleapis` - Google APIs client library
- `google-auth-library` - Google OAuth 2.0 authentication
- `express` - Web server for OAuth authorization flow
- `zod` - Schema validation and type safety

## Error Handling

The server handles various error scenarios:

- Invalid date formats
- Missing or invalid OAuth credentials
- Google Calendar API errors and rate limits
- Network connectivity issues
- Token expiration and refresh
- Missing environment variables
- Calendar access permission issues

## Security Notes

- ⚠️ **Never commit your `credentials.json`, `token.json`, or `.env` files to version control**
- 🔐 Keep your OAuth credentials secure and limit their scope to necessary permissions
- 🔄 OAuth tokens are automatically refreshed, but monitor for any unauthorized access
- 🚫 Use appropriate Google Calendar access permissions (read-only vs. read-write)
- 🌐 The OAuth web server only runs on localhost for security
- 📝 Regularly review authorized applications in your Google Account settings

## Troubleshooting

### Common Issues

1. **"OAuth2Client not authorized" Error**

   - Visit `http://localhost:3001` to complete authorization
   - Check that `credentials.json` exists and is valid
   - Ensure redirect URI matches what's configured in Google Cloud Console

2. **"Calendar not found" Error**

   - Verify your `CALENDAR_ID` in the `.env` file
   - For primary calendar, use your Gmail address
   - Ensure the calendar exists and you have access

3. **"Invalid credentials" Error**

   - Re-download `credentials.json` from Google Cloud Console
   - Verify OAuth client type is "Web application"
   - Check that Calendar API is enabled in your project

4. **Web server port conflicts**
   - Change `WEB_SERVER_PORT` in `server.js` if port 3001 is in use
   - Update redirect URIs in Google Cloud Console accordingly

## License

ISC License

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly with your Google Calendar
5. Submit a pull request

## Support

For issues and questions:

- Check the troubleshooting section above
- Review Google Calendar API documentation
- Ensure your Google Cloud project setup is correct
