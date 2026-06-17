/**
 * perfHooks - BeforeStep / AfterStep timing for @performance scenarios.
 * Activates only when the scenario carries the @performance tag, so it
 * does not add overhead to normal flow runs. Aggregation/reporting math
 * lives in support/perfHookUtils.ts.
 */

import { BeforeStep, AfterStep, ITestStepHookParameter } from '@cucumber/cucumber';
import { recordStepTiming, startStepTimer } from '../support/perfHookUtils';

const PERF_TAG = '@performance';

BeforeStep({ tags: PERF_TAG }, function (param: ITestStepHookParameter) {
  startStepTimer(param);
});

AfterStep({ tags: PERF_TAG }, function (param: ITestStepHookParameter) {
  recordStepTiming(param);
});
