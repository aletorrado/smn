'use strict';
var domain = require('domain');

var request = require('request');
var cheerio = require('cheerio');
var async = require('async');
var unorm = require('unorm');
var lodash = require('lodash');

var spots = require('./spots.json');
var icons = require('./icons.json');

function normalizeString(str){
	var combining = /[\u0300-\u036F]/g;
	return unorm.nfkd(str).replace(combining, '');
}

function toTitleCase(str) {
	return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

function translateIcon(value) {
	return icons[value] || null;
}

var tempSymbol = String.fromCharCode(65533); // latin1 temperature symbol

function live(id, callback){
	var prevDomain = process.domain || domain.create();
	callback = prevDomain.bind(callback);
	domain
	.create()
	.on('error', callback)
	.run(function(){
		request.get({
			url: 'http://www.smn.gov.ar/mobile/estado_movil.php',
			qs: {
				ciudad: id.split("-")[1]
			}
		}, function(err, res, data){
			if (err) {
				return callback(err);
			}
			if (/Sin informac/.test(data)) {
				return callback();
			}
			var $ = cheerio.load(data);
			var data = {
				id: id,
				temperature: parseFloat($('.temp_grande').text().split(tempSymbol)[0]),
				feelsLike: parseFloat($('table.texto_temp_chico tr').slice(0, 1).find('td').slice(-1).text().split(tempSymbol)[0]) || null,
				visibility: $('table.texto_temp_chico tr').slice(1, 2).find('td').slice(-1).text(),
				humidity: parseFloat($('table.texto_temp_chico tr').slice(2, 3).find('td').slice(-1).text().trim().split(' ')[0]),
				pressure: parseFloat($('table.texto_temp_chico tr').slice(3, 4).find('td').slice(-1).text().split(' ')[0]),
				windSpeed: $('table.texto_temp_chico tr').slice(4, 5).find('td').slice(-1).text(),
				status: $('.temp_texto').text(),
				icon: translateIcon($('img[width=120px]').attr('src'))
			};
			var numberFields = ['temperature', 'feelsLike', 'humidity', 'pressure'];
			var stringFields = ['visibility', 'windSpeed', 'status', 'icon'];
			lodash.values(lodash.pick(data, numberFields)).forEach(function(x){
				if (isNaN(x)) {
					throw new Error("Parsing error: " + JSON.stringify(data));
				}
			});
			lodash.values(lodash.pick(data, stringFields)).forEach(function(x){
				if (!x) {
					throw new Error("Parsing error: " + JSON.stringify(data));
				}
			});
			callback(null, data);
		});
	});
}

function forecast(id, callback){
	var prevDomain = process.domain || domain.create();
	callback = prevDomain.bind(callback);
	var spot = lodash.find(spots, {id: id});
	domain
	.create()
	.on('error', callback)
	.run(function(){
		request.get({
			url: 'http://www.smn.gov.ar/mobile/pronostico_movil.php',
			qs: {
				provincia: id.split("-")[0],
				ciudad: id.split("-")[1]
			}
		}, function(err, res, data){
			if (err) {
				throw err;
			}
			// Common error
			if (/Undefined variable/.test(data)) {
				throw new Error("Parsing error.");
			}
			var $ = cheerio.load(data);
			var forecast = $('[name=prondia],[id=pron2]').map(function(){
				var dayCode = $(this).find('table td').slice(0, 1).text();
				var rows = $(this).find('table').slice(-1).find('tr');
				// if only forecast for afternoon (same day forecast)
				if (rows.length == 3) {
					var afternoonIcon = $(this).find('h5').slice(0, 1).find('img').attr('src')//.split('/').slice(-1)[0].split(".")[0];
					return {
						dayCode: dayCode,
						afternoonIcon: translateIcon(afternoonIcon),
						afternoonDescription: $(this).find('p.texto_blanco').slice(0, 1).text(),
					};
				// else if forecast for morning and afternoon (any other day)
				} else if (rows.length == 5) {
					var morningIcon = $(this).find('h5').slice(0, 1).find('img').attr('src')//.split('/').slice(-1)[0].split(".")[0];
					var afternoonIcon = $(this).find('h5').slice(1, 2).find('img').attr('src')//.split('/').slice(-1)[0].split(".")[0];
					return {
						dayCode: dayCode,
						min: parseFloat(rows.slice(0, 1).find('td').slice(1, 2).text().split('°')[0]),
						max: parseFloat(rows.slice(1, 2).find('td').slice(1, 2).text().split('°')[0]),
						morningIcon: translateIcon(morningIcon),
						afternoonIcon: translateIcon(afternoonIcon),
						morningDescription: $(this).find('p.texto_blanco').slice(0, 1).text(),
						afternoonDescription: $(this).find('p.texto_blanco').slice(1, 2).text(),
					};
				} else {
					throw new Error("Parsing error.");
				}
			}).get();
			callback(null, {id: id, forecast: forecast});
		});
	});
}

function noErrors(f){
	var me = this;
	return function(args){
		args = Array.prototype.slice.call(arguments);
		var callback = args[args.length - 1];
		args[args.length - 1] = function(err, data){
			callback(null, err ? null : data);
		}
		f.apply(me, args);
	}
}

function compactResults(callback){
	return function(err, data){
		callback(null, lodash.compact(data));
	}
}

function liveAll(options, callback){
	if (typeof options == 'function') {
		callback = options;
	}
	var ids = lodash.map(lodash.filter(spots, {live: true}), 'id');
	async.map(ids, noErrors(live), compactResults(callback));
}

function forecastAll(options, callback){
	if (typeof options == 'function') {
		callback = options;
	}
	var ids = lodash.map(spots, 'id');
	async.map(ids, noErrors(forecast), compactResults(callback));
}

function liveWithForecast(callback){
	liveAll(function(err, liveData){
		if (err) {
			return callback(err);
		}
		async.map(lodash.map(liveData, 'id'), noErrors(forecast), compactResults(function(err, forecastData){
			var res = lodash.values(lodash.merge(lodash.keyBy(liveData, 'id'), lodash.keyBy(forecastData, 'id')));
			callback(null, res);
		}));
	});
}

module.exports.live = live;
module.exports.liveAll = liveAll;
module.exports.forecast = forecast;
module.exports.forecastAll = forecastAll;
module.exports.liveWithForecast = liveWithForecast;
module.exports.spots = spots;

if (module.parent) {
	return;
}

/* ICONOS ENCONTRADOS EN EL LIVE */

var liveIcons = require('./liveicons.json');

/* ICONOS ENCONTRADOS EN EL FORECAST */

var foreIcons = require('./foreicons.json');

console.log(spots.length, 'spots');

forecastAll(function(err, data){
	console.log("FORECAST");
	console.log(data);
	console.log(data.length);
	return;
	var lenBefore = foreIcons.length;
	data.forEach(function(spot){
		spot.forecast.forEach(function(forecast){
			if (forecast.morningIcon) {
				foreIcons.push(forecast.morningIcon)
			}
			if (forecast.afternoonIcon) {
				foreIcons.push(forecast.afternoonIcon)
			}
		})
	})
	foreIcons = lodash.uniq(foreIcons);
	if (lenBefore != foreIcons.length) {
		console.log(foreIcons);
		console.log(lenBefore, 'iconos antes.', foreIcons.length, 'iconos despues.');
	}
	require('fs').writeFile('./foreicons.json', JSON.stringify(foreIcons));
});

liveAll(function(err, data){
	console.log("LIVE");
	console.log(data);
	console.log(data.length);
	return;
	var lenBefore = liveIcons.length;
	data.forEach(function(spot){
		liveIcons.push(spot.icon);
	});
	liveIcons = lodash.uniq(liveIcons);
	if (lenBefore != liveIcons.length) {
		console.log(liveIcons);
		console.log(lenBefore, 'iconos antes.', liveIcons.length, 'iconos despues.');
	}
	require('fs').writeFile('./liveicons.json', JSON.stringify(liveIcons));
});
