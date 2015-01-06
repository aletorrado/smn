'use strict';
var request = require('request');
var cheerio = require('cheerio');
var async = require('async');
var unorm = require('unorm');
var lodash = require('lodash');

var spots = require('./spots.json');

function normalizeString(str){
	var combining = /[\u0300-\u036F]/g;
	return unorm.nfkd(str).replace(combining, '');
}

function toTitleCase(str) {
	return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

var tempSymbol = String.fromCharCode(65533); // latin1 temperature symbol

function live(id, callback){
	request.get({
		url: 'http://www.smn.gov.ar/mobile/estado_movil.php',
		qs: {
			ciudad: id
		}
	}, function(err, res, data){
		if (err) {
			return callback(err);
		}
		if (/Sin informac/.test(data)) {
			return callback();
		}
		var $ = cheerio.load(data);
		callback(null, {
			id: id,
			temperature: parseFloat($('.temp_grande').text().split(tempSymbol)[0]),
			feelsLike: parseFloat($('table.texto_temp_chico tr').slice(0, 1).find('td').slice(-1).text().split(tempSymbol)[0]) || null,
			visibility: parseFloat($('table.texto_temp_chico tr').slice(1, 2).find('td').slice(-1).text().split(' ')[0]),
			humidity: parseFloat($('table.texto_temp_chico tr').slice(2, 3).find('td').slice(-1).text().trim().split(' ')[0]),
			pressure: parseFloat($('table.texto_temp_chico tr').slice(3, 4).find('td').slice(-1).text().split(' ')[0]),
			windSpeed: $('table.texto_temp_chico tr').slice(4, 5).find('td').slice(-1).text(),
			status: $('.temp_texto').text(),
			icon: $('img[width=120px]').attr('src').split("/")[2].split(".")[0]
		});
	});
}

function liveAll(callback){
	var ids = lodash.pluck(lodash.filter(spots, {live: true}), 'id');
	async.map(ids, live, callback);
}

// function printCallback(err, data){
// 	console.log(err || data);
// }

// liveAll(printCallback);

module.exports.live = live;
module.exports.liveAll = liveAll;
module.exports.spots = spots;
