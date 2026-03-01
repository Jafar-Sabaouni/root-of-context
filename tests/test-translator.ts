import {
  parseQueryString,
  translateQuery,
} from "../src/parser/queryTranslator.js";
import assert from "assert";

console.log("Testing parseQueryString...");

const query1 = 'target("auth.ts").blast_radius()';
const parsed1 = parseQueryString(query1);
assert.deepStrictEqual(parsed1, [
  { method: "target", args: ["auth.ts"] },
  { method: "blast_radius", args: [] },
]);

const query2 = "search('some concept').depends_on()";
const parsed2 = parseQueryString(query2);
assert.deepStrictEqual(parsed2, [
  { method: "search", args: ["some concept"] },
  { method: "depends_on", args: [] },
]);

console.log("parseQueryString tests passed.");

console.log("Testing translateQuery...");

const action1 = translateQuery(query1);
assert.deepStrictEqual(action1, [
  { action: "blast_radius", target: "auth.ts" },
]);

const action2 = translateQuery(query2);
assert.deepStrictEqual(action2, [
  { action: "depends_on", search: "some concept" },
]);
const query3 = 'target("user.ts").blast_radius().history()';
const action3 = translateQuery(query3);
assert.deepStrictEqual(action3, [
  { action: "blast_radius", target: "user.ts" },
  { action: "history", target: "user.ts" },
]);

console.log("translateQuery tests passed.");
