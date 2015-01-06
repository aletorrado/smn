'use strict';
var request = require('request');
var cheerio = require('cheerio');
var async = require('async');
var unorm = require('unorm');
var lodash = require('lodash');

function normalizeString(str){
	var combining = /[\u0300-\u036F]/g;
	return unorm.nfkd(str).replace(combining, '');
}

function toTitleCase(str) {
	return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

var cities = [
	'Aeroparque Buenos Aires', 'Buenos Aires',
	'9 de Julio', 'Avellaneda', 'Azul', 'Bahía Blanca', 'Balcarce', 'Banfield', 'Benito Juárez', 'Bolívar', 'Carmen de Patagones', 'Chacabuco', 'Chascomús', 'Ciudad Evita', 'Coronel Pringles', 'Coronel Suarez', 'Dolores', 'Don Torcuato', 'El Palomar', 'Ezeiza', 'General Villegas', 'Junín', 'La Plata', 'Las Flores', 'Lomas de Zamora', 'Maipú', 'Mar del Plata', 'Merlo', 'Miramar', 'Monte Hermoso', 'Morón', 'Necochea', 'Olavarría', 'Pehuajó', 'Pergamino', 'Pigué', 'Pinamar', 'Punta Indio B.A.', 'Quilmes', 'San Andrés', 'San Antonio de Areco', 'San Bernardo', 'San Clemente del Tuyú', 'San Fernando', 'San Isidro', 'San Miguel', 'San Pedro', 'Santa Teresita', 'Tandil', 'Tigre', 'Trenque Lauquen', 'Tres Arroyos', 'Villa Gesell', 'Zárate',
	'Andalgalá', 'Belén', 'Catamarca', 'Santa María', 'Tinogasta',
	'General José de San Martín', 'Pcia. Roque Saenz Peña', 'Resistencia', 'Villa Angela',
	'Comodoro Rivadavia', 'Esquel', 'Paso De Indios', 'Puerto Madryn', 'Rawson', 'Trelew',
	'Almafuerte', 'Alta Gracia', 'Bell Ville', 'Córdoba', 'Córdoba Observatorio', 'Coronel Moldes', 'Cosquín', 'Cruz del Eje', 'La Carlota', 'Laboulaye', 'Marcos Juárez', 'Mina Clavero', 'Pilar Obs.', 'Río Cuarto', 'Río Tercero', 'San Francisco', 'Villa Dolores', 'Villa General Belgrano', 'Villa Huidobro', 'Villa María', 'Villa María Del Río Seco',
	'Corrientes', 'Curuzú Cuatiá', 'Empedrado', 'Goya', 'Ituzaingó', 'Monte Caseros', 'Paso De Los Libres',
	'Colón', 'Concepción del Uruguay', 'Concordia', 'Gualeguay', 'Gualeguaychú', 'La Paz', 'Paraná',
	'Clorinda', 'Formosa', 'Las Lomitas', 'Pirane',
	'Puerto Argentino',
	'Humahuaca', 'Jujuy', 'La Quiaca', 'Libertador General San Martín', 'Palpalá', 'Perico', 'San Pedro (J)',
	'25 de Mayo', 'Eduardo Castex', 'General Acha', 'General Pico', 'Intendente Alvear', 'Santa Rosa',
	'Aimogasta', 'Chamical', 'Chepes', 'Chilecito', 'La Rioja',
	'General Alvear', 'Malargue', 'Mendoza', 'Mendoza Observatorio', 'Punta de Vacas', 'San Carlos', 'San Martín (Mza)', 'San Rafael', 'Tunuyán', 'Uspallata',
	'Apóstoles', 'Bernardo de Irigoyen', 'Eldorado', 'Iguazú', 'Oberá', 'Posadas',
	'Chapelco', 'Cutral Co', 'Neuquén', 'San Martín de los Andes', 'Villa La Angostura', 'Zapala',
	'Bariloche', 'Choele Choel', 'Cipolletti', 'El Bolsón', 'General Roca', 'Maquinchao', 'Río Colorado', 'San Antonio Oeste', 'Viedma', 'Villa Regina',
	'Metán', 'Orán', 'Rivadavia', 'Salta', 'Tartagal',
	'Caucete', 'Jachal', 'San Juan',
	'J. Daract', 'La Toma', 'Merlo (SL)', 'San Luis', 'Santa Rosa del Conlara', 'Villa Reynolds',
	'Caleta Olivia', 'El Calafate', 'Gobernador Gregores', 'Perito Moreno', 'Puerto Deseado', 'Río Gallegos', 'San Julián', 'Santa Cruz',
	'Casilda', 'Ceres', 'El Trébol', 'Las Rosas', 'Melincué', 'Rafaela', 'Reconquista', 'Rosario', 'San Cristóbal', 'San Javier', 'Santa Fe', 'Sastre', 'Sunchales', 'Tostado', 'Venado Tuerto',
	'Añatuya', 'Frías', 'Santiago del Estero', 'Termas de Río Hondo',
	'Río Grande B.A.', 'Tolhuin', 'Ushuaia',
	'Aguilares', 'Concepción', 'Tafí Viejo', 'Tucumán'
];

// this are cities registered in SMN but inactive
var noDataCities = [ '9 de Julio', 'Avellaneda', 'Banfield', 'Balcarce', 'Carmen de Patagones', 'Ciudad Evita', 'Chacabuco', 'Chascomús', 'General Villegas', 'Don Torcuato', 'Lomas de Zamora', 'Maipú', 'Necochea', 'Miramar', 'Monte Hermoso', 'Pergamino', 'Pinamar', 'Punta Indio B.A.', 'Quilmes', 'San Andrés', 'San Antonio de Areco', 'San Bernardo', 'San Clemente del Tuyú', 'San Isidro', 'Santa Teresita', 'San Pedro', 'Tigre', 'Zárate', 'Andalgalá', 'Belén', 'Santa María', 'General José de San Martín', 'Villa Angela', 'Rawson', 'Almafuerte', 'Alta Gracia', 'Bell Ville', 'Cruz del Eje', 'La Carlota', 'Cosquín', 'Coronel Moldes', 'Mina Clavero', 'San Francisco', 'Río Tercero', 'Villa María', 'Villa Huidobro', 'Villa General Belgrano', 'Curuzú Cuatiá', 'Empedrado', 'Goya', 'Concepción del Uruguay', 'Colón', 'La Paz', 'Gualeguay', 'Clorinda', 'Pirane', 'Puerto Argentino', 'Humahuaca', 'Palpalá', 'Libertador General San Martín', 'Perico', 'San Pedro (J)', '25 de Mayo', 'Eduardo Castex', 'General Acha', 'Intendente Alvear', 'Aimogasta', 'General Alvear', 'San Carlos', 'Punta de Vacas', 'Tunuyán', 'Apóstoles', 'Eldorado', 'Cutral Co', 'Zapala', 'Villa La Angostura', 'San Martín de los Andes', 'Choele Choel', 'General Roca', 'Villa Regina', 'Caucete', 'J. Daract', 'La Toma', 'Merlo (SL)', 'Caleta Olivia', 'Casilda', 'Las Rosas', 'Melincué', 'San Cristóbal', 'San Javier', 'Tostado', 'Sastre', 'Añatuya', 'Frías', 'Tolhuin', 'Concepción', 'Tafí Viejo', 'Aguilares' ];

var tempSymbol = String.fromCharCode(65533);

function fromCity(city, callback){
	request.get({
		url: 'http://www.smn.gov.ar/mobile/estado_movil.php',
		qs: {
			ciudad: normalizeString(city.replace(/ /g, '_'))
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
			city: city,
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

function fetchAll(callback){
	async.map(lodash.difference(cities, noDataCities), fromCity, callback);
}

// function printCallback(err, data){
// 	console.log(err || data);
// }

// fetchAll(printCallback);

module.exports.fromCity = fromCity;
module.exports.fetchAll = fetchAll;