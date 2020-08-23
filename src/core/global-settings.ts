import { SuiteSettings } from "./suite-settings";
import { TestSuite } from "../suite";

declare var __razminGlobalSuiteSettings : SuiteSettings;

export function globalSuiteSettings() : SuiteSettings {
    if (typeof __razminGlobalSuiteSettings !== 'undefined')
        return __razminGlobalSuiteSettings;
    return null;
}

function global(): Record<string,any> {
    if (typeof globalThis !== 'undefined')
        return globalThis;
    if (typeof window !== 'undefined')
        return window;
    if (typeof global !== 'undefined')
        return global;

    return {};
}

export function setGlobalSuite(suite : TestSuite) {
    return global().__razminSuite = suite;
}