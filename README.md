# My Calendar MCP Server

A Model Context Protocol (MCP) server that provides calendar integration functionality using the Google Calendar API. This server allows you to retrieve calendar events and meetings for specific dates.

## Features

- Retrieve calendar events for a specific date
- Integration with Google Calendar API
- MCP-compliant server implementation
- Error handling for invalid dates and API issues

## Prerequisites

- Node.js (version 14 or higher)
- A Google Calendar API key
- Access to the Google Calendar you want to query

## Installation

1. Clone or download this project
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables (see Configuration section below)

## Configuration

Create a `.env` file in the root directory with the following variables:

### Required Environment Variables

- `GOOGLE_PUBLIC_API_KEY` - Your Google Calendar API public key
- `CALENDAR_ID` - The ID of the Google Calendar you want to access

### Example .env file:

```env
GOOGLE_PUBLIC_API_KEY=your_google_api_key_here
CALENDAR_ID=your_calendar_id_here
```

## Usage

### Starting the Server

Run the MCP server:

```bash
npm start
```

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
  "meetings": ["Quiz on Microprocessor at 2025-07-21T10:00:00Z"]
}
```

## MCP Integration

This server is configured to work with MCP-compatible clients. The configuration file `.vscode/mcp.json` should contain:

```json
{
  "servers": {
    "MyCalendarMCP": {
      "type": "stdio",
      "command": "npm",
      "args": ["start"],
      "cwd": "${workspaceFolder}"
    }
  },
  "inputs": []
}
```

## Development

The project structure:

```
├── server.js          # Main MCP server implementation
├── package.json       # Node.js dependencies and scripts
├── .env              # Environment variables (not tracked in git)
├── .gitignore        # Git ignore rules
└── README.md         # This file
```

## Dependencies

- `@modelcontextprotocol/sdk` - MCP SDK for server implementation
- `dotenv` - Environment variable loading
- `googleapis` - Google APIs client library
- `zod` - Schema validation

## Error Handling

The server handles various error scenarios:

- Invalid date formats
- Google Calendar API errors
- Missing environment variables
- Network connectivity issues

## Security Notes

- Never commit your `.env` file to version control
- Keep your Google API key secure and rotate it regularly
- Use appropriate Google Calendar access permissions

## License

ISC License
