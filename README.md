# Razmin [![CircleCI](https://circleci.com/gh/rezonant/razmin.svg?style=svg)](https://circleci.com/gh/rezonant/razmin)


A testing framework for modern Javascript.

```ts
import { describe, it } from 'razmin';
import { expect } from 'chai';

describe('timeouts', () => {
    it('can be traced', () => {
        setTimeout(() => {
            expect(3).to.equal(2);
        }, 3 * 1000);
    });
});

// result: 1 failed!
```

## What is this?
Razmin runs each of your tests within its own Zone.js zone. Any exception that occurs within your test, even across asynchronous operations, is traced by Razmin and considered a test failure. This means there is no special syntax or ceremony associated with writing your tests in an asynchronous style, and you can use any assertion library you wish, or go without and simply throw exceptions when you wish for your test to fail.

This is sorely needed for testing highly asynchronous code. Between `done()`, promises, async,
and even generators, it can take a lot of extra code to ensure your tests won't show success 
even if your tests should have failed. Razmin supports all of these styles and does the right 
thing to ensure that errors in the code of your tests always trigger the failure of your tests
by using the power of Zone.js.

The code sample above nicely demonstrates this. Note that there is no `done()` invocation, no
promises involved whatsoever, and yet Razmin is able to see this as a failed test. Traditional frameworks like Jasmine would indicate that the test passed and print an uncaught promise 
rejection. Newer versions of Node.js will cause failure in this scenario, but that still means
the printed results are wrong. 

### Project Goals
- No failure should be misreported as a success (false positives). 
- Reduce the likelihood a developer will fumble on asynchronous testing
- Reduce the ceremony a developer must invoke to accomplish their asynchronous testing
- Produce a testing framework with no impedance mismatch for Typescript developers

### License

This software is provided under the terms of the MIT License. See `LICENSE` for details.

### Installation

```sh
npm install razmin --save
```

### Usage

The simplest way to use Razmin is to use the Jasmine-style API. Razmin is almost entirely drop-in compatible with Jasmine. 

One difference between Razmin and Jasmine is the `suite()` block. Suites are optional, but 
are useful for combining multiple test subjects (`describe()`) into one cohesive test suite for
reporting purposes. Note that you can still nest `describe()` blocks as you would in Jasmine,
but you cannot specify options to Razmin without declaring a `suite()` block.

Each `suite()` block can have nested `suite()` blocks and they all combine to be represented by 
a single test suite at the top level. This relationship exists across `import`/`require` (provided this is the first time that the module was included), so you could directly require your individual test files from a top-level suite block if you wish. 

```ts
suite(() => {
   import "./foo.test";
   import "./bar.test";
});
```

However, few are willing to maintain such a file. Instead, **on Node.js** you could use:

```ts
import { describe } from 'razmin';
suite()
    .include(['**/*.test.js'])
    .run()
;
```

When this is executed, it will instruct Razmin to find and `import` all matching test files 
in the context of the suite you are defining. `run()` causes the tests to be run, results to 
be printed, and the process exited with either success or failure.

**Important**: The file extensions are important here. In most cases you will be running your tests on the compiled Javascript, so `.js` is appropriate. In this case, using patterns ending
with `.ts` **will not execute your tests**.

If you are not running your tests in Node.js you may want to solve this another way. 

In Webpack you might opt to:

```ts
suite(() => {
    const context = require.context('./', true, /\.test\.ts$/);
    context.keys().map(context);
});
```

### Configuration

Any `suite()` call may define the settings of the overall test suite. In the case of nested suites, options in the nested suite are ignored. Pass the options as the second argument of the suite when declaring one, or when using the fluent API, `suite().withOptions({ ... })`.

### Timeouts

By default tests may run for up to 10 seconds before they fail as timed out. Use `executionSettings.timeout` to configure this.

### Reporters

You can define your own reporters. When reporters are specified, Razmin will not print results to the terminal (even if an empty set of reporters is provided). Use the `reporters` option to pass the set of reporters you'd like to use from your root test suite.

### Exit and Report

By default when you execute a suite, either by executing your suite or using `suite().run()`, Razmin will exit the process with either a zero status code (success) or a one status code (failure). You may wish to suppress this, to do so set the `exitAndReport` option to `false`.

### Contributing

Fork on [Github](http://github.com/rezonant/razmin), file issues, and send pull requests!

### Testing

To test this package:

```npm test```

### Authors

- William Lahti <<wilahti@gmail.com>>

