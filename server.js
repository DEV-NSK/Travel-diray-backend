const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const morgan = require("morgan");

const errorHandler = require("./middleware/errorHandler");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const connectDB = require("./config/db");

dotenv.config();
connectDB();

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (e.g. mobile apps, curl)
      if (!origin) return callback(null, true);
      // allow all vercel.app deployments (preview + production)
      if (origin.endsWith(".vercel.app")) return callback(null, true);
      // allow explicitly listed origins
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(morgan("dev"));

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", userRoutes);
app.use("/api/diary", require("./routes/diaryRoutes"));
app.use("/api/comment", require("./routes/commentRoutes"));
app.use("/api/admin", adminRoutes);

app.get("/", (_req, res) => res.send("Travel Diary API is running..."));

// Error handler must come AFTER routes
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
