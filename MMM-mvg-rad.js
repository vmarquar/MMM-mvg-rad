Module.register("MMM-mvg-rad", {
  defaults: {
    MAX_ITEMS: 5,
    refresh_rate: 3 * 60 * 1000, //milliseconds
    stationName: "",
    center: [11.53468800, 48.16904000],
    radius: 200,
    bearingCorrection: 0, // 0 is north, you can enter a correction to adapt the direction arrows from your mirror's "point of view"
    returnType: "return_geojson", //"return_geojson", // "return_table"
    mapboxAPI: "",
    mapboxStyle: 'mapbox://styles/mapbox/dark-v9',
    text_color: "#FFFFFF"
  },
  start: function () {

    this.bike_table_data = []
    this._map = null
    if (this.config.returnType == "return_table") {
      this.renderTable = true
    } else {
      this.renderTable = false
      this.map_element = this.createMapRow()
    }
    const CONFIG = {}
    CONFIG.radius = this.config.radius
    CONFIG.center = this.config.center
    CONFIG.returnType = this.config.returnType
    this.sendSocketNotification("GET_BIKE_DATA", CONFIG)

  },
  getStyles: function () {
    return ['MMM-mvg-rad.css',
      'font-awesome.css',
      'mapbox-gl-v_0-52-0.css',
      'mapbox-gl-v_0-52-0.js'
    ];
  },

  getDom: function () {

    var wrapper = document.createElement("div");
    var header = document.createElement("header");
    if (this.config.stationName !== "MVG Rad") {
      header.innerHTML = this.config.stationName;
    } else {
      header.innerHTML = this.config.stationName;
    }
    wrapper.appendChild(header);
    var table = document.createElement("table");
    table.classList.add("small", "table");
    table.border = '0';
    table.appendChild(this.createSpacerRow());
    table.appendChild(this.createAmountRow());
    table.appendChild(this.createSpacerRow());

    // Table Version
    if (this.renderTable) {
      if (this.bike_table_data.length > 0) {

        // List all bikes (MAX ITEMS is larger than the number of bikes)
        if (this.config.MAX_ITEMS >= this.bike_table_data.length) {
          for (let index = 0; index < this.bike_table_data.length; index++) {
            const bike_obj = this.bike_table_data[index];
            table.appendChild(this.createDataRow(bike_obj))
          }
          // List only the neareast bikes until MAX ITEMS is reached
        } else {
          for (let index = 0; index < this.config.MAX_ITEMS; index++) {
            const bike_obj = this.bike_table_data[index];
            table.appendChild(this.createDataRow(bike_obj))
          }
        }
      }
      wrapper.appendChild(table)

      // Map Version
    } else if (!this.renderTable) {
      console.log(this.bike_table_data)
      wrapper.appendChild(this.map_element)
    }

    return wrapper
  },

  socketNotificationReceived: function (notification, payload) {
    switch (notification) {
      case "BIKE_DATA_FETCHED":
        // add geojson or table data to variable
        this.bike_table_data = payload

        // add bikes to map
        if (!this.renderTable) {
          this.addBikesToMap(this.bike_table_data)
        }
        this.updateDom()
        break
    }
  },

  createSpacerRow: function () {
    var spacerRow = document.createElement("tr");

    var spacerHeader = document.createElement("td");
    spacerHeader.className = "spacerRow";
    spacerHeader.setAttribute("colSpan", "2");
    spacerHeader.innerHTML = "";
    spacerRow.appendChild(spacerHeader);

    return spacerRow;
  },

  createAmountRow: function () {
    var amountRow = document.createElement("tr");

    var amount = document.createElement("td");
    amount.className = "amountRow";
    amount.setAttribute("colSpan", "42");
    if (!this.bike_table_data || (this.bike_table_data.length) < 1) {
      amount.innerHTML = "Keine Fahrräder verfügbar!";
    } else {
      if (this.config.MAX_ITEMS >= this.bike_table_data.length) {
        amount.innerHTML = "Fahrräder verfügbar:" + " " + (this.bike_table_data.length)
      } else {
        amount.innerHTML = "Fahrräder verfügbar:" + " +" + (this.config.MAX_ITEMS)
      }
    }
    amountRow.appendChild(amount)

    return amountRow;
  },
  createDataRow: function (bike_obj) {
    var row = document.createElement("tr");

    // Bike icon
    var symbol = document.createElement("td");
    symbol.setAttribute("width", "12px");
    symbol.className = "fa fa-bicycle";
    row.appendChild(symbol);

    // Bike Name / Number
    var bikeNo = document.createElement("td");
    bikeNo.className = "bikeNo";
    bikeNo.setAttribute("width", "60px")
    bikeNo.innerHTML = bike_obj.bikeNumber
    row.appendChild(bikeNo);

    // Distance to bike from center point
    var bikeDist = document.createElement("td");
    bikeDist.className = "bikeNo";
    bikeDist.setAttribute("width", "40px")
    bikeDist.innerHTML = String(Math.round(bike_obj.distance)) + ' m'
    row.appendChild(bikeDist);

    var symbol_arrow = document.createElement("td");
    symbol_arrow.setAttribute("width", "12px");
    symbol_arrow.className = "fa fa-location-arrow";
    var bearing_int = Math.round(bike_obj.bearing)
    symbol_arrow.setAttribute('style', symbol_arrow.getAttribute('style') + '; transform: rotate(' + String(bearing_int - 45 + this.config.bearingCorrection) + 'deg)')
    row.appendChild(symbol_arrow);


    return row;
  },
  createMapRow: function () {

    var map_elem = document.createElement("div")
    map_elem.id = "map"
    // wrapper.appendChild(map_elem)
    mapboxgl.accessToken = this.config.mapboxAPI
    this._map = new mapboxgl.Map({
      container: map_elem,
      style: this.config.mapboxStyle,
      center: this.config.center,
      zoom: 14.00
    });


    var _this = this
    _this._map.on('style.load', function () {
      _this._map.addSource('center_source', {
        type: 'geojson',
        data: {
          "type": "Point",
          "coordinates": _this.config.center
        }
      });

      _this._map.addLayer({
        "id": "point",
        "source": "center_source",
        "type": "circle",
        "paint": {
          "circle-radius": 4,
          "circle-color": "#007cbf"
        }
      });
    })

    return (map_elem)
  },
  addBikesToMap: function (geojson) {
    var _this = this

    if (_this._map.getSource('bikes_source') == null) {

      _this._map.on('load', function () {

        console.log("GEOJSON IST:")
        console.log(geojson)
        _this._map.addSource('bikes_source', {
          type: 'geojson',
          cluster: true,
          clusterMaxZoom: 16, // Max zoom to cluster points on
          clusterRadius: 15, // Radius of each cluster when clustering points (defaults to 50)
          data: geojson
        });

        _this._map.addLayer({
          id: "bikes-count",
          type: "symbol",
          source: "bikes_source",
          filter: ["has", "point_count"],
          layout: {
            "icon-image": "bicycle-15",
            "text-field": "{point_count_abbreviated}+",
            "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
            "text-offset": [0.9, 0],
            "text-anchor": "left",
            "text-size": 10,
            "text-allow-overlap": true,
            "icon-allow-overlap": true,
          },
          "paint": {
            "text-color": _this.config.text_color
          }
        });

        _this._map.addLayer({
          "id": "bikes",
          "type": "symbol",
          "source": "bikes_source",
          "filter": ["!", ["has", "point_count"]],
          "layout": {
            "icon-image": "bicycle-15",
            "text-field": "{bikeNumber}",
            "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
            "text-offset": [0.9, 0],
            "text-anchor": "left",
            "text-size": 11,
            "text-allow-overlap": true,
            "icon-allow-overlap": true,
          },
          "paint": {
            "text-color": _this.config.text_color
          }
        });

        console.log("MMM-mvg-rad: ADDED GEOJSON SOURCE")
        _this._map.resize()
        var bounds = new mapboxgl.LngLatBounds()
        geojson.features.forEach(function (feature) {
          bounds.extend(feature.geometry.coordinates)
        })
        bounds.extend(_this.config.center)
        _this._map.fitBounds(bounds, {
          padding: 45
        })
      })

    } else if (_this._map.getSource('bikes_source') != null) {
      _this._map.getSource("bikes_source").setData(geojson)
      _this._map.resize();
      var bounds = new mapboxgl.LngLatBounds()
      geojson.features.forEach(function (feature) {
        bounds.extend(feature.geometry.coordinates)
      })
      bounds.extend(_this.config.center)
      _this._map.fitBounds(bounds, {
        padding: 45
      })
      console.log("MMM-mvg-rad: UPDATED GEOJSON SOURCE")
    }
  }
})