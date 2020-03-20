var async = require("async");

var jsonFile = require('jsonfile');
var paramFile = './water-data/input/dataWaterParameters.json';
var locationsToCheckFile = './water-data/input/dataWaterAtLocations-flint.geo.json';
var locationsUpdatedFile = './water-data/output/dataWaterAtLocationsWithRecos-flint.geo.json';

// var locationsToCheckFile = './water-data/dataWaterAtLocations.json'; 

var fs = require("fs");

var pollutantsList = [];
var locationsToCheck = [];

// ----------------------------------------------
function readObjFromFile(file) {

        var content = "";

        // return jsonfile.readFileSync(file);

        try {
                content = jsonFile.readFileSync(file);
                return content;
        } catch (err) {
                // If the type is not what you want, then just throw the error again.
                if (err.code !== 'ENOENT') throw err;

                // Handle a file-not-found error
                console.log("ERROR: file not found - " + file);
                return content;
        }

}

// ----------------------------------------------
function readPollutants() {
        fs.readFile(paramFile, function (err, data) {
                if (err) {
                        console.log(err.stack);
                        return [];
                }

                return data;
                // console.log(data.toString());
        });
}

// ----------------------------------------------
// Load list of regulations for all parameters. Master list
// on github.
function loadRegulationPollutants() {

        pollutantsList = readObjFromFile(paramFile);

        // console.log("pollutants read = " + JSON.stringify(pollutantsList));
        for (var count = 0; count < pollutantsList.length; count++) {
                // console.log(JSON.stringify(pollutantsList[count]));
        }

        return pollutantsList.length;
}

// ----------------------------------------------
// Find subset of of regulations to use based on parameter name
// Its filtering has to be done by the caller
function findParamRegulationSubsetToUse(paramName) {

        var regsList = [];

        //console.log("pollutants read = " + JSON.stringify(pollutantsList));
        for (var count = 0; count < pollutantsList.length; count++) {
                if (pollutantsList[count].name.toUpperCase() == paramName.toUpperCase()) {

                        regsList.push(pollutantsList[count]);
                }
        }

        return regsList;

}

// // ----------------------------------------------
// // Find subset of of regulations to use for the given parameter and region
// function findParamRegulationSubsetToUse(paramName, geoLimit) {

//         var regsList = [];
//         // Keep list of regs which match name but not geoLimit
//         var candidateMatches = [];

//         //console.log("pollutants read = " + JSON.stringify(pollutantsList));
//         for (var count = 0; count < pollutantsList.length; count++) {
//                 if (pollutantsList[count].name.toUpperCase() == paramName.toUpperCase()) {

//                         if (pollutantsList[count].geoLimit.toUpperCase() == geoLimit.toUpperCase()) {
//                                 regsList.push(pollutantsList[count]);
//                         } else {
//                                 candidateMatches.push(pollutantsList[count]);
//                         }
//                         // console.log(JSON.stringify(pollutantsList[count]));
//                 }
//         }

//         // Found exact match. Use it
//         if (regsList.length > 0)
//                 return regsList;

//         // Now decide  to find the closest region whose regulation should be used
//         console.log("\n\t<<candidate matches = " + JSON.stringify(candidateMatches) + ">>");
//         return candidateMatches;

// }


