const { Log } = require('./dist/index.js');

async function test() {
  await Log("backend", "info", "db", "Test log from middleware initialization.");
  console.log("Log call finished.");
}
test();
