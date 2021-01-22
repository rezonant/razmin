# Razmin [![CircleCI](https://circleci.com/gh/rezonant/razmin.svg?style=svg)](https://circleci.com/gh/rezonant/razmin)

An async-aware testing framework for modern Javascript.

```ts
import { describe, it } from 'razmin';

describe('timeouts', () => {
    it('can be traced', () => { // <-- look, no done() is needed!
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
continuous integration flow, and in this case we can see what spec caused the issue, but 
depending on the scenario, there may or may not be any visibility into which test caused 
the exception, and custom reporters would have no access to the failure information,
so generated reports, alerting, etc would show zero failures, despite the build failing.

This sort of failure is a first-class citizen in Razmin (in fact, an exception emitted from 
within the test zone is the only way Razmin knows about a test failure)

## Project Goals
- **No false positives. Ever.**  
  No test should pass when it shouldn't have, and any type 
  of test failure we can detect should be detected. Any test
  which intuitively is a failure but is not reported as such 
  in Razmin is a bug.

- **Ease of use**  
  Reduce the ceremony needed for async unit testing. Zone.js
  lets us track outstanding async tasks to ensure that your 
  test is never shown as completed before outstanding work 
  has finished. We use the same style of testing (`describe/it`) 
  made popular by Jasmine & Mocha so starting with Razmin 
  does not require learning any new concepts.
- **Clarity**  
  Reduce the chance that a developer will fumble on asynchronous testing.
  No more missed errors because you forgot to `await` something. No broken tests because you forgot to call `done()` or you called it too early. 
  There is no `done()`.
- **Modern**  
  No impedance mismatch for ES6/Typescript developers. Written in Typescript,
  so we ship type declarations and source maps right in the package. The library is structured for ES exports. No need to reach for DefinitelyTyped every time you want to test. 

## Is it ready?

Razmin is feature complete and stable as of version 1.0.0 (January 2021)! It is ready for all production uses. If you 
find issues, please post them!

## Installation

```sh
npm install razmin @types/node@14.0.4 --save-dev
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

Razmin **✔️ does** detect unhandled promise rejections correctly.

### Native async/await

While most tests will work correctly with native async/await, Razmin **❌ does not** properly handle it in all cases; it 
is possible for tests to pass in circumstances where they should fail, especially when the test code itself combines promises
with callbacks or does not await a promise which rejects. This is an ongoing limitation of Zone.js. You will need to target ES2017 or lower so that Typescript downlevels your async/await in order for Razmin to work properly. For details see https://github.com/angular/angular/issues/31730

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

### Code Coverage

You can easily add code coverage to your Razmin suite using `nyc`:

```
npm i nyc -D
```

Add this to `package.json`, adjusting your paths as necessary:

```
  "nyc": {
    "all": true,

    "extension": [
      ".js",
      ".ts"
    ],
    "include": [
      "dist/**/*.js",
      "src/**/*.ts"
    ],

    "exclude": [
      "dist/**/*.test.js",
      "src/**/*.test.ts",
      "src/test.ts"
    ],

    "reporter": [
      "html"
    ]
  },
```

Finally, make sure to enable `sourceMap: true` or `inlineSourceMap: true` within `tsconfig.json` so that `nyc` can map the compiled Javascript to the underlying Typescript source code.

## Browser Testing with Karma

Razmin natively supports Karma. You do not need to load a Karma framework to use Razmin
with Karma. Instead, just specify a `files` pattern in your `karma.conf.ts` that matches your
Razmin test files (ie `**/*.test.ts`). Note that you cannot use `suite().include()` when 
running Razmin tests with Karma. Note you will need a way to bundle your tests for running 
within the browser- using `karma-webpack` does the trick.

Here's a sample `karma.conf.ts` that should get you started:

```typescript
import * as karma from 'karma';
import * as path from 'path';

export = function (config : karma.Config) {
    config.set(<karma.ConfigOptions & { webpack }>{
        basePath: '',
        files: [
            { pattern: 'src/**/*.test.ts' }
        ],

        preprocessors: {
            '**/*.test.ts': ['webpack']
        },
        plugins: [
            'karma-webpack',
            'karma-sourcemap-loader',
            'karma-chrome-launcher'
        ],

        webpack: {
            devtool: 'inline-source-map',
            module: {
                rules: [
                    {
                        test: /\.ts$/,
                        include: path.join(__dirname, 'src')
                        use: [
                            {
                                loader: 'ts-loader',
                                options: {
                                    compilerOptions: {
                                        module: "ES2015",
                                        target: "ES2015",
                                        moduleResolution: "node"
                                    }
                                }
                            }
                        ]
                    }
                ]
            },
            resolve: {
              extensions: [ '.ts', '.js' ],
            },
        },

        webpackMiddleware: {
            stats: 'errors-only',
        },
    });
}
```

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

