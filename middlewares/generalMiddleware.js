const express = require("express");
const nocache = require("nocache");

module.exports = (app) => {

  
  app.use(nocache());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Static files middleware
  const path = require("path");
  app.use(express.static(path.join(__dirname, "../public")));
};
