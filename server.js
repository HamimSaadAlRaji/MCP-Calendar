import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";
import { google } from "googleapis";
import { z } from "zod";
import { OAuth2Client } from "google-auth-library";
import fs from "fs/promises"; // Use promises version of fs for async operations
import path from "path";
import process from "process";
import express from "express"; // Import express for the OAuth flow

dotenv.config();

// --- OAuth 2.0 Configuration ---
const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");
const TOKEN_PATH = path.join(process.cwd(), "token.json");
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly", // For getMyCalendarDataByDate
  "https://www.googleapis.com/auth/calendar.events", // For addEvent
];

let oAuth2Client; // Declare oAuth2Client globally

async function loadOAuth2Client() {
  try {
    const content = await fs.readFile(CREDENTIALS_PATH);
    const credentials = JSON.parse(content);

    // Validate the structure
    if (
      !credentials.web ||
      !credentials.web.client_id ||
      !credentials.web.client_secret
    ) {
      throw new Error(
        "Invalid credentials.json structure. Missing required web OAuth fields."
      );
    }

    const { client_id, client_secret, redirect_uris } = credentials.web;

    oAuth2Client = new OAuth2Client(client_id, client_secret, redirect_uris[0]);

    // Try to load previously saved tokens
    try {
      const token = await fs.readFile(TOKEN_PATH);
      oAuth2Client.setCredentials(JSON.parse(token));
      console.log("Using previously saved tokens from token.json.");
    } catch (err) {
      console.log(
        "No existing token.json found. You will need to authorize the app."
      );
      // Don't set oAuth2Client to null here, just leave it without credentials
    }
  } catch (err) {
    console.error(
      "Error loading client secret file (credentials.json):",
      err.message
    );
    console.error(
      "Make sure credentials.json exists and is correctly formatted."
    );
    console.error("Current working directory:", process.cwd());
    console.error("Looking for credentials at:", CREDENTIALS_PATH);

    // Don't exit the process, let the OAuth flow handle the error
    oAuth2Client = null;
    throw err; // Re-throw to let calling function handle it
  }
}

// Function to get an authorized Google Calendar client
async function getCalendarService() {
  if (!oAuth2Client || !oAuth2Client.credentials.access_token) {
    console.error(
      "OAuth2Client not authorized. Please authorize the app first."
    );
    throw new Error("Not authorized. Please complete the OAuth 2.0 flow.");
  }
  return google.calendar({ version: "v3", auth: oAuth2Client });
}

// --- MCP Server Setup ---
const server = new McpServer({
  name: "My Calendar ",
  version: "1.0.0",
});

// --- Tool Function: getMyCalendarDataByDate (Updated for OAuth) ---
async function getMyCalendarDataByDate(date) {
  try {
    const calendar = await getCalendarService(); // Get authorized calendar client

    // Calculate the start and end of the given date (UTC)
    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    const res = await calendar.events.list({
      calendarId: process.env.CALENDAR_ID,
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = res.data.items || [];
    const meetings = events.map((event) => {
      const start = event.start.dateTime || event.start.date;
      return `${event.summary} at ${start}`;
    });

    if (meetings.length > 0) {
      return { meetings };
    } else {
      return { meetings: [] };
    }
  } catch (err) {
    console.error("Error in getMyCalendarDataByDate:", err.message);
    return { error: err.message };
  }
}

// --- NEW Tool Function: addCalendarEvent ---
async function addCalendarEvent(
  summary,
  startDate,
  startTime,
  endDate,
  endTime,
  description,
  location
) {
  try {
    const calendar = await getCalendarService(); // Get authorized calendar client
    const CALENDAR_ID = process.env.CALENDAR_ID;

    // Construct start and end dateTime strings
    const startDateTime = `${startDate}T${startTime}:00+06:00`; // Assuming Dhaka timezone +06:00
    const endDateTime = `${endDate}T${endTime}:00+06:00`; // Assuming Dhaka timezone +06:00

    // Validate dates and times
    if (
      isNaN(new Date(startDateTime).getTime()) ||
      isNaN(new Date(endDateTime).getTime())
    ) {
      throw new Error(
        "Invalid date or time format. Please use YYYY-MM-DD for date and HH:MM for time."
      );
    }

    const event = {
      summary: summary,
      location: location,
      description: description,
      start: {
        dateTime: startDateTime,
        timeZone: "Asia/Dhaka", // Use your correct timezone
      },
      end: {
        dateTime: endDateTime,
        timeZone: "Asia/Dhaka", // Use your correct timezone
      },
      // You can add attendees, reminders, etc., here if needed
      // attendees: [{ email: 'attendee@example.com' }],
      // reminders: {
      //   useDefault: false,
      //   overrides: [
      //     { method: 'email', minutes: 24 * 60 },
      //     { method: 'popup', minutes: 10 },
      //   ],
      // },
    };

    const res = await calendar.events.insert({
      calendarId: CALENDAR_ID,
      resource: event,
    });

    console.log("Event created:", res.data.htmlLink);
    return {
      success: true,
      eventId: res.data.id,
      htmlLink: res.data.htmlLink,
      summary: res.data.summary,
      start: res.data.start.dateTime,
      end: res.data.end.dateTime,
    };
  } catch (err) {
    console.error("Error adding event:", err.message);
    if (err.response && err.response.data && err.response.data.error) {
      console.error(
        "Google API Error details:",
        err.response.data.error.message
      );
    }
    return { error: err.message };
  }
}

// --- Register Tools to MCP ---

server.tool(
  "getMyCalendarDataByDate",
  {
    date: z
      .string()
      .optional()
      .describe("Date in YYYY-MM-DD format. Defaults to today."),
  },
  async ({ date }) => {
    if (!date) {
      const now = new Date();
      const yyyy = now.getFullYear(); // Use getFullYear for local date
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      date = `${yyyy}-${mm}-${dd}`;
    }
    console.log("getMyCalendarDataByDate called with date:", date);
    if (isNaN(Date.parse(date))) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "Invalid date format. Please provide a valid date string.",
            }),
          },
        ],
      };
    }
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(await getMyCalendarDataByDate(date)),
        },
      ],
    };
  }
);

