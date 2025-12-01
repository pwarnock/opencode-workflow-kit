const { setWorldConstructor, World } = require('@cucumber/cucumber');

class SimpleWorld extends World {
  constructor(options) {
    super(options);
    this.lastOutput = '';
  }
}

setWorldConstructor(SimpleWorld);

module.exports = { SimpleWorld };