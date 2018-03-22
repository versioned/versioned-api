const u = require('lib/util')

// Code borrowed and slightly modified from:
// https://github.com/cho45/micro-template.js/blob/master/lib/micro-template.js
// Original implementation by John Resig:
// https://johnresig.com/blog/javascript-micro-templating/
function template (id, data) {
	var me = arguments.callee;
	data = Object.assign({}, data, {u, template}) // Allow nested templates (includes)
	if (!me.cache[id]) me.cache[id] = (function () {
		var name = id, string = /^[\w._\/-]+$/.test(id) ? me.get(id): (name = 'template(string)', id); // no warnings
		var line = 1, body = (
			"try { " +
				(me.variable ?  "var " + me.variable + " = this.stash;" : "with (this.stash) { ") +
					"this.ret += '"  +
					string.
						replace(/<%/g, '\x11').replace(/%>/g, '\x13'). // if you want other tag, just edit this line
						replace(/'(?![^\x11\x13]+?\x13)/g, '\\x27').
						replace(/^\s*|\s*$/g, '').
						replace(/\n|\r\n/g, function () { return "';\nthis.line = " + (++line) + "; this.ret += '\\n" }).
						replace(/\x11=raw(.+?)\x13/g, "' + ($1) + '").
						replace(/\x11=(.+?)\x13/g, "' + this.escapeHTML($1) + '").
						replace(/\x11(.+?)\x13/g, "'; $1; this.ret += '") +
				"'; " + (me.variable ? "" : "}") + "return this.ret;" +
			"} catch (e) { throw 'TemplateError: ' + e + ' (on " + name + "' + ' line ' + this.line + ')'; } " +
			"//@ sourceURL=" + name + "\n" // source map
		).replace(/this\.ret \+= '';/g, '');
		var func = new Function(body);
		var map  = { '&' : '&amp;', '<' : '&lt;', '>' : '&gt;', '\x22' : '&#x22;', '\x27' : '&#x27;' };
		var escapeHTML = function (string) { return (''+string).replace(/[&<>\'\"]/g, function (_) { return map[_] }) };
		return function (stash) { return func.call(me.context = { escapeHTML: escapeHTML, line: 1, ret : '', stash: stash }) };
	})();
	return data ? me.cache[id](data) : me.cache[id];
}

template.cache = {};

TEMPLATE_DIR = 'app/templates'

function filename(id) {
	return id.includes('.') ? id : (id + '.html')
}

template.get = function (id) {
  return require('fs').readFileSync(TEMPLATE_DIR + '/' + filename(id), 'utf-8')
}

function withLayout(id, data, layout) {
	const content = template(id, data || {})
	return template(layout, {content})
}

function withCharset(mimeType) {
	return mimeType + '; charset=utf-8'
}

function render(res, id, data, options) {
	data = data || {}
	options = Object.assign({layout: 'layout'}, options)
	const body = options.layout ? withLayout(id, data, options.layout) : template(id, data)
	res.writeHead(200, {'Content-Type': withCharset(u.mimeType(filename(id)))})
  res.end(body)
}

function render404(res) {
	res.writeHead(404, {'Content-Type': withCharset('text/html')})
  res.end('Not Found')
}

module.exports = {
	template,
	withLayout,
	render,
	render404
}
