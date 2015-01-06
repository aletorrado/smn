Basic scraper for Servicio Meteorológico Nacional.
=====================

Usage
---------------------

#### Weather for one city

    var smn = require('smn');
    smn.fromCity('Buenos Aires', function(err, weather){
        if (err) {
            return console.log(err && err.stack || err);
        }
        console.log(weather);
    });
    
    // output
    {
        city: 'Buenos Aires',
        temperature: 25.8,
        feelsLike: null,
        visibility: 10,
        humidity: 84,
        pressure: 1005.8,
        windSpeed: 'Norte  11 Km/h',
        status: 'Nublado',
        icon: 'nublado'
    }
    
#### Fetching weather for every city

    var smn = require('smn');
    smn.fetchAll(function(err, array){
        if (err) {
            return console.log(err && err.stack || err);
        }
        console.log(array); // logs an array of weather objects
    });