server.tool(
  "addCalendarEvent",
  {
    summary: z.string().describe("Summary or title of the event."),
    startDate: z
      .string()
      .describe("Start date of the event in YYYY-MM-DD format."),
    startTime: z
      .string()
      .describe("Start time of the event in HH:MM format (24-hour)."),
    endDate: z.string().describe("End date of the event in YYYY-MM-DD format."),
    endTime: z
      .string()
      .describe("End time of the event in HH:MM format (24-hour)."),
    description: z.string().optional().describe("Description for the event."),
    location: z.string().optional().describe("Location of the event."),
  },
  async ({
    summary,
    startDate,
    startTime,
    endDate,
    endTime,
    description,
    location,
  }) => {
    console.log("addCalendarEvent called with:", {
      summary,
      startDate,
      startTime,
      endDate,
      endTime,
      description,
      location,
    });
    const result = await addCalendarEvent(
      summary,
      startDate,
      startTime,
      endDate,
      endTime,
      description,
      location
    );
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
    };
  }
);

// --- Express Server for OAuth Flow ---
const app = express();
const WEB_SERVER_PORT = 3001; // Choose a port for your web server

app.get("/", async (req, res) => {
  await loadOAuth2Client(); // Attempt to load credentials/tokens

  if (!oAuth2Client || !oAuth2Client.credentials.access_token) {
    if (!oAuth2Client) {
      // oAuth2Client failed to load initially (e.g., credentials.json missing)
      res
        .status(500)
        .send(
          "Error: OAuth2Client could not be initialized. Check credentials.json and server logs."
        );
      return;
    }
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline", // Request a refresh token
      scope: SCOPES,
      prompt: "consent", // Always show consent screen to get refresh token
    });
    res.send(`
      <p>This application requires Google Calendar access for adding/updating events.</p>
      <p><a href="${authUrl}">Authorize with Google</a></p>
      <p>After authorization, you will be redirected to <code>/oauth2callback</code>.</p>
    `);
  } else {
    res.send(`
      <p>Authorized! The MCP server is running and ready to use the Calendar API.</p>
      <p>You can now send commands to the MCP server that utilize the Google Calendar tools.</p>
      <p>Tokens saved to <code>token.json</code>. You can close this browser tab.</p>
    `);
  }
});

app.get("/oauth2callback", async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send("Authorization code not found.");
  }

  // Re-initialize oAuth2Client with credentials if it's null (e.g., after initial failure)
  if (!oAuth2Client) {
    const content = await fs.readFile(CREDENTIALS_PATH);
    const credentials = JSON.parse(content);
    const { client_id, client_secret, redirect_uris } = credentials.web;
    oAuth2Client = new OAuth2Client(client_id, client_secret, redirect_uris[0]);
  }

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    // Save the tokens for future use (important for refresh token)
    await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
    console.log("Tokens stored to", TOKEN_PATH);

    res.send(
      "Authorization successful! Tokens stored. You can now use the MCP tools. Return to the terminal where the MCP server is running."
    );
  } catch (error) {
    console.error("Error retrieving access token", error);
    res.status(500).send("Error during authorization. Check server logs.");
  }
});

// --- MCP Server Connect and Express Server Start ---
async function init() {
  // Try to load OAuth client, but don't fail if it doesn't work
  try {
    await loadOAuth2Client();
  } catch (err) {
    console.error("Failed to initialize OAuth client:", err.message);
    console.log("The web server will still start to allow authorization.");
  }

  // Start the Express server for OAuth flow in the background
  app.listen(WEB_SERVER_PORT, () => {
    console.log(`Web server for OAuth listening on port ${WEB_SERVER_PORT}`);
    console.log(
      `Please visit http://localhost:${WEB_SERVER_PORT} to authorize the application if needed.`
    );
  });

  // Connect the MCP server
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("MCP Server connected to StdioTransport.");
  console.log(
    "You can now interact with the MCP server using tools like getMyCalendarDataByDate and addCalendarEvent."
  );
}

// Call the initialization
init();
