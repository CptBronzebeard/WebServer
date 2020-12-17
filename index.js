const express = require('express');
const fetch = require('node-fetch');
const token = require('rand-token');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const app = express();
const Datastore = require('nedb');
const database = new Datastore({ filename: '.data/database', autoload: true });
const defCity = 'Vsevolozhsk';
const clientLink = process.env.CLIENT_URL;
const pictureUrl = 'http://openweathermap.org/img/wn/';
const apiKey = '3d57646fde7625f581c36b64bd01dcfe';
const apiUrl = 'https://api.openweathermap.org/data/2.5/weather?units=metric&lang=ru&';

app.use(express.json())
app.use(cookieParser())
app.listen(443)
app.listen(8080)
app.listen(9420)

app.use(express.static('public'))

const corsOptions = {
    origin: clientLink,
    credentials: true,
    methods: 'GET, POST, DELETE, OPTIONS',
    headers: 'Origin, X-Requested-With, Content-Type, Accept'
}

const cookieOptions = {
  maxAge: 1000 * 60 * 60 * 24 * 90,
  sameSite: "None",
    secure: true
}

app.options(cors(corsOptions))
app.use(function (request, response, next) {
    response.header('Access-Control-Allow-Origin', clientLink)
    response.header('Access-Control-Allow-Credentials', true)
    response.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE')
    if (request.method == 'OPTIONS') {
        response.send(200);
    }
    else {
        next()
    }
})

app.get('/weather/city', cors(corsOptions), async (request, response) => {
    const city = request.query.q
    const weatherResponse = await getWeatherByName(city)
    response.json(weatherResponse)
})

app.get('/weather/coords', cors(corsOptions), async (request, response) => {
    const latitude = request.query.lat
    const longitude = request.query.lon
    const weatherResponse = await getWeatherByCoords(latitude, longitude)
    response.json(weatherResponse)
})

app.get('/favorites', cors(corsOptions), (request, response) => {
    let cities = []
    let userToken = request.cookies.userToken
    database.find({ userToken: userToken }, function(error, docs) {
        if (error != null) {
            response.json({ success: false, message: error })
        }
        else if (docs.length == 0) {
            response.json({ success: true, cities: []})
        }
        else {
            response.cookie('userToken', userToken, cookieOptions)
            response.json({ success: true, cities: docs[0].cities })
        }
    })
})

app.get('/weather/default', cors(corsOptions), async (request, response) => {
    const weatherResponse = await getWeatherByName(defCity)
    response.json(weatherResponse)
})

app.post('/favorites/:city', cors(corsOptions), async (request, response) => {
    const city = request.params.city
    const weatherResponse = await getWeatherByName(city)
    let userToken = request.cookies.userToken
    if(typeof(userToken) == 'undefined') {
        userToken = token.generate(20)
    }

    if(weatherResponse.success) {
        database.find({ userToken: userToken, cities: { $elemMatch: weatherResponse.weather.name } }, function(error, docs) {
            if (error != null) {
                response.json({ success: false, message: error })
            }
            else if(docs.length !== 0) {
                response.cookie('userToken', userToken, cookieOptions).json({ success: true, duplicate: true })
            }
            else {
                database.update({ userToken: userToken }, { $addToSet: { cities: weatherResponse.weather.name } }, { upsert: true }, function() {
                    if (error != null) {
                        response.json({ success: false, message: error })
                    }
                    else {
                        response.cookie('userToken', userToken, cookieOptions)
                        response.json(weatherResponse)
                    }
                })
            }
        })
    }
    else {
        response.json(failedResponse)
    }
})

const failedResponse = {
    success: false,
    message: "Error retrieving information from weather server."
}

async function getWeather(url){
    try {
        const response = await fetch(url);
        try {
            const data = await response.json();
            if(data.cod >= 300)
                return { success: false, message: data.message }
                else {
                  return { success: true, weather: data }
                }
        }
        catch (error) {
            return failedResponse
        }
    }
    catch (error) {
        return { success: false, message: error }
    }
}

function getWeatherByName(cityName){
    const requestURL = apiUrl + 'q=' + encodeURI(cityName) + '&appid=' + apiKey;
    return getWeather(requestURL);
}

function getWeatherByCoords(latitude, longitude){
    const requestURL = apiUrl + 'lat=' + encodeURI(latitude) + '&lon=' + encodeURI(longitude) + '&appid=' + apiKey;
    return getWeather(requestURL);
}
