import { SuiteSettings } from "./suite-settings";

declare var __razminGlobalSuiteSettings : SuiteSettings;

export function globalSuiteSettings() : SuiteSettings {
    if (typeof __razminGlobalSuiteSettings !== 'undefined')
        return __razminGlobalSuiteSettings;
    return null;
}