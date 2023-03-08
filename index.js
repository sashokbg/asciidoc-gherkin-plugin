const asciidoctor = require('asciidoctor')()
const fs = require('fs');

const registry = asciidoctor.Extensions.create()
require('./plugin.js')(registry)

const doc = asciidoctor.loadFile('test.adoc', { 'extension_registry': registry })
const html = doc.convert({ standalone: true });
asciidoctor.convert(html, {to_file: 'test.html', safe: 'safe'})
