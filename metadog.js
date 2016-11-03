(function() {
	var Metadog = (function() {

		function isEmpty(obj) {
			for (var prop in obj) {
				if (obj.hasOwnProperty(prop))
					return false;
			}
			return true;
		}

		var Metadog = function(document) {
			//options takes in a document tree
			this._document = document;
			this._metadata = {};

			this.schemaConst = {
				'_none'          : 0,
				'_json'          : (1<<1),
				'_openGraphData' : (1<<2),
				'_schemaData'    : (1<<3),
				'_oembed'        : (1<<4),
				'_goodRelations' : (1<<5)
			};

			this._metadata.schema = this.schemaConst['_none'];
		};

		Metadog.prototype.scrape = function scrape(mapping) {
			this._jsonData = {};
			this._schemaData = {};
			this._openGraphData = {};
			this._fetchJSON();
			this._fetchOpenGraph();
			this._fetchSchema();
			this._mapToModel(mapping);

			return this._metadata;
		};

		Metadog.prototype._checkCanonical = function() {
			var link = this._document.querySelector('link[rel="canonical"]');
			if (link)
				return link.href;
			else
				return false;
		};

		Metadog.prototype._fetchJSON = function() {
			var key, data, tags = this._document.querySelectorAll('script[type="application/ld+json"]');
			var isSchema = false;

			for (var i = 0; i < tags.length; i++) {
				data = JSON.parse(tags[i].text);
				isSchema = data['@context'] && data['@context'].indexOf('schema.org') !== -1;
				for (key in data) {
					if(data.hasOwnProperty(key) && key[0] !== '@') {
						if (isSchema)
							this._schemaData[key] = data[key];
						else
							this._jsonData[key] = data[key];
					}
				}
			}
		};

		Metadog.prototype._fetchOpenGraph = function() {
			var tags = this._document.querySelectorAll('[property*="og:"]');

			for (var i = 0; i < tags.length; i++) {
				this._openGraphData[tags[i].getAttribute('property')] = tags[i].content;
			}
		};

		Metadog.prototype._fetchSchema = function() {

			function setProps(set) {
				for (var i = 0; i < set.length; i++) {
					var itemprop = set[i].getAttribute('itemprop');
					if (this._schemaData[itemprop]){
						itemprop = set[i].getAttribute('itemprop') + i;
					}
					if (set[i].getAttribute('content')) {
						this._schemaData[itemprop] = set[i].getAttribute('content').replace(/[\t\r\n]+/g, '');
					} else if (set[i].getAttribute('href') || set[i].getAttribute('src')) {
						this._schemaData[itemprop] = set[i].href? set[i].href: set[i].src;
					}
					else {
						this._schemaData[itemprop] = set[i].textContent;
					}
				}
			}

			// Iterate through the itemscopes
			function setScope(set) {
				var tmpStorage = {};

				for (var i = 0; i < set.length; i++) {
					var prop;
					if (set[i].getAttribute('itemprop')) {
						prop = set[i].getAttribute('itemprop');
					}
					else {
						prop = set[i].getAttribute('itemtype');
					}
					tmpStorage[prop] = [];

					var itemprops = set[i].querySelectorAll('[itemprop]');
					for (var j = 0; j < itemprops.length; j++) {
						var itemprop = itemprops[j].getAttribute('itemprop');
						if (tmpStorage[prop][itemprop]){
							itemprop = itemprops[j].getAttribute('itemprop') + j;
						}
						if (itemprops[j].getAttribute('content')) {
							tmpStorage[prop][itemprop] = itemprops[j].getAttribute('content').replace(/(\t|\r|\n)/g, '');
						} else if (itemprops[j].getAttribute('href') || itemprops[j].getAttribute('src')) {
							tmpStorage[prop][itemprop] = itemprops[j].href? itemprops[j].href: itemprops[j].src;
						}
						else {
							tmpStorage[prop][itemprop] = itemprops[j].textContent.replace(/(\t|\r|\n)/g, '');
						}
					}
				}
				this._schemaData['_itemscope'] = tmpStorage;
			}

			// Process itemprops first
			var itemprops = this._document.querySelectorAll('[itemprop]');
			if (itemprops.length > 0)
				setProps.call(this, itemprops);

			// Process itemscopes
			var itemscopes = this._document.querySelectorAll('[itemscope]');
			if (itemscopes.length > 0)
				setScope.call(this, itemscopes);
		};

		Metadog.prototype._mapToModel = function(mappings) {
			var json = false;
			var opengraph = false;
			var schema = false;

			function setParam(jsonParam, ogParam, schemaParam, metaParam, nestedKey) {
				if (!nestedKey) {
					if (json && this._jsonData[jsonParam]) {
						this._metadata[metaParam] = this._jsonData[jsonParam];
					} else if (schema && this._schemaData[schemaParam]) {
						this._metadata[metaParam] = this._schemaData[schemaParam];
					} else if (opengraph && this._openGraphData[ogParam]) {
						this._metadata[metaParam] = this._openGraphData[ogParam];
					} else {
						console.warn(metaParam + ' not found');
					}
				} else {
					if (!this._metadata[nestedKey]) {
						this._metadata[nestedKey] = {};
					}
					if (json && this._jsonData[jsonParam]) {
						this._metadata[nestedKey][metaParam] = this._jsonData[jsonParam];
					} else if (schema && this._schemaData[schemaParam]) {
						this._metadata[nestedKey][metaParam] = this._schemaData[schemaParam];
					} else if (opengraph && this._openGraphData[ogParam]) {
						this._metadata[nestedKey][metaParam] = this._openGraphData[ogParam];
					} else {
						console.warn(metaParam + ' not found');
					}
				}
			}

			// Find the prominent schema in reverse
			if (!isEmpty(this._openGraphData)) {
				this._metadata.schema = this.schemaConst['_openGraphData'];
				opengraph = true;
			}

			if (!isEmpty(this._schemaData)) {
				this._metadata.schema = this.schemaConst['_schemaData'];
				schema = true;
			}

			if (!isEmpty(this._jsonData)) {
				this._metadata.schema = this.schemaConst['_json'];
				json = true;
			}

			if (this._checkCanonical()) {
				this._metadata.url = this._checkCanonical();
			} else if (opengraph) {
				this._metadata.url = this._openGraphData['og:url'];
			} else if (schema) {
				this._metadata.url = this._schemaData.url;
			} else {
				console.warn('url not found');
			}

			for (var i = 0; i < mappings.length; ++i) {
				setParam.apply(this, mappings[i]);
			}
		};

		Metadog.prototype._isEqual = function(arr1, arr2) {
			if(arr1.length !== arr2.length)
				return false;
			arr1.sort();
			arr2.sort();
			for(var j = 0; j < arr1.length; j++) {
				if(arr2[j].constructor === Array) {
					this._isEqual(arr1[j], arr2[j]);
				} else if(arr2.indexOf(arr1[j]) < 0) {
					return false;
				}
			}
			return true;
		};

		Metadog.prototype._filter = function(ignored, propToCheck) {
			// Check the data passed in to see if we need to ignore that field.
			return (ignored.indexOf(propToCheck) > 0 );
		};

		/**
		 * Internal deep compare method.
		 *
		 * @param proposed
		 * @param current
		 * @param filter
		 * @param comparator
		 * @returns {Boolean}
		 */
		Metadog.prototype._deepCompare = function(proposed, current, filter, comparator) {
			//TODO: currently checks against values directly. Need to implement check for Array types and Object types
			//Objects will have the same method called on them recursively
			var proposedProps = Object.getOwnPropertyNames(proposed);
			var currentProps = Object.getOwnPropertyNames(current);

			for(var i = 0; i < proposedProps.length; i++) {

				var propToCheck = proposedProps[i];
				//skips over ignored properties
				if (filter(propToCheck))
					continue;

				var prop1 = proposed[propToCheck];
				var prop2 = current[propToCheck];
				if(prop1.constructor === Array) {
					if (!comparator(prop1, prop2))
						return false;
				}
				else if (typeof prop1 === 'object') {
					if (this._deepCompare(prop1, prop2, filter, comparator)) {
						continue;
					}
					else {
						return false;
					}
				}
				else if(prop1 !== prop2) {
					return false;
				}
			}
			return true;
		};

		/**
		 * This method performs a deep compare between two objects.
		 * If comparator and/or filter parameters are not set, then the default class comparator object _isEqual is used
		 * and the default class filter object _filter is used.
		 *
		 * @method deepCompare
		 * @param {Object} proposed New Object to compare
		 * @param {Object} current Current (or old) object to compare
		 * @param {Function} filterIgnored Function the performs filtering on fields to ignore or an array of strings for the fields to ignore
		 * @param {Function} comparator Function that performs the comparing
		 * @returns {Boolean}
		 */
		Metadog.prototype.deepCompare = function(proposed, current, filterIgnored, comparator) {
			// We need to make sure that comparator and filter is set as an object Function.
			if (typeof filterIgnored !== 'function') {
				var ignored;
				if (filterIgnored && Object.getPrototypeOf(filterIgnored) === Array.prototype) {
					ignored = filterIgnored;
				}
				filterIgnored = this._filter.bind(null, ignored);
			}

			if (typeof comparator !== 'function') {
				comparator = this._isEqual;
			}

			return this._deepCompare(proposed, current, filterIgnored, comparator);
		};

		/**
		 * Get the schema data that was processed on the page
		 *
		 * @returns {Object}
		 */
		Metadog.prototype.getSchemaData = function() {
			return this._schemaData;
		};

		return Metadog;

	})();

	if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
		// Check for Node.js
		module.exports = Metadog;
	} else {
		//  For AMD Support.
		if (typeof define === 'function' && define.amd) {
			define('metadog', [], function() {
				return Metadog;
			});
		} else {
			// Export to the window scope, for Browser Support.
			window.Metadog = Metadog;
		}
	}
})();
