const fs = require("fs");

function search(obj, key, value, results) {
    if (obj.hasOwnProperty(key) && obj[key] === value) {
        results.push(obj);
    } else {
        for (const [k, v] of Object.entries(obj)) {
            if (typeof v === "object") {
                search(v, key, value, results);
            }
        }
    }
}

function pickleToAstNode(pickles, pickleId) {
    //let tc = pickles.reduce([], p, n => p.push(...p.steps)); find(p => p.id === pickleId);
    let pickle = pickles.reduce((p, n) => p.concat(n.steps), []).find(pickle => pickle.id === pickleId);
    return pickle.astNodeIds;
}

function astNodeIdToLines(atsNodeId, gherkinDocument) {
    let results = [];
    search(gherkinDocument, 'id', atsNodeId, results);
    return results.map(r => r.location);
}

function isTestCasePassed(testCaseId, testCaseSteps) {
    let find = testCaseSteps
        .filter(t => t.testCaseStartedId === testCaseId)
        .find(t => t.testStepResult.status !== "PASSED");
    return !find;
}

module.exports = function (registry) {
    registry.preprocessor(function () {
        const self = this
        self.process(function (doc, reader) {
            const fileLines = fs.readFileSync('messages.ndjson').toString('utf-8').split("\n");
            const ndjsonObjects = [];

            for (const line of fileLines) {
                if (line) {
                    ndjsonObjects.push(JSON.parse(line));
                }
            }

            let steps = [];
            let testSteps = [];
            let testCases = [];
            let pickles = [];
            let finishedTestCases = [];
            let startedTestCases = [];
            let finishedSteps = [];
            let gherkinDocument;

            for (let obj of ndjsonObjects) {
                if (obj.pickle) {
                    pickles.push(obj.pickle);
                }
                if (obj.stepDefinition) {
                    steps.push(obj.stepDefinition);
                }
                if (obj.testCase) {
                    testSteps.push(...obj.testCase.testSteps.filter(testStep => testStep.pickleStepId));
                    testCases.push(obj.testCase)
                }
                if (obj.testCaseFinished) {
                    finishedTestCases.push(obj.testCaseFinished);
                }
                if (obj.testCaseStarted) {
                    startedTestCases.push(obj.testCaseStarted);
                }
                if (obj.testStepFinished) {
                    finishedSteps.push(obj.testStepFinished);
                }
                if (obj.gherkinDocument) {
                    gherkinDocument = obj.gherkinDocument;
                }
            }

            for (let obj of finishedTestCases) {
                let finishedTestCase = obj;
                let startedTestCase = startedTestCases.find(testCase => testCase.id === finishedTestCase.testCaseStartedId);
                let testCase = testCases.find(testCase => testCase.id === startedTestCase.testCaseId);
                let pickle = pickles.find(pickle => testCase.pickleId === pickle.id);

                let status = isTestCasePassed(finishedTestCase.testCaseStartedId, finishedSteps);

                if (pickle) {
                    let astNodeIds = pickle.astNodeIds;
                    let nodeLines = astNodeIdToLines(astNodeIds[astNodeIds.length - 1], gherkinDocument);

                    console.log(`Found pickle "${pickle.name}" at ${nodeLines[0]?.line} with status ${status}`)

                    reader.lines[reader.lines.length +1 - nodeLines[0]?.line] += status ? ' **OK** ' : ' ** FAILED ** ';
                }
            }

            return reader;
        })
    })
};
