// import path from "path";
import logger from "morgan";
import cookieParser from "cookie-parser";
import express from "express";
import { HashbrownOpenAI } from "@hashbrownai/openai";

// var indexRouter = require("./routes/index");
// var usersRouter = require("./routes/users");

export var app = express();

app.use(logger("dev"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// app.use(express.static(path.join(__dirname, "public")));

// app.use("/", indexRouter);
// app.use("/users", usersRouter);
app.post("/api/chat", async (req, res) => {
  const stream = HashbrownOpenAI.stream.text({
    apiKey: process.env.OPENAI_API_KEY,
    request: req.body,
  });

  res.header("Content-Type", "application/octet-stream");

  for await (const chunk of stream) {
    res.write(chunk);
  }

  res.end();
});
