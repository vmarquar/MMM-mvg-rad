Module.register("MMM-mvg-rad", {
    defaults: {
      MAX_ITEMS: 5,
      refresh_rate : 3*60*1000, //milliseconds
      stationName: "Pickelstr. 2, München",
      center: [11.534383, 48.168992],
      radius: 1000,
      bearingCorrection: 0, // 0 is north, you can enter a correction to adapt the direction arrows from your mirror's "point of view"
      returnType: "return_geojson", // "return_table"
      mapboxAPI: "",
    },
    start: function (){
      this.bike_table_data = []
      const CONFIG = {}
      CONFIG.radius = this.config.radius
      CONFIG.center = this.config.center
      CONFIG.returnType = this.config.returnType
      this.sendSocketNotification("GET_BIKE_DATA", CONFIG)
      this.updateDom()

    },
    getStyles: function () {
      return ["MMM-mvg-rad.css",
        "font-awesome.css",
        'https://api.tiles.mapbox.com/mapbox-gl-js/v0.49.0/mapbox-gl.css',
        'https://api.tiles.mapbox.com/mapbox-gl-js/v0.49.0/mapbox-gl.js'
      ];
  },
    
    getDom: function() {

      var wrapper = document.createElement("div");
      var header = document.createElement("header");
      if (this.config.stationName !== "nextbike") {
        header.innerHTML = this.config.stationName;
      } else {
        header.innerHTML = this.config.stationName;
      }
      wrapper.appendChild(header);
      // var subElement = document.createElement("p")
      // subElement.innerHTML = this.bike_table_data
      // subElement.id = "bike_table_data"
      // wrapper.appendChild(subElement)
      var table = document.createElement("table");
			table.classList.add("small", "table");
			table.border='0';
			table.appendChild(this.createSpacerRow());
			table.appendChild(this.createAmountRow());
      table.appendChild(this.createSpacerRow());
      
      if(this.config.renderTable){
        if (this.bike_table_data.length > 0){

          if (this.config.MAX_ITEMS >= this.bike_table_data.length){
            for (let index = 0; index < this.bike_table_data.length; index++) {
              const bike_obj = this.bike_table_data[index];
              table.appendChild(this.createDataRow(bike_obj))
            }
          } else {
            for (let index = 0; index < this.config.MAX_ITEMS; index++) {
              const bike_obj = this.bike_table_data[index];
              table.appendChild(this.createDataRow(bike_obj))
            }
          }
        }
        wrapper.appendChild(table)

      } else if (this.bike_table_data) {
        console.log(this.bike_table_data)
        var map_element = this.createMapRow(JSON.stringify(this.bike_table_data))
        wrapper.appendChild(map_element)
      }
      
      return wrapper
      // Loading data notification
    },
    
    // notificationReceived: function(notification, payload, sender) {
    //   switch(notification) {
    //     case "DOM_OBJECTS_CREATED":
    //       var timer = setInterval(()=>{
    //         this.sendSocketNotification("GET_BIKE_DATA", this.config.MAX_ITEMS)
    //         this.updateDom()
    //       }, this.config.refresh_rate)
    //       break
        
    //   }
    // },
    
    socketNotificationReceived: function (notification, payload) {
        switch (notification) {
          case "BIKE_DATA_FETCHED":
            this.bike_table_data = payload
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
        if (this.config.MAX_ITEMS >= this.bike_table_data.length){
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
      //var bike_icon = document.createElement("img");
      //bike_icon.src = "/Users/Valentin/Desktop/MagicMirror/modules/MMM-mvg-rad/static/bicycle-solid.svg"
      //symbol.appendChild(bike_icon)
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
      bikeDist.innerHTML = String(Math.round(bike_obj.distance))+' m'
      row.appendChild(bikeDist);

      // Distance to bike from center point
      // TODO add a small north arrow indicating the right direction
      // var bikeBearing = document.createElement("td");
      // bikeBearing.className = "bikeNo";
      // bikeBearing.setAttribute("width", "60px")
      // bikeBearing.innerHTML = String(bike_obj.bearing.toFixed(2))
      // row.appendChild(bikeBearing);

      var symbol_arrow = document.createElement("td");
      //var bike_icon = document.createElement("img");
      //bike_icon.src = "/Users/Valentin/Desktop/MagicMirror/modules/MMM-mvg-rad/static/bicycle-solid.svg"
      //symbol_arrow.appendChild(bike_icon)
      symbol_arrow.setAttribute("width", "12px");
      symbol_arrow.className = "fa fa-location-arrow";
      var bearing_int = Math.round(bike_obj.bearing)
      symbol_arrow.setAttribute('style', symbol_arrow.getAttribute('style')+'; transform: rotate('+String(bearing_int-45+this.config.bearingCorrection)+'deg)')
      row.appendChild(symbol_arrow);


      return row;
    },
    createMapRow: function (geojson) {
      var map_elem = document.createElement("div")
      map_elem.id = "map"
      // wrapper.appendChild(map_elem)
      mapboxgl.accessToken = this.config.mapboxAPI
      const map = new mapboxgl.Map({
        container: map_elem,
        style: 'mapbox://styles/vmarquar/cjpvjy8c608002spanpruhmm2',
        center: [11.534324, 48.169533],
        zoom: 16.41
      });

      map.on('load', function() {
        // map.loadImage('./assets/custom-marker.png', (error, image) => {
        //     if (error) throw error;
        //     this.map.addImage('customMarker', image);

        // --- AOI Projekte ---
        map.addSource('bikes', {
          type: 'geojson',
          data: geojson
        });
        map.addLayer({
          "id": 'bikes_id',
          'type': 'fill',
          'source': "bikes",
          'paint': {
            'fill-color': 'hsla(196, 74%, 65%, 0.3)',
            'fill-outline-color': 'hsl(209, 92%, 57%)',
          },
          'layout': {
            "visibility": 'visible'
          }
        });
        // }
      })

      return(map_elem)
    }

  })