// ----------------------------------------------
// Find subset of of regulations to use for the given parameter and region
function decidePermissibility(locationData, regulationToCheckAgainst, purpose) {

        var decision = {};
        var explanationPrefix = ""; // Anything we want to say about regulation used.
        decision.lastUpdate = new Date();
        decision.purpose = purpose;
        decision.regulationUsed = regulationToCheckAgainst;

        if (regulationToCheckAgainst.purpose != undefined) {
                if (purpose != regulationToCheckAgainst.purpose)
                        explanationPrefix = "[Caution: Purpose is mismatched. Verify interpretation.] ";
        }



        // Nothing to do if either is undefined
        if (locationData == undefined || regulationToCheckAgainst == undefined) {
                decision.reco = "No";
                decision.reason = "Data or parameter regulation is undefined.";
                return decision;
                // return false;
        }

        // Decide based on parameter type
        if (regulationToCheckAgainst.type == "lowAccept") {
                if (locationData <= regulationToCheckAgainst.max_limit) {
                        decision.reco = "Yes";
                        decision.reason =
                                explanationPrefix +
                                "Data lower than maximum limit of lowAccept-type parameter";
                        return decision;
                        // return true;
                }
                else {
                        decision.reco = "No";
                        decision.reason =
                                explanationPrefix +
                                "Data higher than maximum limit of lowAccept-type parameter";
                        return decision;
                        // return false;
                }
        }

        if (regulationToCheckAgainst.type == "highAccept") {
                if (locationData >= regulationToCheckAgainst.min_limit) {
                        decision.reco = "Yes";
                        decision.reason =
                                explanationPrefix +
                                "Data higher than minimum limit of highAccept-type parameter";
                        return decision;
                        // return true;
                }
                else {
                        decision.reco = "No";
                        decision.reason =
                                explanationPrefix +
                                "Data lower than minimum limit of highAccept-type parameter";
                        return decision;
                        // return false;
                }
        }

        if (regulationToCheckAgainst.type == "accept_range") {
                if (locationData >= regulationToCheckAgainst.min_limit && locationData <= regulationToCheckAgainst.max_limit) {
                        decision.reco = "Yes";
                        decision.reason =
                                explanationPrefix +
                                "Data within minimum and maximum limits  of accept_range parameter";
                        return decision;
                        // return true;
                }
                else {
                        decision.reco = "No";
                        decision.reason =
                                explanationPrefix +
                                "Data outside of range for accept_range-type parameter";
                        return decision;
                        // return false;
                }
        }

        // If none of the above, nothing to check

        decision.reco = "Yes";
        decision.reason = "Data not limited by any limits";
        return decision;
        // return true;

}

// ----------------------------------------------
function loadLocationsToCheck() {

        var featuresObj = readObjFromFile(locationsToCheckFile);

        locationsToCheck = featuresObj.features;
        for (var count = 0; count < locationsToCheck.length; count++) {
                // console.log(JSON.stringify(locationsToCheck[count]));
        }

        return locationsToCheck.length;
}

// ----------------------------------------------
// ----------------------------------------------

// ** ATTEMPT 1: Standard coding

// ------ Read pollutants data -----
var paramsCount = loadRegulationPollutants();
//console.log("Data = " + readPollutants().toString());
console.log("** Read params = " + paramsCount);

// ------ Read location data -----
var locationsCount = loadLocationsToCheck();
console.log("** Read locations = " + locationsCount);

// Decide what we are recommending for
var purposes = ["drinking", "bathing", "acquatic"];
// var purpose = "bathing";

var geo = "US:MI";

var restrictFlag = false;
var restrictSize = 100;

// The output object with recos
var outputObject = {};
outputObject.type = "FeatureCollection";

