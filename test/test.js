var assert = require('assert');
var Metadog = require('../metadog');
var jsdom = require('jsdom');

//further tests should test not just when it works, but also when it doesn't

describe('Metadog', function() {
	describe('initialize()', function(){
		before(function(done){
			jsdom.env('http://www.shareroot.co', function(err, window){
				global.metadog = new Metadog(window.document);
				done();
			});
		});
		it('should take a document object', function(){
			assert.ok(metadog._document);
		});
		it('should have a default schema type of 0', function(){
			assert.equal(metadog._metadata.schema, 0);
		});
		// it('should have containers for meta data', function(){
		// 	assert.ok(metadog._metadata);
		// 	assert.ok(metadog._jsonData);
		// 	assert.ok(metadog._schemaData);
		// 	assert.ok(metadog._openGraphData);
		// });
	});

	describe('fetchJSON', function(){
		before(function(done){
			jsdom.env('https://srdevstore.myshopify.com/products/the-dog', function(err, window){
				global.metadog = new Metadog(window.document);
				global._window = window;
				metadog._fetchJSON();
				done();
			});
		});
		it('should match the metadata on the page', function(){
			var fakeData = {
				name: "The Dog",
				image: "https://cdn.shopify.com/s/files/1/1503/3802/products/gkFz94iq_grande.jpg?v=1474469572",
				description: "Dog says `Hello!`",
				url: "https://srdevstore.myshopify.com/products/the-dog",
				type: "product",
				extra: {
					price: "99.00",
					priceCurrency: "UAH",
					availability: "instock"
				}
			}
			var nodes =	 _window.document.querySelectorAll('script[type="application/ld+json"]');
			var JSONData = JSON.parse(nodes[0].innerHTML);
			var isSchema = JSONData['@context'] && JSONData['@context'] === 'http://schema.org'? true:false;
			for (var key in JSONData){
				if (key[0] === '@')
					delete JSONData[key];
			}
			if (isSchema)
				assert.deepEqual(metadog._schemaData, fakeData);
			else {
				assert.deepEqual(metadog._jsonData, fakeData);
			}
		});
	});

	describe('fetchOpenGraph', function(){
		before(function(done){
			jsdom.env('http://www.shareroot.co', function(err, window){
				global.metadog = new Metadog(window.document);
				global._window = window;
				metadog._fetchOpenGraph();
				done();
			});
		});
		it('should match the metadata on the page', function(){
			var nodes = _window.document.querySelectorAll('[property*="og:"]');
			var ogMetaData = {};
			for(key in nodes){
				ogMetaData[nodes[key].getAttribute('property')] = nodes[key].content;
			}
			assert.deepEqual(metadog._openGraphData, ogMetaData);
		});
	});

	describe('fetchSchema', function(){
		// Tougher to test, more involved process of acquiring data
	});

	describe('isEqual', function(){
		before(function(done){
			global.metadog = new Metadog();
		});
		it('should return true if the arrays have the same values', function(){

		});
	});

	describe('mapToModel', function(){
		before(function(done){
			jsdom.env('http://www.shareroot.co', function(err, window){
				global.metadog = new Metadog(window.document);
				global._window = window;
				metadog._fetchJSON();
				metadog._fetchOpenGraph();
				metadog._mapToModel(mappings);
				done();
			});
		});
	});

	describe('scrape()', function() {
		before(function(done){
			jsdom.env('http://www.shareroot.co', function(err, window){
				global.metadog = new Metadog(window.document);
				done();
			});
		});
		it('should..', function(){

		});
	});
	describe('deepCompare()', function(){
		it('should accept filters', function(){

		});
		it('should accept an alternate comparator', function(){

		});
	});
});
