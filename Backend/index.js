const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { logger, requestsLogger } = require("./utils/logger.js");
const connectDB = require("./config/db.js");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5002;

connectDB();


app.use(cors({
  origin: "http://localhost:3000",
  credentials: true, 
})); 

app.use(express.json());
app.use(cookieParser());
app.use(requestsLogger);

app.use("/", require("./route"));

app.listen(port, () => {
  logger.info(`Server running on http://localhost:${port}`);
});
