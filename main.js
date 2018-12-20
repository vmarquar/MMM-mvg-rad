// API get from https://multimobil-core.mvg.de/service/v5/networkState/networkState?MVG_RAD=1
// on 2018-12-19 at about 18:49
// additional info: https://transit.robbi5.com/mvg-networkstate-mvgrad/
// {
//     "type": "Point",
//     "coordinates": [
//         -105.01621,
//         39.57422
//     ]
// }

const fs = require('fs')
const turf = require('@turf/turf')
const MAX_ITEMS = 5

/// Function Definitions
function convertRawToGeojsonFeature(input_obj, geojson_featureCollection) {

    var geojson_feature = {
        "type": "Feature",
        "properties": {
            "id":input_obj.id,
            "created":input_obj.created,
            "updated":input_obj.updated,
            "bikeNumber":input_obj.bikeNumber,
            "latitude":input_obj.latitude,
            "longitude":input_obj.longitude,
            "currentStationID":input_obj.currentStationID,
            "bikeState":input_obj.bikeState,
            "bikeType":input_obj.bikeType,
            "positionType":input_obj.positionType,
            "localized":input_obj.localized,
            "district":input_obj.district
        },
        "geometry": {
            "type": "Point",
            "coordinates": [
                input_obj.longitude,
                input_obj.latitude
            ]
        }
    }

    geojson_featureCollection.features.push(geojson_feature)
    return(geojson_featureCollection)
}


//// GET real json data from internet:
// var request = require("request")

// var url = "https://multimobil-core.mvg.de/service/v5/networkState/networkState?MVG_RAD=1"

// request({
//     url: url,
//     json: true
// }, function (error, response, body) {

//     if (!error && response.statusCode === 200) {
//         console.log(body) // Print the json response
//     }
// })

//// MAIN Function
const fileContents = fs.readFileSync('./APICall2018-12-19-18-52.json', 'utf8')
try {
    const mvg_rad_raw_data = JSON.parse(fileContents)
    
    var geojson_featureCollection = {
        "type": "FeatureCollection",
        "features": []
    }
    var all_bikes = mvg_rad_raw_data.addedBikes

    for (let index = 0; index < all_bikes.length; index++) {
        const input_obj = all_bikes[index];
        geojson_featureCollection =  convertRawToGeojsonFeature(input_obj, geojson_featureCollection)
    }
    var center = turf.point([11.534383,48.168992])
    var bounding_polygon = turf.polygon([
        [
            [11.528886544276745, 48.172082151900256],
            [11.529031651398498, 48.164618121814676],
            [11.544884604450031, 48.164545532720425],
            [11.544413006304334, 48.172118441126962],
            [11.528886544276745, 48.172082151900256]
        ]
    ]);

    var fc = turf.featureCollection(geojson_featureCollection.features)


    var ptsWithin = turf.pointsWithinPolygon(fc, bounding_polygon);
    //fs.writeFile('./mvg_rad_geojson.json', JSON.stringify(geojson_featureCollection, null, 2) , 'utf-8');

    var options = {units: 'kilometers'};
    ptsWithin.features.forEach(feature => {

        var distance = turf.distance(center, feature.geometry, options)*1000 //meters
        var bearing = turf.bearing(center, feature.geometry);
        feature.properties.distance = distance
        feature.properties.bearing = bearing
    });

    //ptsWithin.features.sort((a, b) => a.properties.distance.localeCompare(b.properties.distance));
    ptsWithin.features.sort(function(a, b){
        return a.properties.distance == b.properties.distance ? 0 : +(a.properties.distance > b.properties.distance) || -1;
      });

    for (let index = 0; index < MAX_ITEMS; index++) {
        const feature = ptsWithin.features[index];
        console.log(`Fahrrad: ${feature.properties.bikeNumber} Entfernung: ${feature.properties.distance} m Richtung: ${feature.properties.bearing}°`) // output in meter
        
    }

} catch(err) {
    console.error(err)
}


