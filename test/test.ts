import { suite, Test, TestExecutionSettings, TestSuite, TestSubject } from '../src';
import { delay } from '../src/util';
import { expect } from 'chai';
import * as colors from 'colors/safe';

export async function test() {

    let tests = [
        [
            'should recognize no-op success',
            async () => {
                let results = await suite(describe => {
                    describe('thing under test', it => {
                        it('will succeed', async () => await delay(1000));
                        it('will succeed', () => { });
                    });
                }, {
                    reporters: []
                });

                if (!results)
                    throw new Error('Received invalid results from suite()');

                if (!results.passed)
                    throw new Error(`Should recognize noop success`);
            }
        ],
        [
            'should not accept a suite that throws exceptions',
            async () => {
                let results = await suite(describe => {
                    describe('thing under test', it => {
                        it('will succeed', () => { });
                        it('will fail', () => { throw new Error('This is an error'); })
                        it('will also succeed', () => { });
                    });
                }, {
                    reporters: []
                });

                if (!results)
                    throw new Error('Received invalid results from suite()');

                if (results.passed)
                    throw new Error(`Should not accept a suite that throws exceptions`);
            }
        ]
    ];

    await Promise.all(tests.map(async x => {
        let [ name, test ] = [ <string>x[0], <Function>x[1] ];
        await test();
        console.log(colors.green(`  ✓  ${name}`));
    }));

    console.log();
}

export async function runSanityTests() {
    console.log('Running sanity tests...');
    try {
        await test();
    } catch (e) {
        console.error('Sanity tests failed.');
        console.error(e);
        throw e;
    }
}

