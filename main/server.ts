const express = require("express");
const app = express();
const port = 3000;

app.get("/", (req, res) => {
  res.send(
    "<h1>Welcome to your local server!</h1><p>This is a simple page.</p>"
  );
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
