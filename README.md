# Razmin [![CircleCI](https://circleci.com/gh/rezonant/razmin.svg?style=svg)](https://circleci.com/gh/rezonant/razmin)


A testing framework for modern Javascript.

```ts
import { describe, it } from 'razmin';

describe('timeouts', () => {
    it('can be traced', () => {
        setTimeout(() => {
            throw new Error("fail");
        }, 3 * 1000);
    });
});

// result: 1 failed!
```

## What is this?
Razmin runs each of your tests within its own Zone.js zone. Any exception that occurs within your 
test, even across asynchronous operations, is traced by Razmin and considered a test failure. This 
means there is no special syntax or ceremony associated with writing your tests in an asynchronous 
style, and you can use any assertion library you wish, or go without and simply throw exceptions when 
you wish for your test to fail.

This is sorely needed for testing highly asynchronous code. Between `done()`, promises, async,
and even generators, it can take a lot of extra code to ensure your tests won't show success 
even if your tests should have failed. Razmin supports all of these styles and does the right 
thing to ensure that errors in the code of your tests always trigger the failure of your tests
by using the power of Zone.js.

The code sample above nicely demonstrates this. Note that there is no `done()` invocation, no
promises involved whatsoever, and yet Razmin knows to wait for the timeout to complete, and detects 
the exception causing the test to fail. Traditional frameworks like Jasmine would indicate that the 
test passed with no indication. 

Here's the same test ran as a Jasmine spec:
```
> jasmine
Randomized with seed 65397
Started
.


1 spec, 0 failures
Finished in 0.006 seconds
Randomized with seed 65397 (jasmine --random=true --seed=65397)
```

And here's the same test ran as a Mocha test:
```
> mocha spec/**.js


  thing
    √ is so


  1 passing (6ms)

.\spec\exampleSpec.js:4
                        throw new Error('fail');
                        ^

Error: fail
    at Timeout.setTimeout [as _onTimeout] (.\spec\exampleSpec.js:4:10)
    at ontimeout (timers.js:427:11)
    at tryOnTimeout (timers.js:289:5)
    at listOnTimeout (timers.js:252:5)
    at Timer.processTimers (timers.js:212:10)
mocha-test> echo $?
False
mocha-test>
```

Mocha does better than Jasmine by not forcing an exit upon completion of the test suite.
Node.js itself will normally wait for async tasks to complete before ending the process.
Mocha simply does not exit after printing it's results, which means that Node.js reports the 
uncaught exception and the exit code becomes non-zero, so this would be caught in a typical 
continuous integration flow, but there's no traceability into which test caused the exception, and 
custom reporters would have no access to the failure information.

## Project Goals
- No false positives: No test should pass when it shouldn't have, and any type of test failure we 
  can detect should be detected
- Ease of use: Reduce the ceremony needed for async unit testing
- Clarity: Reduce the chance that a developer will fumble on asynchronous testing
- Modern: No impedance mismatch for ES6/Typescript developers

## Is it ready?

Consider Razmin to be beta quality as of version 0.5.2. 

## Installation

```sh
npm install razmin --save-dev
```

## Usage

The simplest way to use Razmin is to use the Jasmine/Mocha-style API. 

Razmin tests are run imperatively. There's no top level CLI to run, instead you execute a test script 
which either contains your tests or loads your tests from other scripts. `describe()` blocks are self 
executing, and the result of each test is automatically coalesced into the final test results. The 
individual tests (defined with `it()` blocks) are collected and run once all `describe()` blocks have 
run.

A notable addition over the Jasmine/Mocha test running model is the `suite()` block. Suites are 
optional, but are useful for combining multiple test subjects (`describe()` blocks) into a single 
test suite for reporting purposes. Note that you can still nest `describe()` blocks as you would in 
Jasmine, but you cannot specify options to Razmin without declaring a `suite()` block.