async function runTests() {
    console.log('Running test suite...');
    suite(describe => {
        describe('TestSuite', it => {
            it('should run its suites', async () => {
                let suite = new TestSuite();
                let count = 0;
    
                for (let i = 0; i < 10; ++i)
                    suite.addSubject(<any>{ run() { count += 1; } });
    
                await suite.run();

                expect(count).to.eq(10);
            });
            it('should manage its set of suites', async () => {
                let suite = new TestSuite();

                for (let i = 0; i < 10; ++i)
                    suite.addSubject(<any>{ run() { } });

                expect(suite.subjects.length).to.eq(10);
            });
        });

        describe('TestSubject', it => {
            it('should run its tests', async () => {
                let subject = new TestSubject('foobar');
                let count = 0;
    
                for (let i = 0; i < 10; ++i)
                    subject.addTest('does things', () => count += 1);
    
                await subject.run();

                expect(count).to.eq(10);
            });
            it('should manage its set of tests', async () => {
                let subject = new TestSubject('foobar');

                for (let i = 0; i < 10; ++i)
                    subject.addTest('does things', () => {});

                expect(subject.tests.length).to.eq(10);
            });
        });

        describe('Test', it => {
            it('should execute the test function', async () => {
                let success = false;
                let test = new Test('test', () => {
                    success = true;
                });

                await test.run(null, "This Test!");
                expect(success).to.eq(true);
            });
            it('should execute within a TestZone', async () => {
                let success = false;
                let zone = Zone.current;
                let test = new Test('test', () => {
                    if (Zone.current != zone)
                        success = true;
                });

                await test.run(null, "This Test!");
                expect(success).to.eq(true);
            });
            it('should detect an exception and return a failure result', async () => {
                let success = false;
                let test = new Test('test', () => {
                    throw new Error('this!');
                });

                let result = await test.run(null, "This Test!");

                expect(result.passed).to.eq(false);
            });
            it('should detect an async exception and return a failure result', async () => {
                let success = false;
                let test = new Test('test', () => {
                    setTimeout(() => {
                        throw new Error('this!');
                    }, 10);
                });

                let result = await test.run(null, "This Test!");
                expect(result.passed).to.eq(false);
            });
            it('should not fail a test for an unrelated child context exception', async () => {
                let success = false;
                let test = new Test('test', () => {
                    setTimeout(() => {
                        throw new Error('this!');
                    }, 10);
                });

                // Even though the inner test fails, all activity in the zone should be handled 
                // within the context of this test call. This test fails, in particular, when
                // the TestZone is not properly isolating exception events.

                await test.run(null, "This Test!");

                // Result is not needed.
            });
            it('should not fail a test for an unrelated peer exception', async () => {
                let success = false;
                let test1 = new Test('test', () => {
                    setTimeout(() => {
                    }, 10);
                });
                let test2 = new Test('test', () => {
                    setTimeout(() => {
                        throw new Error('this!');
                    }, 10);
                });

                let results = await Promise.all([
                    test1.run(null, "This Other Test!"),
                    test2.run(null, "This Test!")
                ]);

                expect(results[0].passed, 'the first example (which succeeds) should not report a failure').to.be.true;
                expect(results[1].passed, 'the second example (which fails) should report a failure').to.be.false;
            });
            it('should correctly handle a weird throwable (string)', async () => {
                let success = false;
                let test = new Test('test', () => {
                    setTimeout(() => {
                        throw 'this!';
                    }, 10);
                });

                let result = await test.run(null, "This Test!");
                expect(result.passed, 'the example test should fail').to.be.false;
                expect(result.message.indexOf('this!'), `the failure message should mention the object`).to.be.at.least(0);
            });
            it('should correctly handle a weird throwable (number)', async () => {
                let success = false;
                let test = new Test('test', () => {
                    setTimeout(() => {
                        throw 12;
                    }, 10);
                });

                let result = await test.run(null, "This Test!");
                expect(result.passed, 'the example test should fail').to.be.false;
                expect(result.message.indexOf('12'), `the failure message should mention the object`).to.be.at.least(0);
            });
            it('should correctly handle a weird throwable (Date)', async () => {
                let success = false;
                let date = new Date();
                let test = new Test('test', () => {
                    setTimeout(() => {
                        throw date;
                    }, 10);
                });

                let result = await test.run(null, "This Test!");
                expect(result.passed, 'the example test should fail').to.be.false;
                expect(result.message.indexOf(date.toString()), `the failure message should mention that the object is a date`).to.be.at.least(0);
            });
            it('should correctly handle a broken throwable (stack is a number)', async () => {
                let success = false;
                let date = new Date();
                let test = new Test('test', () => {
                    setTimeout(() => {
                        throw { stack: 123, message: 'nothing to see here' };
                    }, 10);
                });

                let result = await test.run(null, "This Test!");
                expect(result.passed, 'the example test should fail').to.be.false;
                expect(result.message.indexOf('nothing to see here'), `the failure message should mention the message`).to.be.at.least(0);
            });
            it('should correctly handle a broken throwable (stack is null)', async () => {
                let success = false;
                let date = new Date();
                let test = new Test('test', () => {
                    setTimeout(() => {
                        throw { stack: null, message: 'nothing to see here' };
                    }, 10);
                });

                let result = await test.run(null, "This Test!");

                expect(result.passed, 'the example test should fail')
                    .to.be.false;

                expect(result.message, `the failure message should mention the message`)
                    .to.contain('nothing to see here');
                    
            });
            it('should correctly handle a broken throwable (message is null)', async () => {
                let success = false;
                let date = new Date();
                let test = new Test('test', () => {
                    setTimeout(() => {
                        throw { stack: '', message: null };
                    }, 10);
                });

                let result = await test.run(null, "This Test!");

                expect(result.passed, 'the example test should fail')
                    .to.be.false;

            });
            it('should produce a timeout failure', async () => {
                let success = false;
                let date = new Date();
                let test = new Test('test', () => {
                    setTimeout(() => {
                    }, 1000);
                });

                let result = await test.run(new TestExecutionSettings({ timeout: 100 }), "This Test!");

                expect(result.passed, 'the example test should fail')
                    .to.be.false;

                expect(result.message, 'the failure message should mention a timeout')
                    .to.contain('Timed out');

            });
            it('should not produce a timeout failure when test completes promptly, even if a timeout limit is set', async () => {
                let success = false;
                let date = new Date();
                let test = new Test('test', () => {
                    setTimeout(() => {
                    }, 100);
                });

                let result = await test.run(new TestExecutionSettings({ timeout: 1000 }), "This Test!");

                expect(result.passed, 'the example test should pass')
                    .to.be.true;

            });
            it('should provide a reasonable message upon success', async () => {
                let success = false;
                let date = new Date();
                let test = new Test('test', () => {
                    setTimeout(() => {
                    }, 100);
                });

                let result = await test.run(new TestExecutionSettings({ timeout: 1000 }), "This Test!");

                expect(result.passed, 'the example test should pass')
                    .to.be.true;

                expect(result.message || '', 'the message should not be empty')
                    .to.not.be.empty;
            });
        });
    });
}

export async function main() {
    try {
        await runSanityTests();
        await runTests();
    } catch (e) {
        console.error(e);
    }
}

main();