import { setWorldConstructor, World } from '@cucumber/cucumber';

export class SimpleWorld extends World {
  public lastOutput: string;

  constructor(options: any) {
    super(options);
    this.lastOutput = '';
  }
}

setWorldConstructor(SimpleWorld);