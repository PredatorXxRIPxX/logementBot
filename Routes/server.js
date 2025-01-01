const express = require("express");
const app = express();
const apiRoutes = require("./api"); // Ajustez le chemin

app.use("/api", apiRoutes);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`API lancée sur http://localhost:${PORT}`);
});
