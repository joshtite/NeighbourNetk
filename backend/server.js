const express = require("express");
const cors = require("cors");
const app = express();
const PORT = 5000;

app.use(express.json());
app.use(cors());

// -----------------------------
// In-memory storage (TEMP)
// -----------------------------
let helpRequests = [];

// -----------------------------
// POST /api/help-requests
// Create a help request
// -----------------------------
app.post("/api/help-requests", (req, res) => {
  const { title, description, name, category, location } = req.body;

  if (!title || !description || !name) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const newRequest = {
    id: Date.now(),
    title,
    description,
    name,
    category: category || "Errand / daily life",
    location: location || "",
    status: "open",
    createdAt: new Date(),
    responses: []
  };

  helpRequests.push(newRequest);

  res.status(201).json(newRequest);
});

// -----------------------------
// GET /api/help-requests
// Get all help requests
// -----------------------------
app.get("/api/help-requests", (req, res) => {
  res.json(helpRequests);
});

// -----------------------------
// POST /api/help-requests/:id/respond
// Volunteer responds to a request
// -----------------------------
app.post("/api/help-requests/:id/respond", (req, res) => {
  const { id } = req.params;
  const { message, volunteerName } = req.body;

  if (!message || !volunteerName) {
    return res.status(400).json({
      message: "Message and volunteer name are required"
    });
  }

  const request = helpRequests.find(r => r.id === Number(id));

  if (!request) {
    return res.status(404).json({
      message: "Help request not found"
    });
  }

  const newResponse = {
    message,
    volunteerName,
    respondedAt: new Date()
  };

  request.responses.push(newResponse);

  res.status(201).json(request);
});

// -----------------------------
// POST /api/help-requests/:id/status
// Update the status of a help request
// -----------------------------
app.post("/api/help-requests/:id/status", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowed = ["open", "in_progress", "resolved"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  const request = helpRequests.find(r => r.id === Number(id));
  if (!request) {
    return res.status(404).json({ message: "Help request not found" });
  }

  request.status = status;
  request.statusUpdatedAt = new Date();

  res.json(request);
});

// -----------------------------
// Start Server
// -----------------------------
app.listen(PORT, () => {
  console.log(`NeighbourNetk API running on http://localhost:${PORT}`);
});
