const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const nocache = require("nocache");

module.exports = (app) => {
  app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:2000",
    credentials: true,
  }));
  
  app.use(nocache());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Static files middleware
  const path = require("path");
  app.use(express.static(path.join(__dirname, "../public")));
};
