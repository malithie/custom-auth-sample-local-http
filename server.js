const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const morgan = require("morgan");

const app = express();
const PORT = 3000;

// Middleware for logging requests to a file
const logStream = fs.createWriteStream("server.log", { flags: "a" });
app.use(morgan("combined", { stream: logStream }));

// Middleware for parsing request body
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Temporary store for authentication sessions
const sessionStore = {};

// Mock user database
const mockUsers = {
    "1234": {
        id: "9f1ab106-ce85-46b1-8f41-6a071b54eb56",
        claims: [
            { uri: "http://wso2.org/claims/username", value: "emilye" },
            { uri: "http://wso2.org/claims/emailaddress", value: "emily@aol.com" },
            { uri: "http://wso2.org/claims/lastname", value: "Ellon" },
            { uri: "http://wso2.org/claims/givenname", value: "Emily" }
        ],
    },
};

// **Utility Function: Log Requests & Responses**
const logRequest = (req) => {
    console.log("\n🔹 Request Received:");
    console.log(`- URL: ${req.method} ${req.originalUrl}`);
    console.log("- Headers:", JSON.stringify(req.headers, null, 2));
    console.log("- Body:", JSON.stringify(req.body, null, 2));
};

const logResponse = (req, resBody) => {
    console.log("\n✅ Response Sent:");
    console.log(`- URL: ${req.method} ${req.originalUrl}`);
    console.log("- Response Body:", JSON.stringify(resBody, null, 2));
};

// **1. Handle Authentication Request from Identity Server**
app.post("/authenticate", (req, res) => {
    logRequest(req);

    const { flowId, event } = req.body;

    if (!flowId) {
        const response = { actionStatus: "FAILED", failureReason: "missingFlowId" };
        logResponse(req, response);
        return res.status(400).json(response);
    }

    // Check if user is already authenticated
    if (sessionStore[flowId]?.status === "SUCCESS") {
        const response = { actionStatus: "SUCCESS", data: { user: sessionStore[flowId].user } };
        logResponse(req, response);
        return res.json(response);
    }

    // Redirect URL to collect PIN
    const redirectUrl = `http://localhost:3000/pin-entry?redirectUrl=https://localhost:9443/t/${event.tenant.name}/commonauth&flowId=${flowId}`;

    const response = {
        actionStatus: "INCOMPLETE",
        operations: [{ op: "redirect", url: redirectUrl }],
    };
    logResponse(req, response);
    return res.json(response);
});

// **2. Serve the PIN Entry Page**
app.get("/pin-entry", (req, res) => {
    logRequest(req);

    const { flowId, redirectUrl } = req.query;

    if (!flowId || !redirectUrl) {
        const htmlResponse = `
            <html>
            <body>
                <h2>Enter Flow ID & PIN</h2>
                <form action="/validate-pin" method="POST">
                    <label>Flow ID:</label>
                    <input type="text" name="flowId" required /><br>
                    <label>PIN:</label>
                    <input type="password" name="pin" required /><br>
                    <input type="hidden" name="redirectUrl" value="${redirectUrl || ''}" />
                    <button type="submit">Submit</button>
                </form>
            </body>
            </html>
        `;
        logResponse(req, htmlResponse);
        return res.send(htmlResponse);
    }

    const htmlResponse = `
        <html>
        <body>
            <h2>Enter Your PIN</h2>
            <form action="/validate-pin" method="POST">
                <input type="hidden" name="flowId" value="${flowId}" />
                <input type="password" name="pin" required />
                 <input type="hidden" name="redirectUrl" value="${redirectUrl || ''}" />
                <button type="submit">Submit</button>
            </form>
        </body>
        </html>
    `;
    logResponse(req, htmlResponse);
    return res.send(htmlResponse);
});

// **3. Validate PIN & Redirect to Identity Server**
app.post("/validate-pin", (req, res) => {
    logRequest(req);

    const { flowId, pin, redirectUrl } = req.body;

    if (!flowId || !pin || !redirectUrl) {
        const response = "Missing Flow ID, PIN, or Redirect URL.";
        logResponse(req, response);
        return res.status(400).send(response);
    }

    // Validate PIN
    const user = mockUsers[pin] || null;
    sessionStore[flowId] = user
        ? { status: "SUCCESS", user }
        : { status: "FAILED" };

    const finalRedirectUrl = `${redirectUrl}?sessionDataKey=${flowId}`;
    logResponse(req, `Redirecting to ${finalRedirectUrl}`);
    return res.redirect(finalRedirectUrl);
});

// **4. Handle Authentication Status Check**
app.post("/authenticate", (req, res) => {
    logRequest(req);

    const { flowId } = req.body;

    if (!flowId || !sessionStore[flowId]) {
        const response = {
            actionStatus: "FAILED",
            failureReason: "invalidFlowId",
            failureDescription: "Invalid or expired Flow ID.",
        };
        logResponse(req, response);
        return res.status(400).json(response);
    }

    const session = sessionStore[flowId];

    if (session.status === "SUCCESS") {
        const response = { actionStatus: "SUCCESS", data: { user: session.user } };
        logResponse(req, response);
        return res.json(response);
    } else {
        const response = {
            actionStatus: "FAILED",
            failureReason: "userNotFound",
            failureDescription: "Unable to find user for given credentials.",
        };
        logResponse(req, response);
        return res.json(response);
    }
});

// **Start the HTTP Server**
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
