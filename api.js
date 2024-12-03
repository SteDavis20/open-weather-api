const express = require("express");
const http = require("http");
const https = require("https");

/* To read API Keys from .env file */
const dotenv = require("dotenv");
dotenv.config();

const app = express();

/* For security purposes not hardcoding API Keys */
const OPEN_WEATHER_MAP_API_KEY = process.env.OPEN_WEATHER_MAP_API_KEY;
const OPEN_UV_API_KEY = process.env.OPEN_UV_API_KEY;

const port = 3000;

/*
 *   Used to convert city name into geographic coordinates
 */
app.get("/getCoordinates/:city/", (request, response) => {
  response.setHeader("Access-Control-Allow-Origin", "*"); // without this line, the client does not have permission to view the response from server
  let cityName = request.params.city;

  let url =
    "http://api.openweathermap.org/geo/1.0/direct?q=" +
    cityName +
    "&limit=1&appid=" +
    OPEN_WEATHER_MAP_API_KEY;

  http
    .get(url, (response1) => {
      let rawData = "";
      response1.on("data", (chunk) => {
        rawData += chunk;
      });

      response1.on("end", () => {
        const parsedData = JSON.parse(rawData);
        response.send(parsedData);
      });
    })
    .on("error", (e) => {
      console.error(`Got error: ${e.message}`);
    });
});

/*
 *   My unique feature: server gets uv index data from 3rd party API called OpenUV
 *                      also gets sunrise and sunset
 *
 *   Documentation:     https://www.openuv.io/uvindex
 *   Chose this API because OpenWeatherMap requires uploading bank details for the UV index data
 *
 *   Date must be in UCT ISO-8601 format
 *   Returns data on 1 day, call this with each day in next 4 days for forecast
 */
app.get("/uvIndexToday/:lat/:lon/:date/", (request, response) => {
  response.setHeader("Access-Control-Allow-Origin", "*"); // without this line, the client does not have permission to view the response from server

  let latitude = request.params.lat;
  let longitude = request.params.lon;
  let date = request.params.date;

  let url =
    "https://api.openuv.io/api/v1/uv?lat=" +
    latitude +
    "&lng=" +
    longitude +
    "&dt=" +
    date;

  let options = {
    headers: {
      "content-type": "application/json",
      "x-access-token": OPEN_UV_API_KEY,
    },
  };

  /*
   *   Note: Open UV's free API Key has a limit of 50 calls per day, potential reason for receiving error.
   */
  https.get(url, options, (response1) => {
    if (response1.statusCode != 200) {
      response.statusCode = 400;
      response.send(
        "Error! Invalid latitude and/or longitude passed to OpenUV API"
      );
    } else {
      let rawData = "";
      response1.on("data", (chunk) => {
        rawData += chunk;
      });

      response1.on("end", () => {
        const parsedData = JSON.parse(rawData);
        response.send(parsedData);
      });
    }
  });
});

/*
 *   GET request made using Geographic coordinates
 *   NOTICE this api call using httpS and not http, if you use wrong version you get 500 internal server error.
 *   For temperature in Celsius, use "&units=metric" BEFORE the appid=API_KEY
 */
app.get("/next5DaysWeatherData/:lat/:lon/", (request, response) => {
  response.setHeader("Access-Control-Allow-Origin", "*"); // without this line, the client does not have permission to view the response from server
  let latitude = request.params.lat;
  let longitude = request.params.lon;
  let next5DaysDataUrl =
    "http://api.openweathermap.org/data/2.5/forecast?lat=" +
    latitude +
    "&lon=" +
    longitude +
    "&units=metric&appid=" +
    OPEN_WEATHER_MAP_API_KEY;

  http
    .get(next5DaysDataUrl, (res) => {
      let weatherData5Days = "";
      res.on("data", (chunk) => {
        weatherData5Days += chunk;
      });
      res.on("end", () => {
        let parsedWeatherData5Days = JSON.parse(weatherData5Days);
        response.send(parsedWeatherData5Days);
      });
    })
    .on("error", (e) => {
      console.error(`Got error: ${e.message}`);
    });
});

/*
 *   This gives forecast for next 5 days with 1 hour intervals (only free forecast).
 *   Using AIR Pollution API to get the PM2_5 forecast for the next 5 days.
 *   If this exceeds 10, then you should advise the user to wear a mask.
 */
app.get("/next5DaysAirPollution/:lat/:lon/", (request, response) => {
  response.setHeader("Access-Control-Allow-Origin", "*"); // without this line, the client does not have permission to view the response from server
  let latitude = request.params.lat;
  let longitude = request.params.lon;
  let pollutionAPIURL =
    "http://api.openweathermap.org/data/2.5/air_pollution/forecast?lat=" +
    latitude +
    "&lon=" +
    longitude +
    "&appid=" +
    OPEN_WEATHER_MAP_API_KEY;

  http.get(pollutionAPIURL, (apiResponse) => {
    let pollutionData = "";

    apiResponse.on("data", (chunk) => {
      pollutionData += chunk;
    });

    apiResponse.on("end", () => {
      pollutionData = JSON.parse(pollutionData);
      response.send(pollutionData);
    });
  });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}!`);
});