// Process on location one by one
for (var iter = 0; iter < locationsToCheck.length; iter++) {
        var location = locationsToCheck[iter];

        // Some way to restrict large outputs
        if (restrictFlag) {
                // Restrict to first 100
                if (iter >= restrictSize)
                        break;
        }

        var reco = [];
        var overallRecommendation = "Yes";

        for (var iter2 = 0; iter2 < purposes.length; iter2++) {

                var purpose = purposes[iter2];

                // Find closest regulation to use for this location for all pollutants
                for (var i = 0; i < location.properties.pollutants.length; i++) {
                        var param = location.properties.pollutants[i].name;

                        var regsToUse = findParamRegulationSubsetToUse(location.properties.pollutants[i].name);

                        // Decide which regulation will be used
                        var regSingle;
                        if (regsToUse.length == 0)
                                return; // nothing to do
                        if (regsToUse.length == 1)
                                regSingle = regsToUse[0]; // take the only one available
                        else {
                                var best = -1;
                                for (var j = 0; j < regsToUse.length; j++) {

                                        var str1 = regsToUse[j].geoLimit.toUpperCase();
                                        var str2 = geo.toUpperCase();

                                        var m1 = str1.indexOf(str2);
                                        var m2 = str2.indexOf(str1);

                                        var geoMatch = ((m1 != -1) || (m2 != -1));

                                        // console.log("geo match = " + geoMatch);

                                        // If both purpose and geo match; nothing more to do
                                        if ((purpose.toUpperCase() == regsToUse[j].purpose.toUpperCase()) &&
                                                geoMatch) {
                                                best = j;
                                                break;
                                        }
                                        // If purpose matches, take it for now
                                        else if (purpose.toUpperCase() == regsToUse[j].purpose.toUpperCase()) {
                                                best = j;
                                        }
                                        // If nothing else matches, take anything with geo match
                                        else if ((best < 0) && geoMatch) {
                                                best = j;
                                        }
                                }
                                // If nothing matches, pick the first one. Else, we will get array error.
                                if (best < 0)
                                        best = 0;

                                // Now make the best selection
                                regSingle = regsToUse[best];
                        }

                        // console.log("Regulation that will be used  = " + JSON.stringify(regToUse));

                        // Find recommendation
                        var decision = decidePermissibility(location.properties.pollutants[i].value_250ml, regSingle, purpose);
                        decision.geoLimit = geo;
                        decision.relevantRegulationsSet = regsToUse;
                        reco.push(decision);
                        // Update overallRecommendation
                        if (decision.reco == "No")
                                overallRecommendation = "No";
                        console.log("\n\n** Decision for location: \n\n\t " + JSON.stringify(location) + "\n\n\t by purpose : " + purpose + "\n\n\t " + "\n\n\t with regulation : \n\n\t " + JSON.stringify(regSingle) + "\n\n\t is =  \n\n\t " + JSON.stringify(decision));
                }
        }

        location.properties.overallRecommendation = overallRecommendation;
        location.properties.recommendations = reco;
        // console.log("\n** RECO for location: \n\n\t " + JSON.stringify(location) + "\n\t is : \n\n\t " + JSON.stringify(reco));

}

outputObject.features = locationsToCheck;
jsonFile.writeFileSync(locationsUpdatedFile, outputObject);
// console.log("\n** RECO for location: \n\n\t " + JSON.stringify(location) + "\n\t is : \n\n\t " + JSON.stringify(reco));



// ----------------------------------------------
// ----------------------------------------------

// ** ATTEMPT 2: Trying to serialize 

// var paramsCount;
// var locationsCount;
// var location;
// var regToUse;

// async.series(
//         [
//                 function (callback) {
//                         // ------ Read pollutants data -----
//                         console.log("Pollutants data and locations loaded.");
//                         paramsCount = loadRegulationPollutants();
//                         // ------ Read location data -----
//                         locationsCount = loadLocationsToCheck();

//                         callback(null, locationsToCheck, pollutantsList);
//                 },
//                 function (callback) {
//                         console.log("Regulation for location selected");
//                         // Select first location
//                         location = this.locationsToCheck[0];
//                         console.log("Location to check  = " + JSON.stringify(location));
//                         // Find closest regulation to use for this location
//                         regToUse = findParamRegulationSubsetToUse(location.properties.pollutantsList[0].name, "Fishing");

//                         callback(null, locationsToCheck, pollutantsList, regToUse);
//                 },
//                 function (callback) {
//                         console.log("Regulation that will be used  = " + JSON.stringify(this.regToUse));
//                         callback(null, null);
//                 },
//                 function (callback) {
//                         console.log("4th line<br />");
//                         callback(null, null);
//                 }
//         ],
//         function (err, results) {
//                 console.log("All done")
//         }
// );

// ----------------------------------------------
// ----------------------------------------------

console.log("Program Ended");
