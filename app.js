const express = require("express");
const app = express();

app.set("view engine", "ejs");

app.get("/", function (request, response) {
  response.render('index');
});

app.get("/auth/signin", function (request, response) {
  response.render('auth/signin');
});

app.get("/auth/signup", function (request, response) {
  response.render('auth/signup');
});

module.exports = app;