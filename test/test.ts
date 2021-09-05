import { suite, Test, TestExecutionSettings, TestSuite, TestSubject, beforeEach, afterEach, before, after, skip, TestSubjectResult } from '../src';
import { delay } from '../src/util';
import { expect } from 'chai';
import * as colors from 'colors/safe';
import { Observable, of, interval, Subscription } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { TestReportingSettings } from '../src/core/test-reporting-settings';
import { resolve } from 'dns';

interface SanityTestOptions {
    skip?: boolean;
    only?: boolean;
}

type SanityTestDefinition = [ string, SanityTestOptions, Function ];

export async function test() {

    let tests : SanityTestDefinition[] = [
        [
            'should recognize no-op success',
            {},
            async () => {
                let results = await suite(describe => {
                    describe('thing under test', it => {
                        it('will succeed', async () => await delay(1000));
                        it('will succeed', () => { });
                    });
                }, {
                    reporting: {
                        reporters: [],
                        exitAndReport: false
                    }
                });

                if (!results)
                    throw new Error('Received invalid results from suite()');

                if (!results.passed)
                    throw new Error(`Should recognize noop success`);
            }
        ],
        [
            'should not accept a suite that throws exceptions',
            {},
            async () => {
                let results = await suite(describe => {
                    describe('thing under test', it => {
                        it('will succeed', () => { });
                        it('will fail', () => { throw new Error('This is an error'); })
                        it('will also succeed', () => { });
                    });
                }, {
                    reporting: { 
                        reporters: [],
                        exitAndReport: false
                    }
                });

                if (!results)
                    throw new Error('Received invalid results from suite()');

                if (results.passed)
                    throw new Error(`Should not accept a suite that throws exceptions`);
            }
        ],
        [
            'should not accept a suite that throws async exceptions',
            {},
            async () => {
                let results = await suite(describe => {
                    describe('thing under test', it => {
                        it('will succeed', () => { });
                        it('will fail', async () => {
                            await delay(1);
                            throw new Error('This is an error'); 
                        })
                        it('will also succeed', () => { });
                    });
                }, {
                    reporting: { 
                        reporters: [],
                        exitAndReport: false
                    }
                });

                if (!results)
                    throw new Error('Received invalid results from suite()');

                if (results.passed)
                    throw new Error(`Should not accept a suite that throws async exceptions`);
            }
        ],
        [
            'should not accept a suite that throws an uncaught exception',
            {},
            async () => {
                let results = await suite(describe => {
                    describe('thing under test', it => {
                        it('will succeed', () => { });
                        it('will fail', async () => {
                            setTimeout(() => {
                                throw new Error('This is an error'); 
                            }, 50);
                        })
                        it('will also succeed', () => { });
                    });
                }, {
                    reporting: { 
                        reporters: [],
                        exitAndReport: false
                    }
                });

                if (!results)
                    throw new Error('Received invalid results from suite()');

                if (results.passed)
                    throw new Error(`Should not accept a suite that throws zoned exceptions`);
            }
        ],
        [
            'should not accept a suite that throws an uncaught async exception',
            {},
            async () => {
                let results = await suite(describe => {
                    describe('thing under test', it => {
                        it('will succeed', () => { });
                        it('will fail', async () => {
                            setTimeout(async () => {
                                delay(30);
                                throw new Error('This is an error'); 
                            }, 30);
                        })
                        it('will also succeed', () => { });
                    });
                }, {
                    reporting: { 
                        reporters: [],
                        exitAndReport: false
                    }
                });

                if (!results)
                    throw new Error('Received invalid results from suite()');

                if (results.passed)
                    throw new Error(`Should not accept a suite that throws zoned exceptions`);
            }
        ],
        [
            'should not accept a suite that throws an uncaught exception in an observable',
            {},
            async () => {
                let results = await suite(describe => {
                    describe('thing under test', it => {
                        it('will fail', async () => {
                            let subscription : Subscription;
                            let counter = 0;
                            subscription = interval(10).subscribe(() => {
                                counter += 1
                                if (counter == 3) {
                                    throw new Error('(VALID-ERROR)');
                                }
                            });
                        })
                    });
                }, {
                    reporting: { 
                        reporters: [],
                        exitAndReport: false
                    }
                });

                if (!results)
                    throw new Error('Received invalid results from suite()');

                if (results.passed)
                    throw new Error(`Should not accept a suite that throws zoned exceptions`);

                let testResult = results.subjectResults[0].tests[0];

                if (!testResult.message.includes('(VALID-ERROR)')) {
                    throw new Error(`Incorrect failure message: ${testResult.message}`);
                }
            }
        ],
        [
            'should accept a suite where a rejected promise is caught',
            {},
            async () => {
                let wasCaught = false;

                let results = await suite(describe => {
                    describe('thing under test', it => {
                        it('will fail', async () => {
                            Promise.resolve().then(() => { throw new Error() }).catch(e => {
                                wasCaught = true;
                            });
                        })
                    });
                }, {
                    reporting: { 
                        reporters: [],
                        exitAndReport: false
                    }
                });

                if (!results)
                    throw new Error('Received invalid results from suite()');

                if (!results.passed)
                    throw new Error(`Should have passed`);
                
                if (!wasCaught)
                    throw new Error(`Promise rejection handler did not run`);
            }
        ],
        [
            'should wait for a setInterval task to complete',
            {},
            async () => {
                let wasRun = false;

                let results = await suite(describe => {
                    describe('thing under test', it => {
                        it('will take a bit', async () => {
                            let interval;
                            
                            interval = setInterval(() => {
                                wasRun = true;
                                clearInterval(interval);
                            }, 100);
                        })
                    });
                }, {
                    reporting: { 
                        reporters: [],
                        exitAndReport: false
                    }
                });

                if (!results)
                    throw new Error('Received invalid results from suite()');

                if (!results.passed)
                    throw new Error(`Should have passed`);
                
                if (!wasRun)
                    throw new Error(`setInterval never fired`);
            }
        ],
        [
            'should reject a suite where setInterval threw an exception',
            { },
            async () => {

                let wasRun = false;

                let results = await suite(describe => {
                    describe('thing under test', it => {
                        it('will take a bit', async () => {
                            let interval;
                            
                            interval = setInterval(() => {
                                wasRun = true;
                                clearInterval(interval);
                                throw new Error();
                            }, 100);
                        })
                    });
                }, {
                    reporting: { 
                        reporters: [],
                        exitAndReport: false
                    }
                });

                if (!results)
                    throw new Error('Received invalid results from suite()');

                if (results.passed)
                    throw new Error(`Should have failed`);
                
                if (!wasRun)
                    throw new Error(`setInterval never fired`);
            }
        ],
        [
            'should reject a suite with a simple uncaught rejected promise',
            {},
            async () => {
                let wasCaught = false;

                let results = await suite(describe => {
                    describe('thing under test', it => {
                        it('will fail', () => {
                            Promise.reject(new Error('(should be caught)'));
                        })
                    });
                }, {
                    reporting: { 
                        reporters: [],
                        exitAndReport: false
                    }
                });

                if (!results)
                    throw new Error('Received invalid results from suite()');

                if (results.passed)
                    throw new Error(`Test subject was expected to fail`);

                let message = results.subjectResults[0].tests[0].message;
                if (!message.includes('(should be caught)')) {
                    throw new Error(`Expected failure has unexpected message: '${message}'`);
                }
            }
        ],
        [
            'should reject a suite with an uncaught rejected promise',
            {},
            async () => {
                let wasCaught = false;

                let results = await suite(describe => {
                    describe('thing under test', it => {
                        it('will fail', () => new Promise((resolve, reject) => reject(new Error('(should be caught)'))));
                    });
                }, {
                    reporting: { 
                        reporters: [],
                        exitAndReport: false
                    }
                });
                
                if (!results)
                    throw new Error('Received invalid results from suite()');

                if (results.passed)
                    throw new Error(`Test subject was expected to fail`);

                let message = results.subjectResults[0].tests[0].message;
                if (!message.includes('(should be caught)')) {
                    throw new Error(`Expected failure has unexpected message: '${message}'`);
                }
            }
        ],
        [
            'should reject a suite with a delayed uncaught rejected promise',
            { skip: false },
            async () => {
                let wasCaught = false;

                let results = await suite(describe => {
                    describe('thing under test', it => {
                        it('will fail', () => {
                            new Promise((resolve, reject) => setTimeout(() => reject(new Error('(should be caught)')), 1000));
                        })
                    });
                }, {
                    reporting: { 
                        reporters: [],
                        exitAndReport: false
                    }
                });

                if (!results)
                    throw new Error('Received invalid results from suite()');

                if (results.passed)
                    throw new Error(`Test subject was expected to fail`);

                let message = results.subjectResults[0].tests[0].message;
                if (!message.includes('(should be caught)')) {
                    throw new Error(`Expected failure has unexpected message: '${message}'`);
                }
            }
        ],
        [
            'should not accept a suite that throws an exception in a subzone',
            {},
            async () => {
                let results = await suite(describe => {
                    describe('thing under test', it => {
                        it('will succeed', () => { });
                        it('will fail', () => { 
                            let zone = Zone.current.fork({ name: 'RazminTestsDummyZone' });

                            zone.run(() => {
                                throw new Error('This is an error'); 
                            })
                            
                        })
                        it('will also succeed', () => { });
                    });
                }, {
                    reporting: { 
                        reporters: [],
                        exitAndReport: false
                    }
                });

                if (!results)
                    throw new Error('Received invalid results from suite()');

                if (results.passed)
                    throw new Error(`Should not accept a suite that throws exceptions`);
            }
        ],
        [
            'should not accept a suite that throws a delayed exception in a subzone while waiting for main zone',
            { },
            async () => {
                let results = await suite(describe => {
                    describe('thing under test', it => {
                        it('will fail', () => { 
                            let zone = Zone.current.fork({ 
                                name: 'RazminTestsDummyZone',
                                properties: {
                                    testProperty: 123321
                                }
                            });

                            setTimeout(() => {}, 20);

                            zone.run(() => {
                                let testPropVal = Zone.current.get('testProperty');
                                if (testPropVal !== 123321)
                                    throw new Error(`A property defined on a zone forked from TestZone is not available inside that zone (Razmin broke zone-local properties)`);
                                
                                setTimeout(() => {
                                    throw new Error('INNER_ERROR'); 
                                }, 10);
                            })
                            
                        })
                    });
                }, {
                    reporting: { 
                        reporters: [],
                        exitAndReport: false
                    }
                });

                expect(results, 'Received invalid results from suite()').to.exist
                expect(results.passed, 'Should not accept a suite that throws exceptions').to.be.false
                expect(results.subjectResults[0].tests[0].message).to.include('INNER_ERROR');
            }
        ],
        [
            'should not accept a suite that throws a delayed exception in a second subzone',
            {},
            async () => {
                let results = await suite(describe => {
                    describe('thing under test', it => {
                        it('will succeed', () => { });
                        it('will fail', () => { 
                            let zone = Zone.current.fork({ name: 'RazminTestsDummyZone' });
                            let zone2 = Zone.current.fork({ name: 'RazminTestsDummyZone2' });

                            // Schedule a successful callback in 10ms and 
                            // a failing callback in 11ms (later) in another
                            // zone.

                            zone.run(() => {
                                setTimeout(() => {}, 10);
                            });
                            
                            zone2.run(() => {
                                setTimeout(() => {
                                    throw new Error('This is an error'); 
                                }, 20);
                            })
                            
                        })
                        it('will also succeed', () => { });
                    });
                }, {
                    reporting: { 
                        reporters: [],
                        exitAndReport: false
                    }
                });

                if (!results)
                    throw new Error('Received invalid results from suite()');

                if (results.passed)
                    throw new Error(`Should not accept a suite that throws exceptions`);
            }
        ],
        [
            'nested suites should merge',
            {},
            async () => {
                let results = await suite(describe => {
                    describe('thing under test', it => {
                        it('will succeed', () => { });
                        it('will also succeed', () => { });
                    });

                    suite(describe => {
                        describe('a problematic thing', it => {
                            it('will fail', () => { throw new Error('This is an error'); })
                        })
                    });
                }, {
                    reporting: { 
                        reporters: [],
                        exitAndReport: false
                    }
                });

                if (!results)
                    throw new Error('Received invalid results from suite()');

                if (results.passed)
                    throw new Error(`Nested suites should become part of the top-level suite`);
            }
        ],
        [
            'tests should be run in the proper order',
            {},
            async () => {
                let message = '';
                let results = await suite(describe => {
                    describe('thing under test', it => {
                        it('will succeed', async () => { 
                            message += 'h';
                            await delay(30);
                            message += 'e';
                        });
                        it('will also succeed', async () => { 
                            message += 'll';
                        });
                        it('will also succeed', () => { 
                            message += 'o';
                        });
                        it('will also succeed', () => { 
                            message += ' ';
                        });
                    });
                    describe('another thing under test', it => {
                        it('will succeed', async () => { 
                            message += 'w';
                            await delay(30);
                            message += 'o';
                        });
                        it('will also succeed', () => { 
                            message += 'r';
                        });
                    });

                    suite(describe => {
                        describe('thing under test', it => {
                            it('will succeed', async () => { 
                                message += 'l';
                            });
                            it('will also succeed', () => { 
                                message += 'd';
                            });
                        });
                        describe('another thing under test', it => {
                            it('will succeed', async () => { 
                                message += ' ';
                                await delay(30);
                                message += 'a';
                            });
                            it('will also succeed', async () => { 
                                message += 'n';
                                await delay(30);
                                message += 'd such';
                            });
                        });
                    });
                }, {
                    reporting: { 
                        reporters: [],
                        exitAndReport: false
                    }
                });

                expect(message).to.eq('hello world and such');
            }
        ],
        [
            'beforeEach should run before each test',
            {},
            async () => {
                let message = '';
                let results = await suite(describe => {
                    describe('another thing under test', it => {
                        beforeEach(() => {
                            message += '(';
                        });

                        it('will succeed', async () => { 
                            message += 'a';
                            await delay(30);
                            message += 'b';
                        });
                        it('will also succeed', async () => { 
                            message += 'c';
                            await delay(30);
                            message += 'd';
                        });
                        it('will also succeed', async () => { 
                            message += 'e';
                            await delay(30);
                            message += 'f';
                        });
                    });
                }, {
                    reporting: { 
                        reporters: [],
                        exitAndReport: false
                    }
                });

                expect(message).to.eq('(ab(cd(ef');
            }
        ],
        [
            'afterEach should run before each test',
            {},
            async () => {
                let message = '';
                let results = await suite(describe => {
                    describe('another thing under test', it => {
                        afterEach(() => {
                            message += ')';
                        });

                        it('will succeed', async () => { 
                            message += 'a';
                            await delay(30);
                            message += 'b';
                        });
                        it('will also succeed', async () => { 
                            message += 'c';
                            await delay(30);
                            message += 'd';
                        });
                        it('will also succeed', async () => { 
                            message += 'e';
                            await delay(30);
                            message += 'f';
                        });
                    });
                }, {
                    reporting: { 
                        reporters: [],
                        exitAndReport: false
                    }
                });

                expect(message).to.eq('ab)cd)ef)');
            }
        ],
        [
            'before/after should surround each test',
            {},
            async () => {
                let message = '';
                let results = await suite(describe => {
                    describe('another thing under test', it => {
                        afterEach(() => {
                            message += ')';
                        });
                        beforeEach(() => {
                            message += '(';
                        });

                        it('will succeed', async () => { 
                            message += 'a';
                            await delay(30);
                            message += 'b';
                        });
                        it('will also succeed', async () => { 
                            message += 'c';
                            await delay(30);
                            message += 'd';
                        });
                        it('will also succeed', async () => { 
                            message += 'e';
                            await delay(30);
                            message += 'f';
                        });
                    });
                }, {
                    reporting: { 
                        reporters: [],
                        exitAndReport: false
                    }
                });

                expect(message).to.eq('(ab)(cd)(ef)');
            }
        ],
        [
            'nested describe should extend the description',
            {},
            async () => {
                let message = '';
                let results = await suite(describe => {
                    describe('thing1', () => {
                        describe('should do a thing', it => {
                            it('will succeed', async () => { 
                            });
                            it('will fail', async () => { 
                                throw new Error();
                            });
                        });
                    });
                }, {
                    reporting: { 
                        reporters: [],
                        exitAndReport: false
                    }
                });

                let result = results.subjectResults.find(x => x.description == 'thing1 should do a thing');
                expect(result).to.not.eq(undefined);

                expect(result.passed).to.eq(false);
                expect(result.tests[0].passed).to.eq(true);
                expect(result.tests[1].passed).to.eq(false);
            }
        ],
        [
            'before() should run before each test',
            {},
            async () => {
                let message = '';
                let value = '';
                let results = await suite(describe => {
                    describe('thing1', () => {
                        describe('should do a thing', it => {

                            before(() => value += 'B');

                            it('will succeed', async () => value += '1');
                            it('will succeed', async () => value += '2');
                        });
                    });
                }, {
                    reporting: { 
                        reporters: [],
                        exitAndReport: false
                    }
                });

                let result = results.subjectResults.find(x => x.description == 'thing1 should do a thing');
                expect(result).to.not.eq(undefined);

                expect(result.passed).to.eq(true);
                expect(value).to.eq('B1B2');
            }
        ],
        [
            'before() should work in nested describe()',
            {},
            async () => {
                let message = '';
                let value = '';
                let results = await suite(describe => {
                    describe('thing1', () => {
                        describe('should do a thing', it => {

                            before(() => value += 'B');

                            it('will succeed', async () => value += '1');
                            it('will succeed', async () => value += '2');

                            describe('deeper things', it => {

                                before(() => value += 'b');

                                it('will succeed', async () => value += '3');
                                it('will succeed', async () => value += '4');
                                describe('even deeper', it => {
                                    it('will succeed', async () => value += '5');
                                    it('will succeed', async () => value += '6');
                                })
                            });
                        });
                    });
                }, {
                    reporting: { 
                        reporters: [],
                        exitAndReport: false
                    }
                });

                let result = results.subjectResults.find(x => x.description == 'thing1 should do a thing');
                expect(result).to.not.eq(undefined);

                expect(result.passed).to.eq(true);
                expect(value).to.eq('B1B2Bb3Bb4Bb5Bb6');
            }
        ],        
        [
            'ancestor before() should complete before test is run',
            { },
            async () => {
                let message = '';
                let value = '';
                let results = await suite(describe => {
                    describe('thing1', () => {

                        before(async () => {
                            await delay(100);
                            value += 'B'
                        });

                        describe('should do a thing', it => {

                            it('will succeed', async () => value += '1');
                            it('will succeed', async () => value += '2');

                            describe('deeper things', it => {

                                before(() => value += 'b');

                                it('will succeed', async () => value += '3');
                                it('will succeed', async () => value += '4');
                                describe('even deeper', it => {
                                    it('will succeed', async () => value += '5');
                                    it('will succeed', async () => value += '6');
                                })
                            });
                        });
                    });
                }, {
                    reporting: { 
                        reporters: [],
                        exitAndReport: false
                    }
                });

                let result = results.subjectResults.find(x => x.description == 'thing1 should do a thing');
                expect(result).to.not.eq(undefined);

                expect(result.passed).to.eq(true);
                expect(value).to.eq('B1B2Bb3Bb4Bb5Bb6');
            }
        ],
        [
            'after() should run after each test',
            {},
            async () => {
                let message = '';
                let value = '';
                let results = await suite(describe => {
                    describe('thing1', () => {
                        describe('should do a thing', it => {

                            after(() => value += 'A');

                            it('will succeed', async () => value += '1');
                            it('will succeed', async () => value += '2');
                        });
                    });
                }, {
                    reporting: { 
                        reporters: [],
                        exitAndReport: false
                    }
                });

                let result = results.subjectResults.find(x => x.description == 'thing1 should do a thing');
                expect(result).to.not.eq(undefined);

                expect(result.passed).to.eq(true);
                expect(value).to.eq('1A2A');
            }
        ],
        [
            'after() should work in nested describe()',
            {},
            async () => {
                let message = '';
                let value = '';
                let results = await suite(describe => {
                    describe('thing1', () => {
                        describe('should do a thing', it => {

                            after(() => value += 'A');

                            it('will succeed', async () => value += '1');
                            it('will succeed', async () => value += '2');

                            describe('deeper things', it => {

                                after(() => value += 'a');

                                it('will succeed', async () => value += '3');
                                it('will succeed', async () => value += '4');
                                describe('even deeper', it => {
                                    it('will succeed', async () => value += '5');
                                    it('will succeed', async () => value += '6');
                                })
                            });
                        });
                    });
                }, {
                    reporting: { 
                        reporters: [],
                        exitAndReport: false
                    }
                });

                let result = results.subjectResults.find(x => x.description == 'thing1 should do a thing');
                expect(result).to.not.eq(undefined);

                expect(result.passed).to.eq(true);
                expect(value).to.eq('1A2A3Aa4Aa5Aa6Aa');
            }
        ],
        [
            'skip() should cause a test to be skipped',
            {},
            async () => {
                let message = '';
                let value = '';
                let results = await suite(describe => {
                    describe('thing1', () => {
                        describe('should do a thing', it => {
                            it('will skip', async () => skip());
                            it('will succeed', async () => value += '1');
                        });
                    });
                }, {
                    reporting: { 
                        reporters: [],
                        exitAndReport: false
                    }
                });

                let result = results.subjectResults.find(x => x.description == 'thing1 should do a thing');
                expect(result).to.not.eq(undefined);

                let skippedTest = result.tests.find(x => x.description == 'will skip');
                let successTest = result.tests.find(x => x.description == 'will succeed');
                
                expect(skippedTest.passed).to.equal('skip');
                expect(successTest.passed).to.be.true;

                expect(result.passed).to.eq(true);
                expect(value).to.eq('1');
            }
        ],
        [
            'it() without a function should cause a skipped test to be recorded',
            {},
            async () => {
                let message = '';
                let value = '';
                let results = await suite(describe => {
                    describe('thing1', () => {
                        describe('should do a thing', it => {
                            it('will skip');
                            it('will succeed', async () => value += '1');
                        });
                    });
                }, {
                    reporting: { 
                        reporters: [],
                        exitAndReport: false
                    }
                });

                let result = results.subjectResults.find(x => x.description == 'thing1 should do a thing');
                expect(result).to.not.eq(undefined);

                let skippedTest = result.tests.find(x => x.description == 'will skip');
                let successTest = result.tests.find(x => x.description == 'will succeed');
                
                expect(skippedTest.passed).to.equal('skip');
                expect(successTest.passed).to.be.true;

                expect(result.passed).to.eq(true);
                expect(value).to.eq('1');
            }
        ],
        [
            'it() should throw when no function is provided, but options are (this is probably a mistake)',
            {},
            async () => {
                let message = '';
                let value = '';
                let results = await suite(describe => {
                    describe('thing1', () => {
                        describe('should do a thing', it => {
                            it('will skip', undefined, {});
                            it('will succeed', async () => value += '1');
                        });
                    });
                }, {
                    reporting: { 
                        reporters: [],
                        exitAndReport: false
                    }
                });

                let result = results.subjectResults.find(x => x.description == 'thing1 should do a thing');
                expect(result).to.not.eq(undefined);

                let skippedTest = result.tests.find(x => x.description == 'will skip');
                let successTest = result.tests.find(x => x.description == 'will succeed');
                
                expect(skippedTest.passed).to.equal(false);
                expect(skippedTest.message).to.include('passed an undefined');
                expect(successTest.passed).to.be.true;

                expect(result.passed).to.eq(false);
                expect(value).to.eq('1');
            }
        ],
        [
            'suite() should await before continuing',
            {},
            async () => {
                let message = '';
                let value = '';
                let results = await suite(async describe => {
                    await delay(100);
                    describe('thing1', it => {
                        it('will succeed', async () => value += '1');
                        it('will succeed', async () => value += '2');
                    });
                }, {
                    reporting: { 
                        reporters: [],
                        exitAndReport: false
                    }
                });

                let result = results.subjectResults.find(x => x.description == 'thing1');
                expect(result).to.not.eq(undefined);

                expect(result.tests.length).to.eq(2);
                
                expect(result.passed).to.eq(true);
                expect(value).to.eq('12');
            }
        ],
        [
            'describe() should await before continuing (double await)',
            {},
            async () => {
                let message = '';
                let value = '';
                let results = await suite(async describe => {
                    await describe('thing1', async it => {
                        await delay(100);
                        it('will succeed', async () => value += '1');
                        it('will succeed', async () => value += '2');
                    });
                }, {
                    reporting: { 
                        reporters: [],
                        exitAndReport: false
                    }
                });
                
                let result = results.subjectResults.find(x => x.description == 'thing1');
                expect(result).to.not.eq(undefined);

                expect(result.tests.length).to.eq(2);
                
                expect(result.passed).to.eq(true);
                expect(value).to.eq('12');
            }
        ],
        [
            'suite() should wait for it\'s zone to resolve before continuing',
            { skip: false },
            async () => {
                let message = '';
                let value = '';

                let results = await suite(async describe => {
                    describe('thing1', async it => {
                        await delay(100);
                        it('will succeed', async () => value += '1');
                        it('will succeed', async () => value += '2');
                    });
                }, {
                    reporting: { 
                        reporters: [],
                        exitAndReport: false
                    }
                });
                
                let result = results.subjectResults.find(x => x.description == 'thing1');
                expect(result).to.not.eq(undefined);

                expect(result.tests.length).to.eq(2);
                
                expect(result.passed).to.eq(true);
                expect(value).to.eq('12');
            }
        ],
        [
            'suite() should wait for its zone to resolve before continuing',
            { skip: false },
            async () => {
                let message = '';
                let value = '';

                let results = await suite(async describe => {
                    describe('thing1', async it => {
                        await delay(100);
                        it('will succeed', async () => value += '1');
                        it('will succeed', async () => value += '2');
                    });
                }, {
                    reporting: { 
                        reporters: [],
                        exitAndReport: false
                    }
                });
                
                let result = results.subjectResults.find(x => x.description == 'thing1');
                expect(result).to.not.eq(undefined);

                expect(result.tests.length).to.eq(2);
                
                expect(result.passed).to.eq(true);
                expect(value).to.eq('12');
            }
        ],
        [
            'suite() should not be confused by zone-isolated inner suites',
            { skip: false },
            async () => {
                let message = '';
                let value = '';

                let results = await suite(async describe => {
                    describe('thing1', async it => {
                        
                        await suite(describe => {
                            describe('A thing', it => {
                                it('works well', () => { throw new Error() });
                            });
                        }, { 
                            execution: { 
                                isolated: true 
                            }, 
                            reporting: { 
                                exitAndReport: false,
                                reporters: []
                            } 
                        });

                        await delay(100);
                        it('will succeed', async () => value += '1');
                        it('will succeed', async () => value += '2');
                    });
                }, {
                    reporting: { 
                        reporters: [],
                        exitAndReport: false
                    }
                });
                
                let result = results.subjectResults.find(x => x.description == 'thing1');
                expect(result).to.not.eq(undefined);

                expect(result.tests.length).to.eq(2);
                
                expect(result.passed).to.eq(true);
                expect(value).to.eq('12');
            }
        ],
        [
            'suite() should support dynamic test definitions',
            { skip: false },
            async () => {
                let message = '';
                let value = 0;
                let results = await suite(async describe => {
                    describe('thing1', async it => {
                        await delay(100);
                        for (let i = 0, max = 5; i < max; ++i) 
                            it(`will succeed ${i}`, async () => value += i);
                    });
                }, {
                    reporting: { 
                        reporters: [],
                        exitAndReport: false
                    }
                });
                
                let result = results.subjectResults.find(x => x.description == 'thing1');

                expect(result).to.not.eq(undefined);
                expect(result.tests.length).to.eq(5);
                expect(result.passed).to.eq(true);
                expect(value).to.eq(10);
                for (let i = 0, max = 5; i < max; ++i)
                    expect(result.tests.find(x => x.description.includes(`will succeed ${i}`))).to.exist;
            }
        ]
    ];

    let passedCount = 0;
    let failedCount = 0;
    
    if (tests.filter(x => x[1].only).length > 0)
        tests = tests.filter(x => x[1].only);

    for (let x of tests) {
        let [ name, options, test ] = x;

        if (options) {
            if (options.skip) {
                console.log(colors.yellow(`  S  ${name}`));
                continue;
            }
        }

        try {
            await test();
        } catch (e) {
            failedCount += 1;
            console.log(colors.red(`  ✗  ${name}`));
            console.error(e);
            throw e;
        }

        passedCount += 1;
        console.log(colors.green(`  ✓  ${name}`));
    };

    console.log();
    if (failedCount == 0)
        console.log(`${passedCount} test(s) passed`);
    else if (passedCount == 0)
        console.log(`all ${failedCount} test(s) failed`);
    else
        console.log(`${passedCount} test(s) passed, ${failedCount} failed`);
    console.log();
}

