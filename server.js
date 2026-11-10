
const express = require("express");
const path = require("node:path");

const app = express();
const PORT = 3000;

// Allow the server to read JSON data
app.use(express.json());

// Serve the browser files
app.use(express.static(path.join(__dirname, "public")));

// Check whether the server is working
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    game: "Strawberry Outbreak"
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(
    `Game running at http://localhost:${PORT}`
  );
});
