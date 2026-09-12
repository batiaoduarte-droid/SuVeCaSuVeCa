import fs from 'node:fs';
import assert from 'node:assert/strict';
import Ajv2020 from 'ajv/dist/2020.js';

const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const schema = read('schemas/pbl-published-package.schema.json');
const validate = new Ajv2020({ strict: false, allErrors: true }).compile(schema);
const packages = read('public/knowledge/pbl/pbl_authored_packages.json');
const competencies = new Map(read('public/knowledge/pbl/pbl_competency_map.json').map((item) => [item.competencyId, item]));
const units = new Set(fs.readdirSync('public/knowledge/pedagogical/views').filter((file) => file.startsWith('IP-')).map((file) => file.slice(0, -5)));
assert.ok(Array.isArray(packages) && packages.length > 0, 'Published packages missing');
const ids = new Set();
const assigned = new Set();
for (const item of packages) {
  assert.ok(validate(item), `${item.packageId}: ${JSON.stringify(validate.errors)}`);
  assert.ok(!ids.has(item.packageId), `Duplicate package: ${item.packageId}`);
  assert.ok(!assigned.has(item.competencyRef), `Duplicate package competency: ${item.competencyRef}`);
  const competency = competencies.get(item.competencyRef);
  assert.ok(competency, `Unknown competency: ${item.competencyRef}`);
  assert.ok(units.has(item.unitId), `Unknown unit: ${item.unitId}`);
  assert.equal(item.unitId, competency.unitId, `Package unit mismatch: ${item.packageId}`);
  ids.add(item.packageId);
  assigned.add(item.competencyRef);
}
assert.equal(assigned.size, competencies.size, 'Published package coverage incomplete');
// Review decisions belong to the factory. This checks the published contract,
// never invents approval or requires external ledgers to run the application.
console.log(JSON.stringify({ status: 'ok', packages: ids.size, competencies: assigned.size }));
