'use strict';
var request = require('request');
var cheerio = require('cheerio');

function toTitleCase(str) {
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

module.exports = function(callback){
	request.get('http://www.smn.gov.ar/?mod=dpd&id=27', {timeout: 1000}, function(err, res, data){
		if (err) {
			return callback(err);
		}
		var $ = cheerio.load(data);
		var result = $('table.bordered').find('tr').slice(1).map(function(){
			var row = $(this);
			var city = toTitleCase(row.find('td').slice(1, 2).text());
			var state = toTitleCase(row.find('td').slice(2, 3).text());
			var temperature = parseFloat(row.find('td').slice(3, 4).text().split(" ")[0]);
			var feelsLike = parseFloat(row.find('td').slice(4, 5).text().split(" ")[0]) || temperature;
			var humidity = parseFloat(row.find('td').slice(5, 6).text().split(" ")[0]);
			return {
				city: city,
				state: state,
				temperature: temperature,
				feelsLike: feelsLike,
				humidity: humidity
			};
		}).get();
		callback(null, result);
	});
}