Each `suite()` block can have nested `suite()` blocks and they all combine to be represented by 
a single test suite at the top level. This relationship holds across `require()` calls (provided this 
is the first time that the module was included), so you could directly require your individual test 
files from a top-level suite block if you wish. 

```ts
suite(() => {
   require("./foo.test");
   require("./bar.test");
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

When this is executed, it will instruct Razmin to find and `require()` all matching test files 
in the context of the suite you are defining. `run()` causes the tests to be run, results to 
be printed, and the process exited with either success or failure.

**Important**: The file extensions are important here. In most cases you will be running your tests 
on the compiled Javascript, so `.js` is appropriate. In this case, using patterns ending
with `.ts` will not execute your tests, even if they were originally authored as Typescript.

If you are not running your tests in Node.js you may want to solve this another way. 

In Webpack you might opt to:

```ts
suite(() => {
    const context = require.context('./', true, /\.test\.ts$/);
    context.keys().map(context);
});
```

### Skipping Tests

To skip a test, change the `it()` block to be `it.skip()`. This serves the same purpose as Jasmine's 
`xit()` variant. You can also import the `skip()` function and call it in your test to skip your test dynamically.

### Running a single test

You may wish to run a single test instead of the whole suite. Change any `it()` block to be 
`it.only()`. If there is at least one `it.only()` in your suite, then only the tests declared with 
`it.only()` will be run.

### Setup and Teardown using before/after

You can specify code that should run before or after all tests within the same describe() block 
(and all nested `describe()` blocks). Use `before()` and `after()`:

```typescript
import { describe, before, after } from 'razmin';

describe('a thing', it => {
    before(() => console.log('before'))
    after(() => console.log('after'))
    it('works', () => console.log('works'))
    it('also works', () => console.log('also works'))
})

// Console output:
//   before
//   works
//   after
//   before
//   also works
//   after
```

### Unhandled Promise Rejections

**Razmin does not (yet!) detect unhandled promise rejections, which are not caused by exceptions, on 
any platform.** There is experimental support in the codebase, but it is not yet ready for use.

## Configuration

Any `suite()` call may define the settings of the overall test suite. In the case of nested suites, 
options in the nested suite are ignored. Pass the options as the second argument of the suite when 
declaring one, or when using the fluent API, `suite().withOptions({ ... })`.

### Timeouts

By default tests may run for up to 10 seconds before they fail as timed out. Use 
`executionSettings.timeout` to configure this.

### Ordering

By default Razmin runs tests in the exact order they are declared (following load order). You can 
also enable random ordering by setting `executionSettings.order` to `"random"`. Should you do so,
you can also specify the random seed to use with `executionSettings.orderSeed`. If you do not specify
a seed, one will be randomly selected for you.

### Reporters

You can define your own reporters. When reporters are specified, Razmin will not print results to the 
terminal (even if an empty set of reporters is provided). Use the `reporters` option to pass the set 
of reporters you'd like to use from your root test suite.

The default console reporter is exported as `ConsoleReporter`. That reporter outputs all test results in a long-style format. See `ConsoleDotsReporter` for a shorter test output, where each passed test shows as a dot (.), skipped tests show as an "S", and failed tests show as "F".

### Exit and Report

By default when you execute a suite, either by executing your suite or using `suite().run()`, Razmin 
will exit the process with either a zero status code (success) or a one status code (failure). You 
may wish to suppress this, to do so set the `exitAndReport` option to `false`.

## Contributing

Fork on [Github](http://github.com/rezonant/razmin), file issues, and send pull requests!

## Testing

To test this package:

```npm test```

The test suite is comprised of a set of "sanity tests" which are not dependent on Razmin, and an
extended test suite which does depend on Razmin. The sanity tests are where core assumptions are 
tested, and the extended test suite tests everything else.

## License

This software is provided under the terms of the MIT License. See `LICENSE` for details.

## Authors

- William Lahti <<wilahti@gmail.com>>

