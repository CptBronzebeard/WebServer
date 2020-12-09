const express = require('express')
const fetch = require('node-fetch')
const token = require('rand-token')
const cookieParser = require('cookie-parser')
const app = express()
const Datastore = require('nedb')
const database = new Datastore({ filename: '.data/database', autoload: true })
const defCity = 'Vsevolozhsk';
const pictureUrl = 'http://openweathermap.org/img/wn/'
const apiKey = '3d57646fde7625f581c36b64bd01dcfe';
const apiUrl = 'https://api.openweathermap.org/data/2.5/weather?units=metric&lang=ru&';

app.use(express.json())
app.use(cookieParser())
app.listen(9420)

app.get('/weather/city', async (request, response) => {
    const city = request.query.q
    const weatherResponse = await getWeatherByName(city)

    response.json(weatherResponse)
})

const failedResponse = {
    success: false,
    message: "Couldn't retrieve information from weather server"
}

async function getWeather(url){
    try {
        const response = await fetch(url);
        try {
            const data = await response.json();
            if(data.cod >= 300)
                return { success: false, message: data.message }
            return { success: true, weather: data }
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