export async function runSanityTests() {
    console.log('Sanity Tests');
    try {
        await test();
    } catch (e) {
        console.error('Sanity tests failed.');
        console.error(e);
        throw e;
    }
}

async function runTests() {
    console.log('= Primary Tests =');

    let existingSuite = TestSuite.current;
    if (existingSuite) 
        throw new Error(`Error: While running the primary test suite we noticed we are already in a test suite! This is a bug!`);

    return await suite(describe => {
        describe('TestSuite', it => {
            it('should run its suites', async () => {
                let suite = new TestSuite(undefined, new TestReportingSettings({ reporters: [] }));
                let count = 0;
    
                for (let i = 0; i < 10; ++i)
                    suite.addSubject(<any>{ run() { count += 1; return new TestSubjectResult('test', []) } });
    
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

        describe('DSL', () => {
            describe('.before', it => {
                let value = 0;
                before(() => value += 1);
                it('runs before() before tests', () => expect(value).to.eq(1));
            });
            describe('.after', it => {
                it('runs after() after tests', async () => {
                    let observed = '';
                    let theTest = await suite(describe => {
                        describe('A subject', it => {
                            after(() => observed += 'after-');
                            it('should run()', () => observed += 'test-');
                        });
                    }, { reporting: { reporters: [] }});
                    expect(observed).to.eq('test-after-');
                });
            });
            describe('.only', it => {
                it('only runs .only() tests when one is specified', async () => {
                    let observed = '';
                    let theTest = await suite(describe => {
                        describe('A subject', it => {
                            it('should not run()', () => observed += 'skipped-');
                            it.only('should run()', () => observed += 'ran-');
                            it('should not run()', () => observed += 'skipped-');
                        });
                    }, { reporting: { reporters: [] }});

                    expect(observed).to.eq('ran-');
                });
                it('only runs .only() tests across nested suites', async () => {
                    let observed = '';
                    let theTest = await suite(describe => {

                        suite(describe => {
                            describe('A subject', it => {
                                it('should not run()', () => observed += 's1-1:');
                                it.only('should run()', () => observed += 's1-2:');
                                it('should not run()', () => observed += 's1-3:');
                            });
                        });

                        suite(describe => {
                            describe('A subject', it => {
                                it('should not run()', () => observed += 's2-1:');
                                it('should not run()', () => observed += 's2-2:');
                                it('should not run()', () => observed += 's2-3:');
                            });
                        });

                    }, { reporting: { reporters: [] }});

                    expect(observed).to.eq('s1-2:');
                });
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
            it('should be able to skip a test function', async () => {
                let ran = false;
                let test = new Test('test', () => {
                    ran = true;
                }, { skip: true });

                let results = await test.run(null, "This Test!");
                expect(ran).to.eq(false);

                expect(results.passed).to.eq('skip');
                expect(results.message).to.contain('Skipped');
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
            it('should detect a zoned exception and return a failure result', async () => {
                let success = false;
                let test = new Test('test', () => {
                    setTimeout(() => {
                        throw new Error('this!');
                    }, 10);
                });

                let result = await test.run(null, "This Test!");
                expect(result.passed).to.eq(false);
            });
            it('should detect an async exception and return a failure result', async () => {
                let success = false;
                let test = new Test('test', async () => {
                    await delay(1);
                    throw new Error('this!');
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
            it('should not inhibit return value from tasks', async () => {
                
                let value = 5;
                let echoedValue = null;
                let promise = Promise.resolve(3).then(n => Promise.resolve(n + 2));
                
                promise.then(v => echoedValue = v);

                setTimeout(() => {
                    if (value !== echoedValue)
                        throw new Error('Zone inhibited return value of task');
                }, 10);

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
                    }, 60);
                });

                let result = await test.run(new TestExecutionSettings({ timeout: 30 }), "Timeout-Failure-Test");

                expect(result.passed, 'the example test should fail')
                    .to.be.false;

                expect(result.duration).to.be.lessThan(50);

                expect(result.message, 'the failure message should mention a timeout')
                    .to.contain('Timed out');

            });
            it('should not produce a timeout failure when test completes promptly, even if a timeout limit is set', async () => {
                let success = false;
                let date = new Date();
                let test = new Test('test', () => {
                    setTimeout(() => {
                    }, 30);
                });

                let result = await test.run(new TestExecutionSettings({ timeout: 1000 }), "This Test!");

                expect(result.passed, 'the example test should pass')
                    .to.be.true;
                
                expect(result.message || '', 'the message should not be empty')
                    .to.not.be.empty;
            });
            if (0) it('should detect errors in observables', async () => {
                let success = false;
                let date = new Date();
                let test = new Test('test', () => {
                    of(1,2,3).pipe(map(v => {
                        throw new Error('This is an error!')
                    })).pipe(catchError(e => {
                        throw e
                    }));
                });

                let result = await test.run(new TestExecutionSettings({ timeout: 1000 }), "This Test!");

                expect(result.passed, 'the example test should fail')
                    .to.be.false;
            });
        });
    });
}

export async function main() {
    try {
        await runSanityTests();
        let results = await runTests();
        if (!results.passed) {
            console.error(`Error: Some tests failed!`);
            process.exit(1);
        } else {
            console.error(`All tests pass!`);
        }
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

main();