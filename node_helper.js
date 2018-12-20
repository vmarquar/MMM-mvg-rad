var NodeHelper = require("node_helper")
const fs = require('fs')
const turf = require('@turf/turf')
var request = require("request")

module.exports = NodeHelper.create({
    start: function () {
        this.countDown = 10000000
    },
    socketNotificationReceived: function (notification, payload) {
        switch (notification) {
            case "DO_YOUR_JOB":
                this.sendSocketNotification("I_DID", (this.countDown - payload))
                break
            case "GET_BIKE_DATA":
                (async() => {
                    var data = await this.fetchBikeData(payload)
                    this.sendSocketNotification("BIKE_DATA_FETCHED", data)
                    
                })()
                break
                // this.sendSocketNotification("BIKE_DATA_FETCHED", this.fetchBikeData(payload))
                
        }
    },
    fetchBikeData: async function (CONFIG) {
        console.log(`FetchBikeData Function will look around center ${CONFIG.center} at a circular distance of ${CONFIG.radius}.`)
        const RADIUS = CONFIG.radius // 200 m 
        const CENTER = CONFIG.center // [11.534383, 48.168992]
        const RETURN_TYPE = CONFIG.returnType // either "return_table" or "return_geosjon"
        /// Function Definitions
        // Download API Data
        var fetchMVGRadAPI = function (url) {
            return new Promise((resolve, reject) => {
                request({
                    url: url,
                    json: true
                }, (error, response, body) => {
                    if (error) reject(error);
                    if (response.statusCode != 200) {
                        reject('Invalid status code <' + response.statusCode + '>');
                    }
                    resolve(body);
                });
            });
        }
        // convert to geojson
        var convertRawToGeojsonFeature = function (input_obj, geojson_featureCollection) {
            
            var geojson_feature = {
                "type": "Feature",
                "properties": {
                    "id": input_obj.id,
                    "created": input_obj.created,
                    "updated": input_obj.updated,
                    "bikeNumber": input_obj.bikeNumber,
                    "latitude": input_obj.latitude,
                    "longitude": input_obj.longitude,
                    "currentStationID": input_obj.currentStationID,
                    "bikeState": input_obj.bikeState,
                    "bikeType": input_obj.bikeType,
                    "positionType": input_obj.positionType,
                    "localized": input_obj.localized,
                    "district": input_obj.district
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
            return (geojson_featureCollection)
        }

        //// MAIN Function
        async function fetchMVGandProcess(returnType = "return_table") {
            // returnType can be either "return_table" or "return_geojson"
            var url = "https://multimobil-core.mvg.de/service/v5/networkState/networkState?MVG_RAD=1"
            const mvg_rad_raw_data = await fetchMVGRadAPI(url)

            var geojson_featureCollection = {
                "type": "FeatureCollection",
                "features": []
            }
            var all_bikes = mvg_rad_raw_data.addedBikes

            for (let index = 0; index < all_bikes.length; index++) {
                const input_obj = all_bikes[index];
                geojson_featureCollection = convertRawToGeojsonFeature(input_obj, geojson_featureCollection)
            }
            var center = turf.point(CENTER)
            // var bounding_polygon = turf.polygon([
            //     [
            //         [11.528886544276745, 48.172082151900256],
            //         [11.529031651398498, 48.164618121814676],
            //         [11.544884604450031, 48.164545532720425],
            //         [11.544413006304334, 48.172118441126962],
            //         [11.528886544276745, 48.172082151900256]
            //     ]
            // ]);
            var radius = RADIUS/1000;
            var options = {steps: 30, units: 'kilometers', properties: {foo: 'bar'}};
            var circle = turf.circle(center, radius, options);

            var fc = turf.featureCollection(geojson_featureCollection.features)


            // var ptsWithin = turf.pointsWithinPolygon(fc, bounding_polygon); // rectangle bounding polyfon

            var ptsWithin = turf.pointsWithinPolygon(fc, circle);
            //fs.writeFile('./mvg_rad_geojson.json', JSON.stringify(geojson_featureCollection, null, 2) , 'utf-8');

            var options = {
                units: 'kilometers'
            };
            ptsWithin.features.forEach(feature => {

                var distance = turf.distance(center, feature.geometry, options) * 1000 //meters
                var bearing = turf.bearing(center, feature.geometry);
                feature.properties.distance = distance
                feature.properties.bearing = bearing
            });

            //ptsWithin.features.sort((a, b) => a.properties.distance.localeCompare(b.properties.distance));
            ptsWithin.features.sort(function (a, b) {
                return a.properties.distance == b.properties.distance ? 0 : +(a.properties.distance > b.properties.distance) || -1;
            });

            var near_bikes_table = []
            for (let index = 0; index < ptsWithin.features.length; index++) {
                const feature = ptsWithin.features[index];
                console.log(`Fahrrad: ${feature.properties.bikeNumber} Entfernung: ${feature.properties.distance} m Richtung: ${feature.properties.bearing}°`) // output in meter
                near_bikes_table.push({
                    "bikeNumber": feature.properties.bikeNumber,
                    "distance": feature.properties.distance,
                    "bearing": feature.properties.bearing
                })
            }
            if(returnType=="return_table"){
                return (near_bikes_table)
            } else if (returnType == "return_geojson"){
                return (ptsWithin)
            }
            

        }
    
        var near_bikes = await fetchMVGandProcess(RETURN_TYPE);
        console.log(near_bikes)
        return(near_bikes)

    }
})
