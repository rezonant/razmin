# Razmin [![CircleCI](https://circleci.com/gh/rezonant/razmin.svg?style=svg)](https://circleci.com/gh/rezonant/razmin)


A testing framework for modern Javascript.

```ts
import { suite } from 'razmin';
import { expect } from 'chai';

suite(describe => {
    describe('a widget', it => {
        it('can do things', () => {
            setTimeout(() => {
                expect(3).to.equal(2);
            }, 3 * 1000);
        });
    });
});
```

### What is this?
Razmin runs each of your tests within its own Zone.js zone. Any exception that occurs within your test, even across asynchronous operations, is traced by Razmin and considered a test failure. This means there is no special syntax or ceremony associated with writing your tests in an asynchronous style, and you can use any assertion library you wish, or go without and simply throw exceptions when you wish for your test to fail.

### License

This software is provided under the terms of the MIT License. See LICENSE for details.

### Installation

```sh
npm install razmin --save
```

### Usage

The simplest way to use Razmin is to use the Jasmine-style `suite()` API. When you use `suite()`, all tests you define within the callback you provide will be immediately executed and reported. `suite()` returns a promise which resolves when all the tests in the suite are done executing.

```ts
suite(describe => { /* ... */ })
    .then(() => console.log('Suite has finished executing.'));
```

For bigger test suites, you can split your tests up into multiple files:

test.ts:
```ts
suite(() => {
   import "./tests/foo";
   import "./tests/bar";
});
```

foo.ts:
```ts
suite(describe => {
    describe('foo', it => it('does a thing', () => expect(1).to.equal(1)));
});
```

Nested suite() calls simple extend the top-level test suite.
Or you could execute all of your tests dynamically in Webpack:

```ts
suite(() => {
    const context = require.context('./', true, /\.spec\.ts$/);
    context.keys().map(context);
});
```

Or in Node.js:

```ts

suite(() => {
    require("fs").readdirSync(normalizedPath).forEach((file) => require("./tests/" + file));
});
```

### Contributing

Fork on [Github](http://github.com/rezonant/razmin), file issues, and send pull requests!

### Testing

To test this package:

```npm test```

### Authors

- William Lahti <<wilahti@gmail.com>>

