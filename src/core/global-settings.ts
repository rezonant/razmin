import { SuiteSettings } from "./suite-settings";

declare var __razminGlobalSuiteSettings : SuiteSettings;

export function globalSuiteSettings() : SuiteSettings {
    return __razminGlobalSuiteSettings;
}